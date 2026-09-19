import * as React from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getVoiceConfig, speechSynthesis } from '@client/src/api/voice';
import type { VoiceConfigResponse } from '@shared/api.interface';

type EngineType = 'volcengine' | 'browser' | 'none';

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSupported: boolean;
  engine: EngineType;
  error: string | null;
  audioElement: HTMLAudioElement | null;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [config, setConfig] = React.useState<VoiceConfigResponse | null>(null);
  const [engine, setEngine] = React.useState<EngineType>('none');
  const [isSupported, setIsSupported] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const fallbackOnceRef = React.useRef(false);
  const objectUrlRef = React.useRef<string | null>(null);

  // Initialize audio element
  React.useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handlePlay = (): void => {
      setIsSpeaking(true);
    };
    const handleEnded = (): void => {
      setIsSpeaking(false);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    const handleError = (): void => {
      setIsSpeaking(false);
      setError('音频播放失败');
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      audioRef.current = null;
    };
  }, []);

  // Initialize: fetch config and determine engine
  React.useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      try {
        const cfg = await getVoiceConfig();
        if (cancelled) return;
        setConfig(cfg);

        const browserSupported =
          typeof window !== 'undefined' &&
          Boolean(window.speechSynthesis);

        let chosen: EngineType = 'none';
        if (cfg.ttsEngine === 'volcengine') {
          chosen = 'volcengine';
        } else if (browserSupported) {
          chosen = 'browser';
        }

        setEngine(chosen);
        setIsSupported(chosen !== 'none');
      } catch (err) {
        logger.error('加载语音配置失败，降级检测浏览器能力', err);
        if (cancelled) return;
        const browserSupported =
          typeof window !== 'undefined' &&
          Boolean(window.speechSynthesis);
        setEngine(browserSupported ? 'browser' : 'none');
        setIsSupported(browserSupported);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const stop = React.useCallback(() => {
    setError(null);

    // Stop volcengine audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // Stop browser synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speakBrowser = React.useCallback((text: string): void => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a Chinese voice
    const voices = window.speechSynthesis.getVoices();
    const zhVoices = voices.filter((v) =>
      v.lang.toLowerCase().includes('zh'),
    );
    if (zhVoices.length > 0) {
      utterance.voice = zhVoices[0];
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = React.useCallback(
    async (text: string): Promise<void> => {
      setError(null);

      if (!text || !isSupported) return;

      stop();

      // Volcengine mode
      if (engine === 'volcengine') {
        try {
          const result = await speechSynthesis(text);
          fallbackOnceRef.current = false;

          if (audioRef.current && result.audioUrl) {
            audioRef.current.src = result.audioUrl;
            await audioRef.current.play();
          }
          return;
        } catch (err) {
          logger.error('火山引擎 TTS 失败', err);

          // Single-session fallback to browser
          if (
            !fallbackOnceRef.current &&
            typeof window !== 'undefined' &&
            window.speechSynthesis
          ) {
            logger.info('火山引擎 TTS 失败，本次降级为浏览器原生合成');
            fallbackOnceRef.current = true;
            setError('语音服务暂不可用，已切换为浏览器朗读模式');
            speakBrowser(text);
            return;
          }

          setError('语音合成失败，请重试');
          return;
        }
      }

      // Browser mode
      if (engine === 'browser') {
        speakBrowser(text);
      }
    },
    [engine, isSupported, stop, speakBrowser],
  );

  return {
    isSpeaking,
    speak,
    stop,
    isSupported,
    engine,
    error,
    audioElement: audioRef.current,
  };
}
