import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Sparkles,
  MessageCircle,
  HelpCircle,
  BookOpen,
  Star,
  Heart,
  AlertCircle,
  Lock,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
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
import { childrenApi, radarApi, badgesApi } from '@client/src/api';
import type {
  ChildProfile,
  AbilityRadarRecord,
  AchievementBadge,
  AbilityGrowth,
} from '@shared/api.interface';

interface BadgeMeta {
  type: string;
  name: string;
  description: string;
  icon: typeof Award;
  color: string;
  bgColor: string;
}

const BADGE_METAS: BadgeMeta[] = [
  {
    type: 'first_work',
    name: '初出茅庐',
    description: '完成第一个剧本作品',
    icon: Sparkles,
    color: '#0F6E56',
    bgColor: '#E1F5EE',
  },
  {
    type: 'imagination_star',
    name: '想象力之星',
    description: '展现出丰富的想象力',
    icon: Star,
    color: '#BA7517',
    bgColor: '#FAEEDA',
  },
  {
    type: 'brave_expression',
    name: '勇敢表达',
    description: '大胆说出自己的想法',
    icon: MessageCircle,
    color: '#5B7FDB',
    bgColor: '#E8EEFB',
  },
  {
    type: 'curious_questioner',
    name: '会提问',
    description: '充满好奇心，爱思考',
    icon: HelpCircle,
    color: '#A66BBF',
    bgColor: '#F2E5F7',
  },
  {
    type: 'story_master',
    name: '故事大师',
    description: '完成5个以上作品',
    icon: BookOpen,
    color: '#085041',
    bgColor: '#D0EAE0',
  },
  {
    type: 'perfect_ending',
    name: '完美结局',
    description: '创作一个圆满温暖的结局',
    icon: Heart,
    color: '#D97A6A',
    bgColor: '#F9E2DD',
  },
];

const ABILITY_KEYS: (keyof AbilityGrowth)[] = [
  'imagination',
  'expression',
  'logic',
  'curiosity',
];

const ABILITY_LABELS: Record<keyof AbilityGrowth, string> = {
  imagination: '想象力',
  expression: '表达力',
  logic: '逻辑力',
  curiosity: '好奇心',
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

interface GrowthRowProps {
  label: string;
  current: number;
  prev?: number;
}

const GrowthRow: React.FC<GrowthRowProps> = ({ label, current, prev }) => {
  const diff = prev !== undefined ? current - prev : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;
  const isFlat = diff === 0 && prev !== undefined;

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#e5e7eb]/60 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-[#0F6E56]" />
        </div>
        <span className="text-sm font-medium text-[#1a1d1f]">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-[#085041]">{current}</span>
        {prev !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              isUp
                ? 'bg-[#E1F5EE] text-[#0F6E56]'
                : isDown
                ? 'bg-[#FAEEDA] text-[#BA7517]'
                : 'bg-[#f6f7f9] text-[#5f6368]'
            }`}
          >
            {isUp && <TrendingUp className="w-3 h-3" />}
            {isDown && <TrendingDown className="w-3 h-3" />}
            {isFlat && <Minus className="w-3 h-3" />}
            {isUp ? `+${diff}` : isDown ? `${diff} 继续加油` : '持平'}
          </span>
        )}
      </div>
    </div>
  );
};

interface BadgeCardProps {
  meta: BadgeMeta;
  unlocked?: AchievementBadge;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ meta, unlocked }) => {
  const isUnlocked = !!unlocked;

  return (
    <div
      className={`rounded-xl p-4 text-center border transition-all ${
        isUnlocked
          ? 'bg-white border-[#e5e7eb]/60 shadow-sm hover:shadow-md'
          : 'bg-[#f9fafb] border-[#e5e7eb]/30 opacity-70'
      }`}
    >
      <div
        className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${
          isUnlocked ? '' : 'bg-[#e5e7eb]'
        }`}
        style={isUnlocked ? { backgroundColor: meta.bgColor } : {}}
      >
        {isUnlocked ? (
          <meta.icon
            className="w-7 h-7"
            style={{ color: meta.color }}
          />
        ) : (
          <Lock className="w-6 h-6 text-[#9ca3af]" />
        )}
      </div>
      <div
        className={`text-sm font-semibold mb-1 ${
          isUnlocked ? 'text-[#1a1d1f]' : 'text-[#9ca3af]'
        }`}
      >
        {meta.name}
      </div>
      <div className="text-xs text-[#5f6368] mb-2 leading-relaxed">
        {meta.description}
      </div>
      {isUnlocked && unlocked?.unlockedAt && (
        <div className="text-[11px] text-[#BA7517] flex items-center justify-center gap-1">
          <Award className="w-3 h-3" />
          {formatDate(unlocked.unlockedAt)} 获得
        </div>
      )}
      {!isUnlocked && (
        <div className="text-[11px] text-[#9ca3af]">未解锁</div>
      )}
    </div>
  );
};

