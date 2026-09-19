import * as React from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob; mimeType: string } | null>;
  isSupported: boolean;
  error: string | null;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const stopResolveRef = React.useRef<
    ((result: { blob: Blob; mimeType: string } | null) => void) | null
  >(null,);

  const [isRecording, setIsRecording] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'recording'
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      cleanupStream();
      stopResolveRef.current = null;
    };
  }, [cleanupStream]);

  const startRecording = React.useCallback(async (): Promise<void> => {
    setError(null);
    chunksRef.current = [];

    if (!isSupported) {
      setError('当前浏览器不支持录音功能');
      return;
    }

    try {
      const stream: MediaStream =
        await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      logger.info(`录音使用 mimeType: ${mimeType ?? 'default'}`);

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
        const type = recorder.mimeType || 'audio/ogg';
        const blob: Blob | null =
          chunksRef.current.length > 0
            ? new Blob(chunksRef.current, { type })
            : null;
        stopResolveRef.current = null;
        cleanupStream();
        setIsRecording(false);
        if (resolve) {
          resolve(blob ? { blob, mimeType: type } : null);
        }
      };

      recorder.onerror = () => {
        setError('录音过程中发生错误');
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
    } catch (err: unknown) {
      const domError = err as { name?: string; message?: string };
      if (
        domError.name === 'NotAllowedError' ||
        domError.name === 'PermissionDeniedError'
      ) {
        setError('麦克风权限被拒绝，请在浏览器设置中允许使用麦克风');
      } else if (
        domError.name === 'NotFoundError' ||
        domError.name === 'DevicesNotFoundError'
      ) {
        setError('未检测到麦克风设备');
      } else {
        setError(domError.message || '无法开始录音');
      }
      cleanupStream();
      setIsRecording(false);
    }
  }, [isSupported, cleanupStream]);

  const stopRecording = React.useCallback(
    (): Promise<{ blob: Blob; mimeType: string } | null> => {
      return new Promise((resolve) => {
        if (
          !mediaRecorderRef.current ||
          mediaRecorderRef.current.state !== 'recording'
        ) {
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
      });
    },
    [],
  );

  return {
    isRecording,
    startRecording,
    stopRecording,
    isSupported,
    error,
  };
}
