import * as React from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getVoiceConfig, speechToText } from '@client/src/api/voice';
import { useVoiceRecorder } from './useVoiceRecorder';
import type { VoiceConfigResponse } from '@shared/api.interface';

type EngineType = 'volcengine' | 'browser' | 'none';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  isSupported: boolean;
  engine: EngineType;
  error: string | null;
  resetTranscript: () => void;
}

function detectBrowserSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition,
  );
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [config, setConfig] = React.useState<VoiceConfigResponse | null>(null);
  const [engine, setEngine] = React.useState<EngineType>('none');
  const [isSupported, setIsSupported] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const browserListeningRef = React.useRef(false);
  const fallbackOnceRef = React.useRef(false);

  const {
    isRecording,
    startRecording,
    stopRecording,
    isSupported: recorderSupported,
    error: recorderError,
  } = useVoiceRecorder();

  // Initialize: fetch config and determine engine
  React.useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      try {
        const cfg = await getVoiceConfig();
        if (cancelled) return;
        setConfig(cfg);

        const browserSupported = detectBrowserSupport();
        const canVolcengine = cfg.asrEngine === 'volcengine' && recorderSupported;

        let chosen: EngineType = 'none';
        if (canVolcengine) {
          chosen = 'volcengine';
        } else if (browserSupported) {
          chosen = 'browser';
        }

        setEngine(chosen);
        setIsSupported(chosen !== 'none');
      } catch (err) {
        logger.error('加载语音配置失败，降级检测浏览器能力', err);
        if (cancelled) return;
        const browserSupported = detectBrowserSupport();
        setEngine(browserSupported ? 'browser' : 'none');
        setIsSupported(browserSupported);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [recorderSupported]);

  // Setup browser SpeechRecognition when engine is browser
  React.useEffect(() => {
    if (engine !== 'browser') return;

    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: typeof SpeechRecognition;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript((prev) => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error);
      browserListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (browserListeningRef.current) {
        try {
          recognition.start();
        } catch {
          browserListeningRef.current = false;
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      browserListeningRef.current = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [engine]);

  const resetTranscript = React.useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const startListening = React.useCallback(async (): Promise<void> => {
    setError(null);
    resetTranscript();

    if (engine === 'volcengine') {
      try {
        await startRecording();
        setIsListening(true);
      } catch (err) {
        setError(recorderError || '无法开始录音');
      }
      return;
    }

    if (engine === 'browser' && recognitionRef.current) {
      browserListeningRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        // already started
      }
    }
  }, [engine, startRecording, recorderError, resetTranscript]);

  const stopListening = React.useCallback(async (): Promise<string> => {
    setIsListening(false);

    // Volcengine mode: stop recording → send to API
    if (engine === 'volcengine') {
      const result = await stopRecording();
      if (!result || result.blob.size === 0) {
        setError('未录制到音频');
        return '';
      }

      try {
        const asrResult = await speechToText(result.blob, result.mimeType);
        setTranscript(asrResult.text);
        fallbackOnceRef.current = false;
        return asrResult.text;
      } catch (err) {
        logger.error('火山引擎 ASR 失败', err);

        // Single-session fallback to browser mode
        if (!fallbackOnceRef.current && detectBrowserSupport()) {
          logger.info('火山引擎 ASR 失败，本次降级为浏览器原生识别');
          fallbackOnceRef.current = true;
          setError('语音服务暂不可用，已切换为浏览器识别模式');

          // Switch to browser for this session
          setEngine('browser');
          // Return empty since we can't retroactively recognize the blob
          // The caller should retry if they want browser recognition
          return '';
        }

        setError('语音识别失败，请重试');
        return '';
      }
    }

    // Browser mode: stop recognition and return accumulated transcript
    if (engine === 'browser' && recognitionRef.current) {
      browserListeningRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      const finalText = transcript + interimTranscript;
      return finalText.trim();
    }

    return '';
  }, [engine, stopRecording, transcript, interimTranscript]);

  return {
    isListening: isListening || isRecording,
    transcript: transcript + interimTranscript,
    startListening,
    stopListening,
    isSupported,
    engine,
    error,
    resetTranscript,
  };
}
