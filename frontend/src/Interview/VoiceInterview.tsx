import React, { useState, useRef, useCallback, useEffect } from 'react';
import { interviewApi } from './api';
import type { Interview, VoiceCallStatus } from './types';

interface VoiceInterviewProps {
  interview: Interview;
  sessionId: string;
  onEnd: (reportId: string) => void;
  onBack: () => void;
  voice?: string; // TTS 音色
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

/**
 * M-FE-09: 语音通话面试页面
 * 实现纯语音交互的面试，支持：
 * - 按住录音 / 点击开始/停止录音
 * - 实时字幕显示
 * - AI 语音回复播放
 * - 静音控制
 * - 通话时长计时
 */
const VoiceInterview: React.FC<VoiceInterviewProps> = ({
  interview,
  sessionId,
  onEnd,
  onBack,
  voice = 'anna',
}) => {
  const [callStatus, setCallStatus] = useState<VoiceCallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(24).fill(2));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const subtitlesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到最新字幕
  useEffect(() => {
    subtitlesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  // 开始通话计时
  const startCallTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // 清理资源
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (subtitleTimeoutRef.current) {
      clearTimeout(subtitleTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // 波形动画
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const bars = 24;
    const step = Math.floor(bufferLength / bars);
    const newWaveform = Array.from({ length: bars }, (_, i) => {
      const start = i * step;
      const end = Math.min(start + step, bufferLength);
      let sum = 0;
      for (let j = start; j < end; j++) sum += dataArray[j];
      return Math.min(100, Math.max(2, (sum / (end - start) / 255) * 100));
    });

    setWaveformData(newWaveform);
    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  // 播放 AI 语音
  const playAudioBase64 = useCallback((base64Audio: string, format: string = 'mp3'): Promise<void> => {
    return new Promise((resolve) => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }

      const audioDataUrl = `data:audio/${format};base64,${base64Audio}`;
      const audio = new Audio(audioDataUrl);
      currentAudioRef.current = audio;

      setIsAIPlaying(true);

      audio.onended = () => {
        setIsAIPlaying(false);
        currentAudioRef.current = null;
        resolve();
      };

      audio.onerror = () => {
        setIsAIPlaying(false);
        currentAudioRef.current = null;
        resolve(); // 即使出错也继续
      };

      audio.play().catch(() => {
        setIsAIPlaying(false);
        resolve();
      });
    });
  }, []);

  // 开始录音
  const startRecording = useCallback(async () => {
    if (callStatus !== 'idle' && callStatus !== 'playing') return;
    if (isMuted) return;

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // 音频分析器（波形）
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      setCallStatus('recording');

      // 启动计时（首次）
      if (callDuration === 0) startCallTimer();

      // 启动波形动画
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('麦克风权限被拒绝');
      } else {
        setError('无法启动录音');
      }
    }
  }, [callStatus, isMuted, callDuration, startCallTimer, updateWaveform]);

  // 停止录音并发送
  const stopRecordingAndSend = useCallback(async () => {
    if (callStatus !== 'recording') return;
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    setCallStatus('processing');
    setCurrentSubtitle('识别中...');

    // 停止波形动画
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setWaveformData(new Array(24).fill(2));

    mediaRecorderRef.current.onstop = async () => {
      if (audioChunksRef.current.length === 0) {
        setCallStatus('idle');
        setCurrentSubtitle('');
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      // 停止媒体流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // 转为 base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];

          // 发送给后端处理
          const result = await interviewApi.sendVoiceMessage(sessionId, base64, {
            mimeType: 'audio/webm',
            language: 'zh',
            voice,
          });

          // 更新字幕
          setConversations((prev) => [
            ...prev,
            { role: 'user', text: result.userText, timestamp: new Date() },
            { role: 'assistant', text: result.aiText, timestamp: new Date() },
          ]);

          setCurrentSubtitle(`面试官：${result.aiText}`);

          // 播放 AI 语音回复
          setCallStatus('playing');
          await playAudioBase64(result.audioBase64, result.audioFormat);

          if (result.shouldEnd) {
            // 面试结束，触发结束流程
            setCallStatus('ended');
            try {
              const endResult = await interviewApi.endInterview(sessionId);
              onEnd(endResult.reportId);
            } catch (endErr) {
              setError('结束面试失败，请手动点击结束按钮');
              setCallStatus('idle');
            }
          } else {
            setCallStatus('idle');
            setCurrentSubtitle('请说话...');
            // 3秒后清除提示
            subtitleTimeoutRef.current = setTimeout(() => {
              setCurrentSubtitle('');
            }, 3000);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : '处理失败，请重试');
          setCallStatus('idle');
          setCurrentSubtitle('');
        }
      };

      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
  }, [callStatus, sessionId, voice, playAudioBase64, onEnd]);

