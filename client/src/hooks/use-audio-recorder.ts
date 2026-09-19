import * as React from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { blobToWav, getSupportedMimeType } from '@client/src/utils/audio-utils';

interface UseAudioRecorderResult {
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob; mimeType: string } | null>;
  error: string | null;
  duration: number;
}

const MIN_DURATION_MS = 400;
const MAX_DURATION_MS = 30000;

export function useAudioRecorder(): UseAudioRecorderResult {
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const stopResolveRef = React.useRef<((result: { blob: Blob; mimeType: string } | null) => void) | null>(null);
  const startTimeRef = React.useRef<number>(0);
  const maxTimerRef = React.useRef<number | null>(null);

  const [isRecording, setIsRecording] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    const supported =
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined';
    setIsSupported(supported);
  }, []);

  const cleanupStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      clearTimer();
      cleanupStream();
      stopResolveRef.current = null;
    };
  }, [clearTimer, cleanupStream]);

  const startRecording = React.useCallback(async (): Promise<void> => {
    setError(null);
    setDuration(0);
    chunksRef.current = [];

    if (!isSupported) {
      setError('当前浏览器不支持录音功能');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const resolve = stopResolveRef.current;
        const type = recorder.mimeType || 'audio/webm';
        const blob = chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type })
          : null;
        stopResolveRef.current = null;
        clearTimer();
        cleanupStream();
        setIsRecording(false);
        if (!resolve) return;

        if (!blob) {
          resolve(null);
          return;
        }

        blobToWav(blob, type)
          .then((wavResult) => {
            logger.info(`录音转码完成: ${type} → ${wavResult.mimeType}, size=${wavResult.blob.size}`);
            resolve(wavResult);
          })
          .catch((err) => {
            logger.error('音频转码失败', err);
            setError('音频处理失败，请重试');
            resolve(null);
          });
      };

      recorder.onerror = () => {
        setError('录音过程中发生错误');
        clearTimer();
        cleanupStream();
        setIsRecording(false);
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        if (resolve) {
          resolve(null);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();

      timerRef.current = window.setInterval(() => {
        setDuration((prev: number) => prev + 1);
      }, 1000);

      maxTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.stop();
          } catch {
            // ignore
          }
        }
      }, MAX_DURATION_MS);
    } catch (err: unknown) {
      const domError = err as { name?: string; message?: string };
      if (domError.name === 'NotAllowedError' || domError.name === 'PermissionDeniedError') {
        setError('麦克风权限被拒绝，请在浏览器设置中允许使用麦克风');
      } else if (domError.name === 'NotFoundError' || domError.name === 'DevicesNotFoundError') {
        setError('未检测到麦克风设备');
      } else {
        setError(domError.message || '无法开始录音');
      }
      cleanupStream();
      setIsRecording(false);
    }
  }, [isSupported, clearTimer, cleanupStream]);

  const stopRecording = React.useCallback((): Promise<{ blob: Blob; mimeType: string } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        resolve(null);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed < MIN_DURATION_MS) {
        setTimeout(() => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
            resolve(null);
            return;
          }
          stopResolveRef.current = resolve;
          try {
            mediaRecorderRef.current.stop();
          } catch {
            resolve(null);
            stopResolveRef.current = null;
          }
        }, MIN_DURATION_MS - elapsed);
        return;
      }

      stopResolveRef.current = resolve;
      try {
        mediaRecorderRef.current.stop();
      } catch {
        resolve(null);
        stopResolveRef.current = null;
      }
    });
  }, []);

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    error,
    duration,
  };
}
