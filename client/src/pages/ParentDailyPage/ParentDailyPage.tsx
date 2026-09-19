import React, { useEffect, useState, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ChevronRight,
  TrendingUp,
  Calendar,
  Quote,
  BookOpen,
  AlertCircle,
  Lock,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@client/src/components/ui/empty';
import { useAuth } from '@client/src/hooks/useAuth';
import { childrenApi } from '@client/src/api';
import { dailyApi } from '@client/src/api';
import type { ChildProfile, ParentDaily, AbilityGrowth } from '@shared/api.interface';

const ABILITY_LABELS: Record<keyof AbilityGrowth, string> = {
  imagination: '想象力',
  expression: '表达力',
  logic: '逻辑力',
  curiosity: '好奇心',
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 ${weekdays[d.getDay()]}`;
};

const GrowthTags: React.FC<{ growth?: AbilityGrowth }> = ({ growth }) => {
  if (!growth) return null;
  const entries = (Object.keys(growth) as (keyof AbilityGrowth)[]).filter(
    (k) => growth[k] !== undefined && (growth[k] ?? 0) > 0,
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((key) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E1F5EE] text-[#085041]"
        >
          <TrendingUp className="w-3 h-3" />
          {ABILITY_LABELS[key]} +{growth[key]}
        </span>
      ))}
    </div>
  );
};

const ParentDailyPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading, promptLogin } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      promptLogin();
    }
  }, [authLoading, isLoggedIn, promptLogin]);

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [todayDaily, setTodayDaily] = useState<ParentDaily | null>(null);
  const [childName, setChildName] = useState<string>('');
  const [history, setHistory] = useState<ParentDaily[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadChildren = useCallback(async () => {
    try {
      const res = await childrenApi.listChildren();
      setChildren(res.items);
      if (res.items.length > 0 && !selectedChildId) {
        setSelectedChildId(res.items[0].id);
      }
    } catch (err) {
      logger.error('加载孩子列表失败', err);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [selectedChildId]);

  const loadToday = useCallback(async (childId: string) => {
    if (!childId) return;
    try {
      const res = await dailyApi.getTodayDaily(childId);
      setTodayDaily(res.daily ?? null);
      setChildName(res.childName);
    } catch (err) {
      logger.error('加载今日日报失败', err);
    }
  }, []);

  const loadHistory = useCallback(
    async (childId: string, pageNum: number, reset: boolean = false) => {
      if (!childId) return;
      setHistoryLoading(true);
      try {
        const res = await dailyApi.listDaily(childId, pageNum, 20);
        if (reset) {
          setHistory(res.items);
        } else {
          setHistory((prev) => [...prev, ...res.items]);
        }
        setPage(pageNum);
        setHasMore(pageNum * 20 < res.total);
      } catch (err) {
        logger.error('加载历史日报失败', err);
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (selectedChildId) {
      loadToday(selectedChildId);
      loadHistory(selectedChildId, 1, true);
    }
  }, [selectedChildId, loadToday, loadHistory]);

  const handleLoadMore = () => {
    if (!historyLoading && hasMore) {
      loadHistory(selectedChildId, page + 1, false);
    }
  };

  const handleChildChange = (value: string) => {
    setSelectedChildId(value);
    setTodayDaily(null);
    setHistory([]);
    setPage(1);
    setHasMore(false);
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#5f6368]">
        <AlertCircle className="w-12 h-12 mb-3 text-[#BA7517]" />
        <p className="mb-4">{error}</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyMedia variant="icon">
            <Sparkles />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>还没有孩子档案</EmptyTitle>
            <EmptyDescription>先去孩子端创建宝贝档案吧～</EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 孩子选择器 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#0F6E56]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#085041] leading-tight">亮点日报</h1>
            <p className="text-xs text-[#5f6368]">每天记录宝贝的闪亮时刻</p>
          </div>
        </div>
        <div className="w-40">
          <Select value={selectedChildId} onValueChange={handleChildChange}>
            <SelectTrigger className="w-full rounded-xl border-[#e5e7eb]">
              <SelectValue placeholder="选择宝贝" />
            </SelectTrigger>
            <SelectContent>
              {children.map((c: ChildProfile) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}（{c.age}岁）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 今日亮点卡片 */}
      {todayDaily ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e7eb]/60 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E1F5EE] rounded-full -translate-y-16 translate-x-16 opacity-60" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#E1F5EE] text-[#085041]">
                  今日亮点
                </span>
                <span className="text-xs text-[#5f6368] flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(todayDaily.reportDate)}
                </span>
              </div>
            </div>

            <p className="text-[#1a1d1f] text-lg font-medium leading-relaxed mb-4">
              {todayDaily.highlight}
            </p>

            {todayDaily.goldenQuote && (
              <div className="bg-[#FAEEDA] rounded-xl p-4 mb-4 relative">
                <Quote className="absolute top-2 left-3 w-6 h-6 text-[#BA7517] opacity-30" />
                <p className="text-[#1a1d1f] text-base italic pl-6 leading-relaxed">
                  "{todayDaily.goldenQuote}"
                </p>
                <p className="text-xs text-[#BA7517] mt-2 pl-6">—— {childName}说</p>
              </div>
            )}

            {todayDaily.abilityGrowth && (
              <div className="mb-4">
                <GrowthTags growth={todayDaily.abilityGrowth} />
              </div>
            )}

            {todayDaily.scriptId && (
              <button
                onClick={() => navigate(`/script/${todayDaily.scriptId}`)}
                className="inline-flex items-center gap-1 text-sm text-[#0F6E56] font-medium hover:text-[#085041] transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                查看关联作品
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-10 shadow-sm border border-[#e5e7eb]/60 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E1F5EE] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#0F6E56]" />
          </div>
          <p className="text-[#1a1d1f] font-medium mb-1">
            今天{childName || '宝贝'}还没开始创作哦～
          </p>
          <p className="text-sm text-[#5f6368]">等宝贝创作完，这里会出现今日亮点</p>
        </div>
      )}

      {/* 历史日报列表 */}
      <div>
        <h2 className="text-base font-semibold text-[#085041] mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          历史日报
        </h2>
        {history.length === 0 && !historyLoading ? (
          <Empty>
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Calendar />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>暂无历史日报</EmptyTitle>
                <EmptyDescription>每天的亮点都会记录在这里</EmptyDescription>
              </EmptyHeader>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((item: ParentDaily) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-[#e5e7eb]/60 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => item.scriptId && navigate(`/script/${item.scriptId}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#085041]">
                    {formatDate(item.reportDate)}
                  </span>
                  {item.scriptId && (
                    <ChevronRight className="w-4 h-4 text-[#5f6368]" />
                  )}
                </div>
                <p className="text-[#1a1d1f] text-sm leading-relaxed line-clamp-2 mb-2">
                  {item.highlight}
                </p>
                {item.goldenQuote && (
                  <div className="flex items-start gap-2 text-xs text-[#BA7517] bg-[#FAEEDA]/50 rounded-lg px-3 py-2">
                    <Quote className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" />
                    <span className="italic line-clamp-1">"{item.goldenQuote}"</span>
                  </div>
                )}
              </div>
            ))}

            {historyLoading && (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            )}

            {hasMore && !historyLoading && (
              <button
                onClick={handleLoadMore}
                className="py-3 text-sm text-[#0F6E56] font-medium hover:text-[#085041] transition-colors"
              >
                加载更多
              </button>
            )}

            {!hasMore && history.length > 0 && (
              <p className="text-center text-xs text-[#5f6368] py-2">
                已经到底啦～
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDailyPage;
