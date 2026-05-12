import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// WebSocket 连接地址：生产环境使用当前页面同源（window.location.origin），
// 开发环境可通过 VITE_WS_URL 覆盖（默认 localhost:3001）
const WS_URL = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

interface AnalysisProgress {
  resumeId: string;
  stage: number;
  stageName: string;
  message: string;
  isCompleted: boolean;
  overallScore?: number;
}

interface UseResumeAnalysisWebSocketOptions {
  resumeId: string | undefined;
  userId: string | undefined;
  onProgress?: (data: AnalysisProgress) => void;
  onComplete?: (data: { resumeId: string; overallScore: number }) => void;
  onError?: (data: { resumeId: string; error: string }) => void;
}

export const useResumeAnalysisWebSocket = (options: UseResumeAnalysisWebSocketOptions) => {
  const { resumeId, userId, onProgress, onComplete, onError } = options;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!resumeId || !userId) {
      return;
    }

    const socket = io(`${WS_URL}/resume-analysis`, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[ResumeAnalysis WS] Connected');
      socket.emit('join-resume', { resumeId, userId });
    });

    socket.on('disconnect', () => {
      console.log('[ResumeAnalysis WS] Disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[ResumeAnalysis WS] Connection error:', error);
    });

    socket.on('joined-resume', (data) => {
      console.log('[ResumeAnalysis WS] Joined resume room:', data);
    });

    socket.on('analysis-progress', (data: AnalysisProgress) => {
      console.log('[ResumeAnalysis WS] Progress:', data);
      onProgress?.(data);
    });

    socket.on('analysis-complete', (data: { resumeId: string; overallScore: number }) => {
      console.log('[ResumeAnalysis WS] Complete:', data);
      onComplete?.(data);
    });

    socket.on('analysis-error', (data: { resumeId: string; error: string }) => {
      console.error('[ResumeAnalysis WS] Error:', data);
      onError?.(data);
    });

    return () => {
      socket.emit('leave-resume', { resumeId, userId });
      socket.disconnect();
    };
  }, [resumeId, userId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return { disconnect };
};
