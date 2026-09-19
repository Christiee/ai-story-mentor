import * as React from 'react';

interface UseSpeechSynthesisResult {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
  setVoiceIndex: (idx: number) => void;
  voices: SpeechSynthesisVoice[];
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const [isSupported, setIsSupported] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = React.useState(0);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);

      const zhVoices = available.filter((v) => v.lang.toLowerCase().includes('zh'));
      if (zhVoices.length === 0) {
        setVoiceIndex(0);
        return;
      }

      const preferredNames = ['female', 'Xiaoxiao', 'Tingting'];
      let preferredIndex = -1;

      for (const name of preferredNames) {
        const idx = zhVoices.findIndex((v) =>
          v.name.toLowerCase().includes(name.toLowerCase()),
        );
        if (idx !== -1) {
          preferredIndex = available.indexOf(zhVoices[idx]);
          break;
        }
      }

      if (preferredIndex === -1) {
        preferredIndex = available.indexOf(zhVoices[0]);
      }

      setVoiceIndex(Math.max(0, preferredIndex));
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = React.useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, [isSupported]);

  const speak = React.useCallback(
    (text: string) => {
      if (!isSupported || !text) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (voices[voiceIndex]) {
        utterance.voice = voices[voiceIndex];
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
    },
    [isSupported, voices, voiceIndex],
  );

  return {
    isSupported,
    isSpeaking,
    speak,
    cancel,
    setVoiceIndex,
    voices,
  };
}