const ParentRadarPage: React.FC = () => {
  const { isLoggedIn, loading: authLoading, promptLogin } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      promptLogin();
    }
  }, [authLoading, isLoggedIn, promptLogin]);

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [current, setCurrent] = useState<AbilityRadarRecord | null>(null);
  const [previous, setPrevious] = useState<AbilityRadarRecord | null>(null);
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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

  const loadRadar = useCallback(async (childId: string) => {
    if (!childId) return;
    try {
      const res = await radarApi.getLatestRadar(childId);
      setCurrent(res.current ?? null);
      setPrevious(res.previous ?? null);
    } catch (err) {
      logger.error('加载能力雷达失败', err);
    }
  }, []);

  const loadBadges = useCallback(async (childId: string) => {
    if (!childId) return;
    try {
      const res = await badgesApi.listBadges(childId);
      setBadges(res.items || []);
    } catch (err) {
      logger.error('加载徽章失败', err);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (selectedChildId) {
      setLoading(true);
      Promise.all([loadRadar(selectedChildId), loadBadges(selectedChildId)]).finally(() =>
        setLoading(false),
      );
    }
  }, [selectedChildId, loadRadar, loadBadges]);

  const handleChildChange = (value: string) => {
    setSelectedChildId(value);
    setCurrent(null);
    setPrevious(null);
    setBadges([]);
  };

  const radarOption = useMemo<EChartsOption>(() => {
    const indicators = ABILITY_KEYS.map((k) => ({ name: ABILITY_LABELS[k] }));
    const currentData = current
      ? ABILITY_KEYS.map((k) => current[k] ?? 0)
      : [];
    const previousData = previous
      ? ABILITY_KEYS.map((k) => previous[k] ?? 0)
      : [];

    const seriesData: {
      value: number[];
      name: string;
      areaStyle: { color: string };
      lineStyle: { color: string; width: number; type?: 'solid' | 'dashed' | 'dotted' };
      itemStyle: { color: string };
    }[] = [
      {
        value: currentData,
        name: '当前',
        areaStyle: { color: 'rgba(15, 110, 86, 0.25)' },
        lineStyle: { color: '#0F6E56', width: 2 },
        itemStyle: { color: '#0F6E56' },
      },
    ];

    if (previousData.length > 0) {
      seriesData.push({
        value: previousData,
        name: '上次',
        areaStyle: { color: 'rgba(186, 117, 23, 0.15)' },
        lineStyle: { color: '#BA7517', width: 1.5, type: 'dashed' },
        itemStyle: { color: '#BA7517' },
      });
    }

    return {
      tooltip: { trigger: 'item' },
      legend: {
        bottom: 0,
        type: 'scroll',
        icon: 'circle',
        textStyle: { fontSize: 12 },
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        center: ['50%', '50%'],
        radius: '65%',
        splitNumber: 4,
        axisName: {
          color: '#1a1d1f',
          fontSize: 13,
          fontWeight: 500,
        },
        splitLine: {
          lineStyle: { color: '#e5e7eb' },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(225, 245, 238, 0.3)', 'rgba(225, 245, 238, 0.1)'],
          },
        },
        axisLine: {
          lineStyle: { color: '#e5e7eb' },
        },
      },
      series: [{ type: 'radar', data: seriesData }],
    };
  }, [current, previous]);

  if (authLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
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

  if (loading && children.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
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
            <BarChart3 />
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
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#0F6E56]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#085041] leading-tight">成长雷达</h1>
            <p className="text-xs text-[#5f6368]">和过去的自己比，每天都在进步</p>
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

      {/* 雷达图 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e7eb]/60">
        <h2 className="text-base font-semibold text-[#085041] mb-2">四维能力雷达</h2>
        <p className="text-xs text-[#5f6368] mb-4">
          只和宝贝自己比，看见每一点成长 🌱
        </p>
        {current ? (
          <ReactECharts
            option={radarOption}
            theme="ud"
            className="h-[340px] w-full"
          />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-[#5f6368] text-sm">
            暂无能力数据，等宝贝创作后再来看看吧～
          </div>
        )}
      </div>

      {/* 能力成长解读 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e7eb]/60">
        <h2 className="text-base font-semibold text-[#085041] mb-1">能力成长解读</h2>
        <p className="text-xs text-[#5f6368] mb-4">
          {current?.recordedAt ? `更新于 ${formatDate(current.recordedAt)}` : ''}
        </p>
        {current ? (
          <div>
            {ABILITY_KEYS.map((key) => (
              <GrowthRow
                key={key}
                label={ABILITY_LABELS[key]}
                current={current[key] ?? 0}
                prev={previous?.[key]}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[#5f6368] text-sm">
            暂无能力数据
          </div>
        )}
      </div>

      {/* 成就徽章墙 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e7eb]/60">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#085041]">成就徽章</h2>
            <p className="text-xs text-[#5f6368]">
              已获得 {badges.length} / {BADGE_METAS.length} 枚徽章
            </p>
          </div>
          <Award className="w-5 h-5 text-[#BA7517]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BADGE_METAS.map((meta) => {
            const unlocked = badges.find(
              (b: AchievementBadge) => b.badgeType === meta.type,
            );
            return <BadgeCard key={meta.type} meta={meta} unlocked={unlocked} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default ParentRadarPage;
