import React, { useState, useRef, useCallback, useEffect } from 'react';
import { interviewApi } from './api';
import type { Interview, VideoCallStatus, VideoAnalysisInMessage } from './types';
import { useToastModal } from '@/components/ui/toast-modal';
import InterviewPaused from './InterviewPaused';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopSquareIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.91 19.79 19.79 0 0 1 1.2 1.28 2 2 0 0 1 3.22.0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.2 7.91" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const VolumeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const VolumeOnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const VideoOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const VideoOnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

interface VideoInterviewProps {
  interview: Interview;
  sessionId: string;
  openingText?: string;
  onBack: () => void;
  voice?: string;
  initialDuration?: number;
  initialConversations?: ConversationMessage[];
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface FrameData {
  base64: string;
  timestamp: number;
  roundIndex: number;
}

const VideoInterview: React.FC<VideoInterviewProps> = ({
  interview,
  sessionId,
  openingText = '',
  onBack,
  voice = 'anna',
  initialDuration = 0,
  initialConversations,
}) => {
  // 开场白已处于第 0 轮（AI 开场），用户第一次回答时为第 1 轮
  const [callStatus, setCallStatus] = useState<VideoCallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(initialDuration);
  const [isPaused, setIsPaused] = useState(false);
  const [conversations, setConversations] = useState<ConversationMessage[]>(() => {
    // 继续面试：优先使用历史对话记录
    if (initialConversations && initialConversations.length > 0) {
      return initialConversations;
    }
    // 新建面试：将开场白作为第一条消息
    if (openingText.trim()) {
      return [{ role: 'assistant', text: openingText, timestamp: new Date() }];
    }
    return [];
  });
  const [_currentSubtitle, setCurrentSubtitle] = useState('');
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(24).fill(2));
  const [videoAnalysisData, setVideoAnalysisData] = useState<VideoAnalysisInMessage | null>(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // 媒体相关 refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  /** 包含视频+音频的完整流，用于摄像头预览和截帧（始终保持） */
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subtitleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 使用通用音频播放 Hook（解决移动端自动播放限制）
  const { unlock: unlockAudio, playBase64: playAudioPlayerBase64, playBlob: playAudioPlayerBlob, stop: stopAudio, audioRef: playerAudioRef } = useAudioPlayer({
    onPlayError: (err) => {
      console.warn('[VideoInterview] AI音频播放失败:', err.message);
    },
  });
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const setVideoPreviewRef = useCallback((node: HTMLVideoElement | null) => {
    videoPreviewRef.current = node;
    if (node && videoStreamRef.current) {
      node.srcObject = videoStreamRef.current;
    }
  }, []);

  // 帧缓冲：始终在录制（按 roundIndex 区分每轮问答的帧）
  const frameBufferRef = useRef<FrameData[]>([]);
  /** 当前问答轮次编号：0 = 开场白阶段，每次用户发送后 +1
   *  继续面试时从历史用户消息数量推算，避免与历史帧的 roundIndex 冲突 */
  const currentRoundRef = useRef(
    initialConversations
      ? initialConversations.filter((m) => m.role === 'user').length + 1
      : 0,
  );
  const frameCaptureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 始终与 isCameraOff state 同步，供 interval 回调读取（避免闭包过时） */
  const isCameraOffRef = useRef(false);
  const FRAME_CAPTURE_INTERVAL = 2000;
  const MAX_FRAMES_BUFFER = 120; // 全局最多保留 120 帧

  const subtitlesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);
  const callDurationRef = useRef(callDuration);
  sessionIdRef.current = sessionId;
  callDurationRef.current = callDuration;

