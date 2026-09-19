import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Volume2, VolumeX, Lock, Sparkles } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { childrenApi, scriptsApi, voiceApi } from '@client/src/api';
import { useAuth } from '@client/src/hooks/useAuth';
import { useAudioRecorder } from '@client/src/hooks/use-audio-recorder';
import { useSpeechSynthesis } from '@client/src/hooks/use-speech-synthesis';
import { generateQuickAnswers } from '@client/src/utils/quick-answers';
import ChatMessageList from './ChatMessageList';
import ChatInputArea from './ChatInputArea';
import AddChildModal from '@client/src/components/AddChildModal';
import type {
  ChildProfile,
  NarrativeStep,
  ScriptWork,
} from '@shared/api.interface';

const SILENT_AUDIO_DATA =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

interface ChatMessage {
  id: string;
  role: 'mentor' | 'child';
  content: string;
  audioUrl?: string;
  playFailed?: boolean;
}

const SOUND_KEY = 'storymentor_sound_on';

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, loading: authLoading, promptLogin } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      promptLogin();
    }
  }, [authLoading, isLoggedIn, promptLogin]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [script, setScript] = useState<ScriptWork | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<NarrativeStep>('protagonist');
  const [stepNumber, setStepNumber] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(SOUND_KEY);
    return saved !== 'false';
  });
  const [showTextInput, setShowTextInput] = useState(false);
  const [quickAnswers, setQuickAnswers] = useState<string[]>([]);
  const [spokenIds, setSpokenIds] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [asrError, setAsrError] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioUnlockRef = useRef(false);

  const unlockAudio = useCallback((): void => {
    if (audioUnlockRef.current) return;
    audioUnlockRef.current = true;
    setAudioUnlocked(true);
    try {
      const audio = new Audio(SILENT_AUDIO_DATA);
      audio.volume = 0;
      audio.play().catch(() => {});
    } catch {
      // 忽略
    }
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        const warmUp = new SpeechSynthesisUtterance('');
        warmUp.volume = 0;
        window.speechSynthesis.speak(warmUp);
      }
    } catch {
      // 忽略
    }
  }, []);

  const {
    isRecording,
    isSupported: recorderSupported,
    startRecording,
    stopRecording,
    error: recorderError,
    duration: recordDuration,
  } = useAudioRecorder();

  const {
    isSupported: browserTtsSupported,
    speak: browserSpeak,
    cancel: browserCancel,
  } = useSpeechSynthesis();

  const currentChild = children.find((c) => c.id === selectedChildId);

  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const stopAllAudio = useCallback((): void => {
    browserCancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, [browserCancel]);

  const playAudioUrl = useCallback((url: string, msgId?: string): void => {
    stopAllAudio();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err: unknown) => {
        logger.warn('音频播放失败（可能被自动播放策略拦截）', err);
        if (msgId) {
          setMessages((prev) =>
            prev.map((m: ChatMessage) =>
              m.id === msgId ? { ...m, playFailed: true } : m,
            ),
          );
        }
      });
    }
  }, [stopAllAudio]);

  const playMentorAudio = useCallback(
    (msg: ChatMessage): void => {
      if (!soundOn) return;
      if (spokenIds.has(msg.id)) return;

      if (browserTtsSupported) {
        const utterance = new SpeechSynthesisUtterance(msg.content);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        let started = false;
        const failTimer = window.setTimeout(() => {
          if (!started) {
            logger.warn('浏览器TTS超时未开始播放，标记为失败');
            setIsPlaying(false);
            setMessages((prev) =>
              prev.map((m: ChatMessage) =>
                m.id === msg.id ? { ...m, playFailed: true } : m,
              ),
            );
          }
        }, 2000);

        utterance.onstart = () => {
          started = true;
          window.clearTimeout(failTimer);
          setIsPlaying(true);
          setSpokenIds((prev) => new Set(prev).add(msg.id));
        };
        utterance.onend = () => {
          window.clearTimeout(failTimer);
          setIsPlaying(false);
        };
        utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
          window.clearTimeout(failTimer);
          logger.warn('浏览器TTS播放失败', e.error);
          setIsPlaying(false);
          setMessages((prev) =>
            prev.map((m: ChatMessage) =>
              m.id === msg.id ? { ...m, playFailed: true } : m,
            ),
          );
        };

        browserCancel();
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          window.clearTimeout(failTimer);
          logger.warn('浏览器TTS调用异常', err);
          setMessages((prev) =>
            prev.map((m: ChatMessage) =>
              m.id === msg.id ? { ...m, playFailed: true } : m,
            ),
          );
        }
        return;
      }

      if (msg.audioUrl) {
        playAudioUrl(msg.audioUrl, msg.id);
        setSpokenIds((prev) => new Set(prev).add(msg.id));
        return;
      }

      void (async () => {
        try {
          const res = await voiceApi.speechSynthesis(msg.content, {
            voiceGender: 'female',
            speed: '0.8',
          });
          if (res.audioUrl) {
            setMessages((prev) =>
              prev.map((m: ChatMessage) =>
                m.id === msg.id ? { ...m, audioUrl: res.audioUrl } : m,
              ),
            );
            playAudioUrl(res.audioUrl, msg.id);
            setSpokenIds((prev) => new Set(prev).add(msg.id));
          } else {
            throw new Error('无音频URL');
          }
        } catch (err) {
          logger.warn('插件TTS失败', err);
          setMessages((prev) =>
            prev.map((m: ChatMessage) =>
              m.id === msg.id ? { ...m, playFailed: true } : m,
            ),
          );
        }
      })();
    },
    [soundOn, spokenIds, browserTtsSupported, browserCancel, playAudioUrl],
  );

  const replayMessage = useCallback(
    (msg: ChatMessage): void => {
      if (!soundOn) {
        setSoundOn(true);
      }
      if (browserTtsSupported) {
        browserSpeak(msg.content);
      } else if (msg.audioUrl) {
        playAudioUrl(msg.audioUrl);
      } else {
        void playMentorAudio(msg);
      }
    },
    [soundOn, browserTtsSupported, browserSpeak, playAudioUrl, playMentorAudio],
  );

  const handleTapToPlay = useCallback(
    (msg: ChatMessage): void => {
      setMessages((prev) =>
        prev.map((m: ChatMessage) =>
          m.id === msg.id ? { ...m, playFailed: false } : m,
        ),
      );
      setSpokenIds((prev) => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
      playMentorAudio(msg);
    },
    [playMentorAudio],
  );

  useEffect(() => {
    const initPage = async (): Promise<void> => {
      try {
        setLoading(true);
        const res = await childrenApi.listChildren();
        const childList = res.items;
        setChildren(childList);

        if (childList.length === 0) {
          setShowAddChild(true);
          return;
        }

        const urlChildId = searchParams.get('childId');
        const targetChild = urlChildId
          ? childList.find((c) => c.id === urlChildId) || childList[0]
          : childList[0];
        setSelectedChildId(targetChild.id);
        await startNewScript(targetChild.id, targetChild);
       } catch (err) {
        logger.error('初始化创作页失败', err);
        setLoadError('初始化失败了，刷新一下试试吧');
      } finally {
        setLoading(false);
      }
    };
    void initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewScript = async (childId: string, child?: ChildProfile): Promise<void> => {
    try {
      setStarting(true);
      stopAllAudio();
      const scriptRes = await scriptsApi.startScript(childId);
      setScript(scriptRes);
      setCurrentStep('protagonist');
      setStepNumber(1);
      setIsComplete(false);
      setSpokenIds(new Set());
      setRecognizedText('');
      setAsrError(null);
      const childName = child?.name || '小朋友';
      const welcomeMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'mentor',
        content: `${childName}，你好呀！今天我们一起来造一个属于你自己的故事好不好？故事里的主角是谁呀？`,
      };
      setMessages([welcomeMsg]);
      setQuickAnswers(generateQuickAnswers('protagonist', scriptRes));
    } catch (err) {
      logger.error('创建剧本失败', err);
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async (text?: string): Promise<void> => {
    const content = (text ?? input).trim();
    if (!content || sending || !script || !selectedChildId) return;

    stopAllAudio();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'child',
      content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setRecognizedText('');
    setSending(true);

    try {
      const res = await scriptsApi.mentorChat({
        scriptId: script.id,
        childId: selectedChildId,
        childInput: content,
      });

      const mentorMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'mentor',
        content: res.mentorReply,
      };
      setMessages((prev) => [...prev, mentorMsg]);
      setCurrentStep(res.currentStep);
      setStepNumber(res.stepNumber);
      setIsComplete(res.isComplete);
      setQuickAnswers(
        generateQuickAnswers(res.currentStep, script ?? undefined),
      );

      if (res.isComplete) {
        setScript((s) => (s ? { ...s, status: 'completed' } : s));
      }
    } catch (err) {
      logger.error('发送消息失败', err);
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'mentor',
        content: '哎呀，导师刚才走神了，能再说一遍吗？',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleMicStart = async (): Promise<void> => {
    if (!recorderSupported || sending || isComplete || starting) return;
    stopAllAudio();
    setRecognizedText('');
    setAsrError(null);
    try {
      await startRecording();
      if (recorderError) {
        setAsrError(recorderError);
      }
    } catch (err) {
      logger.error('开始录音失败', err);
    }
  };

  const handleMicStop = async (): Promise<void> => {
    if (!isRecording) return;
    const result = await stopRecording();
    if (!result || result.blob.size < 500) {
      setAsrError('再按久一点哦，还没听清你说什么~');
      return;
    }

    setRecognizing(true);
    setAsrError(null);
    try {
      const res = await voiceApi.speechToText(result.blob, result.mimeType);
      const text = (res.text || '').trim();
      setRecognizedText(text);
      if (text) {
        void handleSend(text);
      } else {
        setAsrError('没听清你说什么，能再说一次吗？');
      }
    } catch (err: unknown) {
      logger.error('语音识别失败', err);
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        '识别失败了，再说一次试试？';
      setAsrError(errorMsg);
      setRecognizedText('');
    } finally {
      setRecognizing(false);
    }
  };

  const handleQuickAnswer = (answer: string): void => {
    if (sending || isComplete) return;
    void handleSend(answer);
  };

  const handleToggleSound = (): void => {
    unlockAudio();
    setSoundOn((prev) => !prev);
  };

  const handleRestart = async (): Promise<void> => {
    if (!selectedChildId) return;
    await startNewScript(selectedChildId, currentChild);
  };

  const handleViewBook = (): void => {
    if (script) {
      navigate(`/script/${script.id}`);
    }
  };

  const handleChildCreated = (child: { id: string; name: string }): void => {
    setShowAddChild(false);
    void childrenApi.listChildren().then((res) => {
      setChildren(res.items);
      setSelectedChildId(child.id);
      const childProfile = res.items.find((c) => c.id === child.id);
      void startNewScript(child.id, childProfile);
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRecording, recognizing, sending, scrollToBottom]);

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, String(soundOn));
    if (!soundOn) {
      stopAllAudio();
    }
  }, [soundOn, stopAllAudio]);

  useEffect(() => {
    if (!soundOn) return;
    const lastMentorMsg = [...messages]
      .reverse()
      .find((m: ChatMessage) => m.role === 'mentor');
    if (lastMentorMsg && !spokenIds.has(lastMentorMsg.id)) {
      playMentorAudio(lastMentorMsg);
    }
  }, [messages, soundOn, spokenIds, browserTtsSupported, playMentorAudio]);

  useEffect(() => {
    setQuickAnswers(generateQuickAnswers(currentStep, script ?? undefined));
  }, [currentStep, script]);

  if (loading || authLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-180px)] min-h-[560px] bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E1F5EE] animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-4 w-28 bg-[#e5e7eb] rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-[#E1F5EE] border-t-[#0F6E56] rounded-full animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-[#0F6E56]" />
            </div>
            <span className="text-[#085041] font-medium">故事导师正在赶来...</span>
            <span className="text-[#5f6368] text-sm">马上就能开始造故事啦</span>
          </div>
        </div>
        <div className="border-t border-[#e5e7eb] p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-[#E1F5EE]/50 animate-pulse" />
            <div className="h-5 w-32 bg-[#e5e7eb] rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[#E1F5EE] flex items-center justify-center mb-4">
          <Lock className="w-10 h-10 text-[#0F6E56]" />
        </div>
        <h2 className="text-xl font-bold text-[#1a1d1f] mb-2">登录后查看</h2>
        <p className="text-[#5f6368] mb-6 max-w-sm">
          登录后你的作品和成长数据会自动保存，换设备也能继续创作
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[#FCEBEB] flex items-center justify-center mb-4">
          <span className="text-3xl">😢</span>
        </div>
        <h2 className="text-xl font-bold text-[#1a1d1f] mb-2">哎呀，出了点小问题</h2>
        <p className="text-[#5f6368] mb-6 max-w-sm">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#0F6E56] hover:bg-[#085041] text-white font-medium px-6 py-2.5 rounded-xl transition-all"
        >
          刷新一下
        </button>
      </div>
    );
  }

  const childName = currentChild?.name || '宝贝';

  return (
    <div
      className="flex flex-col h-[calc(100vh-180px)] min-h-[560px]"
      onMouseDown={unlockAudio}
      onTouchStart={unlockAudio}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E1F5EE] to-[#0F6E56]/20 flex items-center justify-center text-lg flex-shrink-0">
            {currentChild?.avatar || '✨'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-[#5f6368]">
              {isComplete
                ? '故事完成啦！'
                : `第 ${stepNumber} 步 / 共 5 步`}
            </span>
            <span className="text-[15px] font-semibold text-[#085041]">
              {currentChild ? `${childName}的故事` : '创作中'}
            </span>
          </div>
        </div>
        <button
          onClick={handleToggleSound}
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
            soundOn
              ? 'bg-[#E1F5EE] border-[#0F6E56]/20 text-[#0F6E56]'
              : 'bg-white border-[#e5e7eb] text-[#5f6368] hover:bg-[#E1F5EE]/30'
          }`}
          title={soundOn ? '关闭声音' : '打开声音'}
        >
          {soundOn ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex-1 bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <ChatMessageList
          messages={messages}
          children={children}
          childName={childName}
          isListening={isRecording}
          recognizedText={recognizedText}
          transcript=""
          sending={sending}
          starting={starting}
          isComplete={isComplete}
          currentStep={currentStep}
          scriptId={script?.id}
          childAvatar={currentChild?.avatar}
          messagesEndRef={messagesEndRef}
          onReplayMessage={replayMessage}
          onTapToPlay={handleTapToPlay}
          onViewBook={handleViewBook}
          onRestart={handleRestart}
        />
        <ChatInputArea
          isRecording={isRecording}
          isAsrSupported={recorderSupported}
          recognizedText={recognizedText}
          transcript=""
          asrError={recorderError || asrError}
          sending={sending}
          starting={starting}
          input={input}
          showTextInput={showTextInput}
          quickAnswers={quickAnswers}
          duration={recordDuration}
          onMicStart={handleMicStart}
          onMicStop={handleMicStop}
          onInputChange={setInput}
          onSend={handleSend}
          onToggleTextInput={() => setShowTextInput((prev) => !prev)}
          onQuickAnswer={handleQuickAnswer}
        />
      </div>

      {!recorderSupported && (
        <div className="mt-3 text-center text-sm text-[#BA7517] bg-[#FAEEDA] rounded-xl py-2 px-3">
          你的浏览器不支持录音功能，请使用文字输入或快捷回答
        </div>
      )}

      <AddChildModal
        open={showAddChild}
        onClose={() => {
          setShowAddChild(false);
          navigate('/');
        }}
        onCreated={handleChildCreated}
        submitText="开始造故事"
      />
    </div>
  );
};

export default CreatePage;
