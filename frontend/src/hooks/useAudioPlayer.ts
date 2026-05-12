import { useRef, useCallback, useState } from 'react';

/**
 * 通用音频播放 Hook
 *
 * 解决移动端浏览器自动播放限制问题：
 * 1. 在用户首次交互时"解锁"浏览器音频播放权限
 * 2. 复用同一个 Audio 元素，避免每次 new Audio() 丢失播放许可
 * 3. 播放失败时自动重试（带用户交互上下文恢复）
 * 4. 使用 Blob URL 替代 data URI，提高移动端兼容性
 *
 * 使用方式：
 *   const { unlock, playBase64, playBlob, isPlaying, stop } = useAudioPlayer();
 *   // 在用户点击事件中调用 unlock() 解锁播放权限
 *   // 在需要播放音频时调用 playBase64(base64, format) 或 playBlob(blob)
 */

// 极短静音音频（用于解锁播放权限，约 0.1 秒）
const SILENCE_BASE64 =
  'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAgAAAbAAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYgFssGAAAAAAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAgAAAbAAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYgFssGAAAAAAAAAAAAAAAAAAAA';

interface UseAudioPlayerOptions {
  /** 播放失败时的最大重试次数，默认 2 */
  maxRetries?: number;
  /** 重试间隔（毫秒），默认 300 */
  retryDelay?: number;
  /** 播放失败时的回调 */
  onPlayError?: (error: Error) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const { maxRetries = 2, retryDelay = 300, onPlayError } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isUnlockedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);

  // 重试队列：当播放因自动播放策略失败时，暂存待播放的音频，等待下次用户交互时重试
  const pendingPlayRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * 解锁浏览器音频播放权限
   * 必须在用户交互事件（click / touchend）中调用
   */
  const unlock = useCallback(() => {
    if (isUnlockedRef.current) return;

    try {
      const audio = audioRef.current || new Audio();
      audio.src = `data:audio/mp3;base64,${SILENCE_BASE64}`;
      audio.volume = 0.01; // 几乎静音
      audio.play().then(() => {
        isUnlockedRef.current = true;
        audio.pause();
        audio.currentTime = 0;
        // 解锁成功后，如果有等待中的播放任务，立即执行
        if (pendingPlayRef.current) {
          const pending = pendingPlayRef.current;
          pendingPlayRef.current = null;
          pending();
        }
      }).catch(() => {
        // 解锁失败，下次用户交互会再次尝试
      });
      if (!audioRef.current) {
        audioRef.current = audio;
      }
    } catch {
      // 忽略
    }
  }, []);

  /**
   * 停止当前播放
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // 释放可能存在的 Blob URL
      const src = audioRef.current.src;
      if (src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  /**
   * 内部播放核心逻辑
   * 复用同一个 Audio 元素，通过更换 src 播放不同音频
   */
  const playSrc = useCallback(
    (src: string): Promise<void> => {
      return new Promise((resolve) => {
        // 先停止当前播放
        if (audioRef.current) {
          const oldSrc = audioRef.current.src;
          audioRef.current.pause();
          if (oldSrc.startsWith('blob:')) {
            URL.revokeObjectURL(oldSrc);
          }
        }

        let audio = audioRef.current;
        if (!audio) {
          audio = new Audio();
          audioRef.current = audio;
        }

        // 清除旧事件
        audio.onended = null;
        audio.onerror = null;

        audio.src = src;
        audio.volume = 1.0;

        const handleEnd = () => {
          setIsPlaying(false);
          isPlayingRef.current = false;
          audio!.onended = null;
          audio!.onerror = null;
          // 释放 Blob URL
          const currentSrc = audio!.src;
          if (currentSrc.startsWith('blob:')) {
            URL.revokeObjectURL(currentSrc);
          }
          resolve();
        };

        audio.onended = handleEnd;
        audio.onerror = () => {
          console.warn('[useAudioPlayer] Audio error event');
          handleEnd();
        };

        setIsPlaying(true);
        isPlayingRef.current = true;

        const attemptPlay = async (retriesLeft: number) => {
          try {
            await audio!.play();
            // 播放成功，标记已解锁
            isUnlockedRef.current = true;
          } catch (error) {
            const err = error as Error;
            const isNotAllowed =
              err.name === 'NotAllowedError' ||
              (err instanceof DOMException && err.name === 'NotAllowedError');

            if (isNotAllowed && retriesLeft > 0) {
              console.warn(
                `[useAudioPlayer] Play blocked (NotAllowedError), ${retriesLeft} retries left`
              );

              if (retriesLeft === 1) {
                // 最后一次重试机会：暂存播放任务，等待下次用户交互
                pendingPlayRef.current = async () => {
                  await attemptPlay(0);
                };
                onPlayError?.(err);
                // 不 resolve，等待用户交互触发重试后再 resolve
                // 但设置超时保底，防止永远卡住
                setTimeout(() => {
                  if (pendingPlayRef.current) {
                    pendingPlayRef.current = null;
                    handleEnd();
                  }
                }, 30000);
                return;
              }

              // 延迟重试
              await new Promise((r) => setTimeout(r, retryDelay));
              await attemptPlay(retriesLeft - 1);
            } else {
              console.warn('[useAudioPlayer] Audio play failed:', err);
              onPlayError?.(err);
              handleEnd();
            }
          }
        };

        attemptPlay(maxRetries);
      });
    },
    [maxRetries, retryDelay, onPlayError]
  );

  /**
   * 播放 Base64 编码的音频
   * 自动将 base64 转为 Blob URL，提高移动端兼容性
   */
  const playBase64 = useCallback(
    (base64Audio: string, format: string = 'mp3'): Promise<void> => {
      try {
        // 将 base64 转为 Blob，再用 URL.createObjectURL 生成 Blob URL
        // 比 data URI 兼容性更好，移动端解码更快
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const mimeType = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;
        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        return playSrc(blobUrl);
      } catch (error) {
        console.error('[useAudioPlayer] Failed to convert base64 to blob:', error);
        // 降级：使用 data URI
        const dataUrl = `data:audio/${format};base64,${base64Audio}`;
        return playSrc(dataUrl);
      }
    },
    [playSrc]
  );

  /**
   * 播放 Blob 音频
   */
  const playBlob = useCallback(
    (blob: Blob): Promise<void> => {
      const blobUrl = URL.createObjectURL(blob);
      return playSrc(blobUrl);
    },
    [playSrc]
  );

  return {
    /** 是否正在播放 */
    isPlaying,
    /** 在用户交互事件中调用，解锁浏览器音频播放权限 */
    unlock,
    /** 播放 Base64 编码的音频 */
    playBase64,
    /** 播放 Blob 音频 */
    playBlob,
    /** 停止当前播放 */
    stop,
    /** 内部 audio 元素引用（特殊场景需要直接操作时使用） */
    audioRef,
    /** 是否已解锁播放权限 */
    isUnlocked: isUnlockedRef,
  };
}
