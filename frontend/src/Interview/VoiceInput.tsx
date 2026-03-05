import React, { useState, useRef, useEffect, useCallback } from 'react';
import { interviewApi } from './api';

// SVG 图标
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  language?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscription,
  disabled = false,
  language = 'zh',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(20).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isRecordingRef = useRef(false);

  const MAX_RECORDING_SECONDS = 60;

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
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    isRecordingRef.current = false;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const sampleCount = 20;
    const step = Math.floor(bufferLength / sampleCount);
    const newWaveform = Array.from({ length: sampleCount }, (_, i) => {
      const start = i * step;
      const end = Math.min(start + step, bufferLength);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += dataArray[j];
      }
      return Math.min(100, (sum / (end - start) / 255) * 100);
    });

    setWaveformData(newWaveform);
    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = async () => {
    if (disabled || isRecording || isProcessing) return;

    setError(null);
    isRecordingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    } catch (err) {
      isRecordingRef.current = false;
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('未找到麦克风设备，请检查设备连接');
      } else {
        setError('无法启动录音，请检查麦克风设置');
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    setIsRecording(false);
    isRecordingRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setWaveformData(new Array(20).fill(0));

    mediaRecorderRef.current.onstop = async () => {
      if (audioChunksRef.current.length === 0) {
        cleanup();
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setIsProcessing(true);
      try {
        const result = await interviewApi.speechToText(audioBlob, language);
        if (result.text && result.text.trim()) {
          onTranscription(result.text.trim());
        } else {
          setError('未能识别到语音内容，请重试');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '语音识别失败，请重试');
      } finally {
        setIsProcessing(false);
        cleanup();
      }
    };

    mediaRecorderRef.current.stop();
  }, [cleanup, language, onTranscription]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonTitle = () => {
    if (disabled) return '请等待AI回复后再录音';
    if (isProcessing) return '正在识别语音...';
    if (isRecording) return '点击停止录音';
    return '点击开始录音';
  };

  return (
    <div className="voice-input-container">
      {error && (
        <div className="voice-input-error">
          <AlertTriangleIcon />
          <span>{error}</span>
          <button className="error-dismiss" onClick={() => setError(null)}>
            <XIcon />
          </button>
        </div>
      )}

      {isRecording && (
        <div className="voice-input-recording">
          <div className="waveform-container">
            {waveformData.map((height, index) => (
              <div
                key={index}
                className="waveform-bar"
                style={{ height: `${Math.max(4, height)}%` }}
              />
            ))}
          </div>
          <div className="recording-info">
            <span className="recording-dot" />
            <span className="recording-time">{formatTime(recordingTime)}</span>
            <span className="recording-hint">点击麦克风停止录音</span>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="voice-input-processing">
          <span className="processing-spinner" />
          <span>正在识别语音...</span>
        </div>
      )}

      <button
        className={`voice-input-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        title={getButtonTitle()}
        aria-label={getButtonTitle()}
      >
        {isProcessing ? (
          <span className="btn-spinner" />
        ) : isRecording ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
      </button>
    </div>
  );
};

export default VoiceInput;
