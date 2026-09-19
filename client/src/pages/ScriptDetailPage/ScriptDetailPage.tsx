import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sparkles,
  Star,
  Quote,
  Lightbulb,
  Target,
  Shield,
  Wand2,
  PartyPopper,
  Brain,
  MessageCircle,
  Puzzle,
  Compass,
  Film,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { scriptsApi, voiceApi } from '@client/src/api';
import { useAuth } from '@client/src/hooks/useAuth';
import type {
  ScriptDetailResponse,
  ScriptWork,
  ScriptPage,
  AbilityScores,
} from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

const ScriptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isLoggedIn } = useAuth();

  const [data, setData] = useState<ScriptDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [autoPlayMode, setAutoPlayMode] = useState(false);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    loadDetail();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, data]);

  const loadDetail = async (): Promise<void> => {
    if (!id) return;
    try {
      setLoading(true);
      if (isLoggedIn) {
        try {
          const res = await scriptsApi.getScriptDetail(id);
          setData(res);
          if (res.script.audioUrl) {
            setAudioUrl(res.script.audioUrl);
          }
          return;
        } catch (ownErr) {
          if (isAxiosError(ownErr) && ownErr.response?.status === 404) {
            const publicRes = await scriptsApi.getExampleScriptDetail(id);
            setData(publicRes);
            if (publicRes.script.audioUrl) {
              setAudioUrl(publicRes.script.audioUrl);
            }
            return;
          }
          throw ownErr;
        }
      }
      const res = await scriptsApi.getExampleScriptDetail(id);
      setData(res);
      if (res.script.audioUrl) {
        setAudioUrl(res.script.audioUrl);
      }
    } catch (err) {
      if (!isLoggedIn && isAxiosError(err) && err.response?.status === 404) {
        logger.error('示例作品不存在', err);
        setData(null);
      } else {
        logger.error('加载剧本详情失败', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const pages = data?.pages ?? [];
  const script = data?.script;

  const goToPrev = (): void => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleGenerateAudio = async (): Promise<void> => {
    if (!script) return;
    try {
      setGeneratingAudio(true);
      const fullText = [
        script.title,
        pages
          .map((p: ScriptPage, i: number) => `第${i + 1}页。${p.content}`)
          .join(' '),
      ].join('。');
      const res = await voiceApi.speechSynthesis(fullText, {
        voiceGender: 'female',
        speed: '0.8',
      });
      if (res.audioUrl) {
        setAudioUrl(res.audioUrl);
      } else {
        toast('语音服务未配置，无法生成完整配音。单句朗读功能仍然可用。');
      }
    } catch (err) {
      logger.error('生成配音失败', err);
    } finally {
      setGeneratingAudio(false);
    }
  };

  const togglePlay = (): void => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => undefined);
    }
    setIsPlaying(!isPlaying);
  };

  const goToNext = useCallback((): void => {
    if (pages.length > 0 && currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, pages.length]);

  const handleAutoPlayToggle = (): void => {
    if (autoPlayMode) {
      setAutoPlayMode(false);
      stopAllAudio();
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    } else {
      if (!audioUrl) {
        toast('正在生成配音，稍等一下哦~');
        void handleGenerateAudio();
      }
      setAutoPlayMode(true);
      setCurrentPage(0);
      if (audioUrl && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          logger.warn('视频模式音频播放被拦截，需要用户交互');
        });
      }
    }
  };

  const stopAllAudio = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    if (!autoPlayMode) return;
    if (currentPage >= pages.length - 1) {
      setAutoPlayMode(false);
      return;
    }
    const readTime = Math.max(3500, pages[currentPage]?.content.length * 120 || 3500);
    autoPlayTimerRef.current = setTimeout(() => {
      setCurrentPage((prev) => Math.min(prev + 1, pages.length - 1));
    }, readTime);
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [autoPlayMode, currentPage, pages]);

  const abilityScores: AbilityScores = script?.abilityScores ?? {
    imagination: 0,
    expression: 0,
    logic: 0,
    curiosity: 0,
  };

  const abilities: {
    key: keyof AbilityScores;
    label: string;
    icon: typeof Brain;
    color: string;
  }[] = [
    { key: 'imagination', label: '想象力', icon: Sparkles, color: '#BA7517' },
    { key: 'expression', label: '表达力', icon: MessageCircle, color: '#0F6E56' },
    { key: 'logic', label: '逻辑力', icon: Puzzle, color: '#085041' },
    { key: 'curiosity', label: '好奇心', icon: Compass, color: '#BA7517' },
  ];

  const fiveElements: {
    key: string;
    label: string;
    icon: typeof Lightbulb;
    value: string;
    color: string;
    bgColor: string;
  }[] = script
    ? [
        {
          key: 'protagonist',
          label: '主角',
          icon: Star,
          value: script.protagonist,
          color: '#BA7517',
          bgColor: '#FAEEDA',
        },
        {
          key: 'wish',
          label: '愿望',
          icon: Target,
          value: script.wish,
          color: '#0F6E56',
          bgColor: '#E1F5EE',
        },
        {
          key: 'difficulty',
          label: '困难',
          icon: Shield,
          value: script.difficulty,
          color: '#A32D2D',
          bgColor: '#FCEBEB',
        },
        {
          key: 'solution',
          label: '办法',
          icon: Wand2,
          value: script.solution,
          color: '#085041',
          bgColor: '#E1F5EE',
        },
        {
          key: 'ending',
          label: '结局',
          icon: PartyPopper,
          value: script.ending,
          color: '#BA7517',
          bgColor: '#FAEEDA',
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#E1F5EE] border-t-[#0F6E56] rounded-full animate-spin" />
          <span className="text-[#5f6368] text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#e5e7eb] text-center">
        <p className="text-[#5f6368]">作品不存在或已被删除</p>
      </div>
    );
  }

  const currentPageData: ScriptPage | undefined = pages[currentPage];

  return (
    <div className="space-y-6 pb-28">
      {/* 顶部 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-white border border-[#e5e7eb] flex items-center justify-center hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-[#1a1d1f]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-[#085041] truncate">
            {script.title || '未命名故事'}
          </h1>
          <p className="text-sm text-[#5f6368]">
            {new Date(script.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      {/* 金句 */}
      {script.goldenQuote && (
        <div className="bg-[#FAEEDA] rounded-2xl p-5 border border-[#BA7517]/10">
          <div className="flex items-start gap-3">
            <Quote className="w-6 h-6 text-[#BA7517] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-[#BA7517] font-medium mb-1">
                故事金句
              </div>
              <p className="text-[#1a1d1f] font-medium leading-relaxed italic">
                "{script.goldenQuote}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 绘本展示 */}
      {pages.length > 0 && currentPageData && (
        <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-sm">
          <div className="relative bg-[#f5f5f0]">
            {currentPageData.imageUrl ? (
              <Image
                src={currentPageData.imageUrl}
                alt={`第${currentPage + 1}页插图`}
                className="w-full object-contain max-h-[60vh] mx-auto transition-opacity duration-500"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const sibling = target.nextElementSibling as HTMLElement | null;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`aspect-[4/3] md:aspect-[16/9] w-full bg-gradient-to-br from-[#E1F5EE] via-[#FAEEDA] to-[#E1F5EE] items-center justify-center ${
                currentPageData.imageUrl ? 'hidden' : 'flex'
              }`}
            >
              <div className="text-center px-8">
                <div className="text-6xl md:text-8xl mb-4 opacity-30">
                  {currentPage % 2 === 0 ? '🌟' : '📖'}
                </div>
                <div className="text-[#085041]/40 text-sm">第 {currentPage + 1} 页插图</div>
              </div>
            </div>
            {autoPlayMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0F6E56] text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                绘本视频播放中
              </div>
            )}
            {/* 翻页按钮 */}
            <button
              onClick={goToPrev}
              disabled={currentPage === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 backdrop-blur shadow-md flex items-center justify-center hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-6 h-6 text-[#085041]" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentPage === pages.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 backdrop-blur shadow-md flex items-center justify-center hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-6 h-6 text-[#085041]" />
            </button>
          </div>
          <div className="p-6 md:p-8">
            <p className="text-lg md:text-xl text-[#1a1d1f] leading-loose text-center whitespace-pre-line">
              {currentPageData.content}
            </p>
          </div>
          {/* 页码 */}
          <div className="flex items-center justify-center gap-2 pb-6">
            {pages.map((_p: ScriptPage, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentPage
                    ? 'w-6 bg-[#0F6E56]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 五要素展示 */}
      <section>
        <h2 className="text-lg font-bold text-[#1a1d1f] mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#BA7517]" />
          故事五要素
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {fiveElements.map(
            (elem: {
              key: string;
              label: string;
              icon: typeof Lightbulb;
              value: string;
              color: string;
              bgColor: string;
            }) => (
              <div
                key={elem.key}
                className="bg-white rounded-2xl p-4 border border-[#e5e7eb]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: elem.bgColor }}
                >
                  <elem.icon
                    className="w-5 h-5"
                    style={{ color: elem.color }}
                  />
                </div>
                <div className="text-xs text-[#5f6368] mb-1">{elem.label}</div>
                <div className="text-sm font-medium text-[#1a1d1f] line-clamp-3">
                  {elem.value || '—'}
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* 能力评分 */}
      <section>
        <h2 className="text-lg font-bold text-[#1a1d1f] mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-[#BA7517] fill-[#BA7517]" />
          能力点亮
        </h2>
        <div className="bg-white rounded-2xl p-5 border border-[#e5e7eb]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {abilities.map(
              (ab: {
                key: keyof AbilityScores;
                label: string;
                icon: typeof Brain;
                color: string;
              }) => {
                const score = abilityScores[ab.key] || 0;
                const stars = Math.max(0, Math.min(5, Math.round(score)));
                return (
                  <div key={ab.key} className="text-center">
                    <div
                      className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: `${ab.color}15` }}
                    >
                      <ab.icon
                        className="w-6 h-6"
                        style={{ color: ab.color }}
                      />
                    </div>
                    <div className="text-sm font-medium text-[#1a1d1f] mb-1">
                      {ab.label}
                    </div>
                    <div className="flex justify-center gap-0.5">
                      {Array.from({ length: 5 }).map((_v, i: number) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < stars ? 'fill-[#BA7517] text-[#BA7517]' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* 底部播放条 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e7eb] shadow-lg z-40 pb-safe">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          {/* 绘本视频按钮 */}
          <button
            onClick={handleAutoPlayToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              autoPlayMode
                ? 'bg-[#BA7517] text-white'
                : 'bg-[#FAEEDA] text-[#BA7517] hover:bg-[#f5e0bc]'
            }`}
          >
            <Film className="w-4 h-4" />
            {autoPlayMode ? '播放中...' : '绘本视频'}
          </button>

          <div className="h-6 w-px bg-[#e5e7eb] flex-shrink-0" />

          {/* 翻页快进 */}
          <button
            onClick={goToPrev}
            disabled={currentPage === 0}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#5f6368] hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <span className="text-sm text-[#5f6368] min-w-[60px] text-center">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            onClick={goToNext}
            disabled={currentPage === pages.length - 1}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#5f6368] hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-[180px] flex items-center gap-3">
            {audioUrl ? (
              <>
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-[#0F6E56] hover:bg-[#085041] text-white flex items-center justify-center flex-shrink-0 transition-all"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#1a1d1f] mb-1">
                    故事配音
                  </div>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    className="w-full h-6"
                    onEnded={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-[#FAEEDA] flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-[#BA7517] ml-0.5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#1a1d1f]">
                    故事配音
                  </div>
                  <div className="text-xs text-[#5f6368]">
                    让导师把故事读给你听
                  </div>
                </div>
                <button
                  onClick={handleGenerateAudio}
                  disabled={generatingAudio}
                  className="px-4 py-2 rounded-xl bg-[#0F6E56] hover:bg-[#085041] text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {generatingAudio ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      生成中
                    </>
                  ) : (
                    '生成配音'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptDetailPage;