  // 结束面试
  const handleEndInterview = useCallback(async () => {
    if (!confirm('确定要结束语音面试吗？')) return;

    cleanup();
    setCallStatus('ended');

    try {
      const result = await interviewApi.endInterview(sessionId);
      onEnd(result.reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '结束面试失败');
      setCallStatus('idle');
    }
  }, [cleanup, sessionId, onEnd]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = () => {
    switch (callStatus) {
      case 'idle': return conversations.length === 0 ? '点击麦克风开始' : '点击麦克风继续';
      case 'recording': return '录音中，点击停止';
      case 'processing': return '处理中...';
      case 'playing': return 'AI 正在回复...';
      case 'ended': return '通话已结束';
      case 'error': return '发生错误';
      default: return '';
    }
  };

  return (
    <div className="voice-interview-page">
      {/* 顶部信息栏 */}
      <div className="voice-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <div className="voice-header-info">
          <div className="voice-title">{interview.title || interview.sceneName}</div>
          <div className="voice-meta">
            {interview.jobName || '通用岗位'} · {interview.difficultyName}
          </div>
        </div>
        <div className="voice-duration">{formatDuration(callDuration)}</div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-message" onClick={() => setError(null)}>
          ⚠️ {error}（点击关闭）
        </div>
      )}

      {/* 主内容区 */}
      <div className="voice-main">
        {/* AI 面试官显示区 */}
        <div className={`ai-avatar-section ${isAIPlaying ? 'speaking' : ''}`}>
          <div className="ai-avatar">
            <span className="ai-avatar-icon">🤖</span>
            {isAIPlaying && (
              <div className="ai-speaking-ring" />
            )}
          </div>
          <div className="ai-label">AI 面试官</div>
          {isAIPlaying && (
            <div className="ai-waveform">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="ai-wave-bar"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 字幕/对话记录区 */}
        <div className="subtitles-area">
          {conversations.length === 0 ? (
            <div className="no-subtitles">
              <p>开始录音后，对话内容将显示在这里</p>
            </div>
          ) : (
            <div className="subtitles-list">
              {conversations.map((msg, index) => (
                <div key={index} className={`subtitle-item ${msg.role}`}>
                  <span className="subtitle-role">
                    {msg.role === 'user' ? '你' : '面试官'}：
                  </span>
                  <span className="subtitle-text">{msg.text}</span>
                </div>
              ))}
              <div ref={subtitlesEndRef} />
            </div>
          )}

          {currentSubtitle && (
            <div className="current-subtitle">{currentSubtitle}</div>
          )}
        </div>

        {/* 用户波形显示（录音时） */}
        {callStatus === 'recording' && (
          <div className="user-waveform">
            {waveformData.map((height, i) => (
              <div
                key={i}
                className="user-wave-bar"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        )}

        {/* 状态标签 */}
        <div className="voice-status-label">{getStatusLabel()}</div>
      </div>

      {/* 底部控制区 */}
      <div className="voice-controls">
        {/* 静音按钮 */}
        <button
          className={`control-btn mute-btn ${isMuted ? 'muted' : ''}`}
          onClick={() => setIsMuted((prev) => !prev)}
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? '🔇' : '🔊'}
          <span>{isMuted ? '取消静音' : '静音'}</span>
        </button>

        {/* 主录音按钮 */}
        <button
          className={`main-mic-btn ${callStatus === 'recording' ? 'recording' : ''} ${callStatus === 'processing' ? 'processing' : ''}`}
          onClick={callStatus === 'recording' ? stopRecordingAndSend : startRecording}
          disabled={callStatus === 'processing' || callStatus === 'ended' || isMuted}
          title={getStatusLabel()}
        >
          {callStatus === 'processing' ? (
            <span className="btn-spinner" />
          ) : callStatus === 'recording' ? (
            <span>⏹</span>
          ) : (
            <span>🎙️</span>
          )}
        </button>

        {/* 结束通话按钮 */}
        <button
          className="control-btn end-call-btn"
          onClick={handleEndInterview}
          disabled={callStatus === 'ended'}
          title="结束面试"
        >
          📵
          <span>结束面试</span>
        </button>
      </div>
    </div>
  );
};

export default VoiceInterview;