  useEffect(() => {
    subtitlesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  // ─── 计时器 ────────────────────────────────────────────────────────────────

  const startCallTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const saveProgress = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      await interviewApi.saveProgress(sessionIdRef.current, {
        elapsedTime: callDurationRef.current,
      });
    } catch (err) {
      console.error('保存进度失败:', err);
    }
  }, []);

  const saveProgressRef = useRef(saveProgress);
  saveProgressRef.current = saveProgress;

  // ─── 摄像头初始化（组件挂载时立即启动，始终保持）────────────────────────

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      videoStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      setCameraReady(true);
      console.log('[VideoInterview] 摄像头初始化成功');
    } catch (err) {
      console.error('[VideoInterview] 摄像头初始化失败:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('摄像头或麦克风权限被拒绝，视频面试需要摄像头和麦克风权限');
        } else if (err.name === 'NotFoundError') {
          setError('未找到摄像头或麦克风设备');
        } else {
          setError(`无法启动摄像头: ${err.name} - ${err.message}`);
        }
      } else {
        setError('无法启动摄像头: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  }, []);

  // ─── 全局帧截取（始终在后台运行，不受录音状态影响）─────────────────────

  const captureVideoFrame = useCallback((): string | null => {
    // 使用 ref 读取摄像头状态，避免 interval 回调中的闭包过时问题
    if (!videoPreviewRef.current || !videoCanvasRef.current || isCameraOffRef.current) return null;
    const video = videoPreviewRef.current;
    const canvas = videoCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  }, []);

  const captureFrameToBuffer = useCallback(() => {
    const base64 = captureVideoFrame();
    if (!base64) return;
    const frame: FrameData = {
      base64,
      timestamp: Date.now(),
      roundIndex: currentRoundRef.current,
    };
    frameBufferRef.current.push(frame);
    // 限制缓冲区大小，删除最早的帧
    if (frameBufferRef.current.length > MAX_FRAMES_BUFFER) {
      frameBufferRef.current = frameBufferRef.current.slice(-MAX_FRAMES_BUFFER);
    }
  }, [captureVideoFrame]);

  /** 获取指定轮次的帧（发送时使用） */
  const getFramesForRound = useCallback((roundIndex: number): string[] => {
    return frameBufferRef.current
      .filter((f) => f.roundIndex === roundIndex)
      .map((f) => f.base64);
  }, []);

  const startGlobalFrameCapture = useCallback(() => {
    if (frameCaptureIntervalRef.current) return;
    // 立即截一帧
    captureFrameToBuffer();
    frameCaptureIntervalRef.current = setInterval(() => {
      captureFrameToBuffer();
    }, FRAME_CAPTURE_INTERVAL);
    console.log('[VideoInterview] 全局截帧已启动');
  }, [captureFrameToBuffer]);

  const stopGlobalFrameCapture = useCallback(() => {
    if (frameCaptureIntervalRef.current) {
      clearInterval(frameCaptureIntervalRef.current);
      frameCaptureIntervalRef.current = null;
    }
  }, []);

  // ─── 音频波形 ──────────────────────────────────────────────────────────────

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

  // ─── AI 音频播放（使用 useAudioPlayer，解决移动端自动播放限制）────────────

  const handlePlayAudio = useCallback(async (base64Audio: string, format: string = 'mp3') => {
    setIsAIPlaying(true);
    await playAudioPlayerBase64(base64Audio, format);
    setIsAIPlaying(false);
  }, [playAudioPlayerBase64]);

  // ─── 开场白播放（使用 useAudioPlayer，解决移动端自动播放限制）─────────────

  const playOpeningAudio = useCallback(async () => {
    if (!openingText.trim()) return;
    try {
      setIsAIPlaying(true);
      setCurrentSubtitle(`面试官：${openingText}`);
      const audioBlob = await interviewApi.textToSpeech(openingText, voice, 1.0);
      await playAudioPlayerBlob(audioBlob);
      setIsAIPlaying(false);
      // 开场白播放完成，进入第 1 轮（等待用户回答）
      currentRoundRef.current = 1;
      setCurrentSubtitle('请说话...');
      subtitleTimeoutRef.current = setTimeout(() => setCurrentSubtitle(''), 3000);
    } catch (err) {
      console.error('[VideoInterview] 开场白播放失败:', err);
      setIsAIPlaying(false);
      currentRoundRef.current = 1;
    }
  }, [openingText, voice, playAudioPlayerBlob]);

  // ─── 生命周期 ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // 1. 初始化摄像头
    initCamera();

    // 2. 计时器（恢复进度时立即启动）
    if (initialDuration > 0) {
      startCallTimer();
    }

    // 3. 页面关闭时保存进度
    const handleBeforeUnload = () => saveProgressRef.current();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveProgressRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 摄像头就绪后：启动全局截帧 + 播放开场白 + 计时器
  useEffect(() => {
    if (!cameraReady) return;

    startGlobalFrameCapture();
    startCallTimer(); // 面试计时从摄像头就绪开始

    // 如果有开场白文本就播放（新建面试）；继续面试时不再播放
    if (openingText.trim()) {
      playOpeningAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady]);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    stopGlobalFrameCapture();
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    stopAudio();
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
  }, [stopGlobalFrameCapture, stopAudio]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // ─── 录音控制 ──────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (callStatus !== 'idle' && callStatus !== 'playing') {
      console.log('[VideoInterview] Cannot start: invalid callStatus', callStatus);
      return;
    }
    if (isMuted) return;
    if (isAIPlaying) {
      console.log('[VideoInterview] Cannot start: AI is playing audio');
      return;
    }
    if (!videoStreamRef.current) {
      setError('摄像头未就绪，请等待摄像头初始化完成');
      return;
    }

    setError(null);

    try {
      // 复用已有的视频流中的音频轨道，不重新请求权限
      const audioTrack = videoStreamRef.current.getAudioTracks()[0];
      if (!audioTrack) {
        setError('未找到音频轨道');
        return;
      }

      // 建立音频分析器（波形可视化）
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const audioStream = new MediaStream([audioTrack]);
        const source = audioContext.createMediaStreamSource(audioStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
      }

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg',
        'audio/wav',
      ];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || 'audio/webm';

      const audioStream = new MediaStream([audioTrack]);
      const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      // 在用户交互（点击麦克风）时解锁音频播放权限
      unlockAudio();

      mediaRecorder.start(100);
      setCallStatus('recording');
      if (callDuration === 0) startCallTimer();
      animationFrameRef.current = requestAnimationFrame(updateWaveform);

      console.log(`[VideoInterview] 开始录音，当前轮次: ${currentRoundRef.current}`);
    } catch (err) {
      console.error('[VideoInterview] 启动录音失败:', err);
      setError('无法启动录音: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [callStatus, isMuted, callDuration, startCallTimer, updateWaveform, unlockAudio]);

  const stopRecordingAndSend = useCallback(async () => {
    if (callStatus !== 'recording') return;
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    setCallStatus('processing');
    setCurrentSubtitle('识别中...');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setWaveformData(new Array(24).fill(2));

    const sendRound = currentRoundRef.current;
    const sessionFrames = getFramesForRound(sendRound);
    console.log(`[VideoInterview] 停止录音，收集轮次 ${sendRound} 的帧: ${sessionFrames.length} 帧`);

    currentRoundRef.current = sendRound + 1;

    setConversations((prev) => [
      ...prev,
      { role: 'user', text: '正在识别...', timestamp: new Date() },
    ]);

    mediaRecorderRef.current.onstop = async () => {
      if (audioChunksRef.current.length === 0) {
        setCallStatus('idle');
        setCurrentSubtitle('');
        setConversations((prev) => prev.filter((msg) => msg.text !== '正在识别...'));
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];

          console.log(`[VideoInterview] 发送：音频 ${base64.length} bytes, 视频帧 ${sessionFrames.length} 帧`);

          let userText = '';
          let aiText = '';

          interviewApi.sendVideoMessageStream(
            sessionId,
            base64,
            async (event) => {
              if (event.type === 'transcription') {
                userText = event.data.text;
                setConversations((prev) =>
                  prev.map((msg) =>
                    msg.text === '正在识别...' ? { ...msg, text: userText } : msg,
                  ),
                );
                setCurrentSubtitle('正在思考...');
              } else if (event.type === 'correction') {
                userText = event.data.correctedText;
                setConversations((prev) =>
                  prev.map((msg) =>
                    msg.text === event.data.originalText || msg.text === '正在识别...'
                      ? { ...msg, text: userText }
                      : msg,
                  ),
                );
              } else if (event.type === 'chunk') {
                aiText += event.data.text;
                setConversations((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant') {
                    return [...prev.slice(0, -1), { ...lastMsg, text: aiText }];
                  }
                  return [...prev, { role: 'assistant', text: aiText, timestamp: new Date() }];
                });
                setCurrentSubtitle(`面试官：${aiText}`);
              } else if (event.type === 'videoAnalysis') {
                const { data: videoAnalysis } = event.data;
                if (videoAnalysis) {
                  setVideoAnalysisData(videoAnalysis);
                }
              } else if (event.type === 'done') {
                const { audioBase64, audioFormat, shouldEnd } = event.data;

                setConversations((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant' && lastMsg.text !== aiText) {
                    return [...prev.slice(0, -1), { ...lastMsg, text: aiText }];
                  }
                  return prev;
                });

                setCallStatus('playing');
                await handlePlayAudio(audioBase64, audioFormat);

                if (shouldEnd) {
                  setCallStatus('ended');
                  try {
                    await interviewApi.endInterview(sessionId);
                    onBack();
                  } catch {
                    setError('结束面试失败，请手动点击结束按钮');
                    setCallStatus('idle');
                  }
                } else {
                  setCallStatus('idle');
                  setCurrentSubtitle('请说话...');
                  subtitleTimeoutRef.current = setTimeout(() => setCurrentSubtitle(''), 3000);
                }
              } else if (event.type === 'error') {
                setError(event.data.message || '处理失败');
                setCallStatus('idle');
                setCurrentSubtitle('');
                setConversations((prev) => prev.filter((msg) => msg.text !== '正在识别...'));
              }
            },
            (err) => {
              setError(err.message);
              setCallStatus('idle');
              setCurrentSubtitle('');
              setConversations((prev) => prev.filter((msg) => msg.text !== '正在识别...'));
            },
            {
              audioMimeType: 'audio/webm',
              videoFrames: sessionFrames.length > 0 ? sessionFrames : undefined,
              voice,
            },
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : '处理失败，请重试');
          setCallStatus('idle');
          setCurrentSubtitle('');
          setConversations((prev) => prev.filter((msg) => msg.text !== '正在识别...'));
        }
      };

      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
  }, [callStatus, sessionId, voice, handlePlayAudio, onBack, getFramesForRound]);

  // ─── 结束/返回 ─────────────────────────────────────────────────────────────
  const toastModal = useToastModal();

  const handlePause = useCallback(() => {
    if (callStatus === 'recording') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setCallStatus('idle');
    }
    stopAudio();
    setIsAIPlaying(false);
    // 暂停时停止计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPaused(true);
  }, [callStatus]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    // 恢复时重启计时器
    startCallTimer();
    if (videoStreamRef.current && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = videoStreamRef.current;
    }
  }, [startCallTimer]);

  const handleEndInterview = useCallback(async () => {
    const confirmed = await toastModal.confirm(
      '确定要结束本次面试吗？结束后将无法继续。',
      '结束面试'
    );
    if (!confirmed) return;

    cleanup();
    setCallStatus('ended');

    try {
      await saveProgress();
      await interviewApi.endInterview(sessionId);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : '结束面试失败');
      setCallStatus('idle');
    }
  }, [cleanup, sessionId, onBack, saveProgress, toastModal]);

  // ─── 摄像头开关（不停流，仅禁用视频轨道）─────────────────────────────────

  const toggleCamera = useCallback(() => {
    if (videoStreamRef.current) {
      const videoTrack = videoStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const nextOff = !isCameraOff;
        videoTrack.enabled = !nextOff;
        isCameraOffRef.current = nextOff;
        setIsCameraOff(nextOff);
      }
    }
  }, [isCameraOff]);

  // ─── UI 辅助 ───────────────────────────────────────────────────────────────

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = () => {
    if (!cameraReady) return '正在初始化摄像头...';
    if (isAIPlaying && conversations.length === 1 && conversations[0].role === 'assistant') {
      return '面试官正在说话...';
    }
    switch (callStatus) {
      case 'idle': return conversations.filter(m => m.role === 'user').length === 0 ? '面试官开场结束后点击麦克风回答' : '点击麦克风继续';
      case 'recording': return '录音中，点击停止';
      case 'processing': return '处理中...';
      case 'playing': return 'AI 正在回复...';
      case 'ended': return '通话已结束';
      case 'error': return '发生错误';
      default: return '';
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    const emojis: Record<string, string> = {
      happy: '😊', sad: '😢', angry: '😠',
      fearful: '😨', disgusted: '🤢', surprised: '😲', neutral: '😐',
    };
    return emojis[emotion] || '😐';
  };

  // AI播放音频期间禁用麦克风，包括开场白和回答
  const micDisabled = callStatus === 'processing' || callStatus === 'ended' || isMuted || !cameraReady || isAIPlaying;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="video-interview-page">
      {isPaused ? (
        <InterviewPaused
          interviewTitle={interview.title || interview.sceneName}
          elapsedTime={callDuration}
          onResume={handleResume}
          onEnd={handleEndInterview}
        />
      ) : (
        <>
          <div className="video-header">
            <button className="pause-btn" onClick={handlePause}>
              <PauseIcon />
              暂停
            </button>
            <div className="video-header-info">
              <div className="video-title">{interview.title || interview.sceneName}</div>
              <div className="video-meta">
                {interview.jobName || '通用岗位'} · {interview.difficultyName}
              </div>
            </div>
            <div className="video-duration">{formatDuration(callDuration)}</div>
          </div>

      {error && (
        <div className="error-message" onClick={() => setError(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}（点击关闭）
        </div>
      )}

      <div className="video-main">
        <div className="video-container">
          {/* 用户视频区 */}
          <div className="user-video-section">
            {/* 实时分析浮窗 —— 绝对定位于摄像头左侧 */}
            {showAnalysisPanel && videoAnalysisData && (
              <div className="analysis-panel">
                <div className="analysis-header">
                  <span>实时分析</span>
                  <button onClick={() => setShowAnalysisPanel(false)}>×</button>
                </div>
                <div className="analysis-content">
                  <div className="analysis-item">
                    <span className="analysis-label">表情</span>
                    <span className="analysis-value">
                      {getEmotionEmoji(
                        videoAnalysisData.dominantEmotion ||
                        videoAnalysisData.summary?.dominantEmotion ||
                        'neutral'
                      )}
                    </span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-label">眼神接触</span>
                    <span className={`analysis-value ${
                      (videoAnalysisData.eyeContact || (videoAnalysisData.summary?.eyeContactRatio ?? 0) > 0.5)
                        ? 'good' : 'warn'
                    }`}>
                      {(videoAnalysisData.eyeContact || (videoAnalysisData.summary?.eyeContactRatio ?? 0) > 0.5)
                        ? '良好' : '需改进'}
                    </span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-label">视线方向</span>
                    <span className="analysis-value">
                      {videoAnalysisData.gazeDirection ||
                        (videoAnalysisData.summary?.gazeDistribution
                          ? Object.entries(videoAnalysisData.summary.gazeDistribution)
                              .sort((a, b) => b[1] - a[1])[0]?.[0]
                          : '—')}
                    </span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-label">人脸检测</span>
                    <span className={`analysis-value ${
                      (videoAnalysisData.faceDetected || (videoAnalysisData.summary?.faceDetectionRatio ?? 0) > 0.5)
                        ? 'good' : 'warn'
                    }`}>
                      {(videoAnalysisData.faceDetected || (videoAnalysisData.summary?.faceDetectionRatio ?? 0) > 0.5)
                        ? '正常' : '未检测到'}
                    </span>
                  </div>
                  {videoAnalysisData.summary?.overallScore !== undefined && (
                    <div className="analysis-item">
                      <span className="analysis-label">综合评分</span>
                      <span className="analysis-value">{videoAnalysisData.summary.overallScore}/100</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className={`video-preview ${isCameraOff ? 'camera-off' : ''}`}>
              <video
                ref={setVideoPreviewRef}
                autoPlay
                playsInline
                muted
                className="user-video"
              />
              {!cameraReady && (
                <div className="camera-off-overlay">
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                  <span>初始化摄像头...</span>
                </div>
              )}
              {cameraReady && isCameraOff && (
                <div className="camera-off-overlay">
                  <VideoOffIcon />
                  <span>摄像头已关闭</span>
                </div>
              )}
              {callStatus === 'recording' && (
                <div className="recording-indicator">
                  <span className="recording-dot" />
                  录制中
                </div>
              )}
            </div>
            <div className="user-label">你</div>
          </div>

          {/* AI 面试官区 */}
          <div className={`ai-video-section ${isAIPlaying ? 'speaking' : ''}`}>
            <div className="ai-avatar-large">
              <svg className="ai-avatar-svg-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4" />
                <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
                <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
              </svg>
              {isAIPlaying && <div className="ai-speaking-ring-large" />}
            </div>
            <div className="ai-label">AI 面试官</div>
            {isAIPlaying && (
              <div className="ai-waveform-large">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="ai-wave-bar-large" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="video-info-row">
          <div className="subtitles-area">
          {conversations.length === 0 ? (
            <div className="no-subtitles">
              <p>{isAIPlaying && openingText ? openingText : '等待面试官开场...'}</p>
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

            {/* {currentSubtitle && (
              <div className="current-subtitle">{currentSubtitle}</div>
            )} */}
          </div>

        </div>

        <div className="video-status-label">
          {callStatus === 'recording' ? (
            <div className="user-waveform">
              {waveformData.map((height, i) => (
                <div key={i} className="user-wave-bar" style={{ height: `${height}%` }} />
              ))}
            </div>
          ) : (
            <span>{getStatusLabel()}</span>
          )}
        </div>
      </div>

      <div className="video-controls">
        <button
          className={`control-btn mute-btn ${isMuted ? 'muted' : ''}`}
          onClick={() => setIsMuted((prev) => !prev)}
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? <VolumeOffIcon /> : <VolumeOnIcon />}
          <span>{isMuted ? '取消静音' : '静音'}</span>
        </button>

        <button
          className={`control-btn camera-btn ${isCameraOff ? 'camera-off' : ''}`}
          onClick={toggleCamera}
          disabled={!cameraReady}
          title={isCameraOff ? '开启摄像头' : '关闭摄像头'}
        >
          {isCameraOff ? <VideoOffIcon /> : <VideoOnIcon />}
          <span>{isCameraOff ? '开启摄像头' : '关闭摄像头'}</span>
        </button>

        <button
          className={`main-mic-btn ${callStatus === 'recording' ? 'recording' : ''} ${callStatus === 'processing' ? 'processing' : ''}`}
          onClick={callStatus === 'recording' ? stopRecordingAndSend : startRecording}
          disabled={micDisabled}
          title={getStatusLabel()}
        >
          {callStatus === 'processing' ? (
            <span className="btn-spinner" />
          ) : callStatus === 'recording' ? (
            <StopSquareIcon />
          ) : (
            <MicIcon />
          )}
        </button>

        <button
          className={`control-btn analysis-btn ${showAnalysisPanel ? 'active' : ''} ${!videoAnalysisData ? 'no-data' : ''}`}
          onClick={() => {
            if (!videoAnalysisData) {
              toastModal.error('完成第一轮回答后即可查看实时分析数据', '暂无分析数据');
              return;
            }
            setShowAnalysisPanel((prev) => !prev);
          }}
          title={videoAnalysisData ? '显示分析面板' : '完成一轮回答后可查看'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>分析</span>
        </button>

        <button
          className="control-btn end-call-btn"
          onClick={handleEndInterview}
          disabled={callStatus === 'ended'}
          title="结束面试"
        >
          <PhoneOffIcon />
          <span>结束面试</span>
        </button>
      </div>

      <canvas ref={videoCanvasRef} style={{ display: 'none' }} />
        </>
      )}
    </div>
  );
};

export default VideoInterview;
