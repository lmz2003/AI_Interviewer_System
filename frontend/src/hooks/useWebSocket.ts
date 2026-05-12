import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// WebSocket 连接地址：生产环境使用当前页面同源（window.location.origin），
// 开发环境可通过 VITE_WS_URL 覆盖（默认 localhost:3001）
const WS_URL = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

type SocketCallback = (...args: unknown[]) => void;

export const useWebSocket = (noteId: string | undefined, userId: string | undefined) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!noteId || !userId) {
      return;
    }

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('join-note', { noteId, user: { id: userId, name: userId } });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      if (noteId) {
        socket.emit('leave-note', { noteId, userId });
      }
      socket.disconnect();
    };
  }, [noteId, userId]);

  const on = (event: string, callback: SocketCallback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback: SocketCallback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const emit = (event: string, data: unknown) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return { on, off, emit };
};
