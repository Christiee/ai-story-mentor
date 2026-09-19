import React, { useEffect, useState, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Star,
  Calendar,
  ChevronRight,
  Quote,
  Sparkles,
  AlertCircle,
  User,
  Heart,
  Shield,
  Lightbulb,
  Flag,
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
import { childrenApi, scriptsApi } from '@client/src/api';
import type { ChildProfile, ScriptWork } from '@shared/api.interface';

interface FiveElementsProps {
  script: ScriptWork;
}

const FiveElements: React.FC<FiveElementsProps> = ({ script }) => {
  const items = [
    { icon: User, label: '主角', value: script.protagonist, color: 'text-[#0F6E56]' },
    { icon: Star, label: '愿望', value: script.wish, color: 'text-[#BA7517]' },
    { icon: Shield, label: '困难', value: script.difficulty, color: 'text-[#A32D2D]' },
    { icon: Lightbulb, label: '办法', value: script.solution, color: 'text-[#0F6E56]' },
    { icon: Flag, label: '结局', value: script.ending, color: 'text-[#BA7517]' },
  ];

  return (
    <div className="grid grid-cols-5 gap-1 text-center">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-1">
          <div className={`w-7 h-7 rounded-lg bg-[#f6f7f9] flex items-center justify-center`}>
            <it.icon className={`w-3.5 h-3.5 ${it.color}`} />
          </div>
          <span className="text-[10px] text-[#5f6368]">{it.label}</span>
        </div>
      ))}
    </div>
  );
};

interface WorkCardProps {
  script: ScriptWork;
  onClick: () => void;
}

const GRADIENT_COLORS = [
  'from-[#0F6E56] to-[#2E9F7F]',
  'from-[#BA7517] to-[#E09B3A]',
  'from-[#5B7FDB] to-[#8BA7EC]',
  'from-[#A66BBF] to-[#C992D9]',
  'from-[#D97A6A] to-[#EBA798]',
  'from-[#4C9A8F] to-[#7DBFB3]',
];

const WorkCard: React.FC<WorkCardProps> = ({ script, onClick }) => {
  const colorIndex =
    Math.abs(
      script.title.split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0),
    ) % GRADIENT_COLORS.length;

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-[#e5e7eb]/60 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* 封面 */}
      <div
        className={`h-32 bg-gradient-to-br ${GRADIENT_COLORS[colorIndex]} relative flex items-center justify-center overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-20">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${30 + i * 15}px`,
                height: `${30 + i * 15}px`,
                left: `${10 + i * 18}%`,
                top: `${20 + (i % 3) * 25}%`,
                opacity: 0.3 - i * 0.05,
              }}
            />
          ))}
        </div>
        <div className="relative text-center px-4">
          <div className="text-white/90 text-xs font-medium mb-1">
            {script.protagonist}
          </div>
          <div className="text-white text-lg font-bold leading-tight line-clamp-2">
            {script.title}
          </div>
        </div>
        <Sparkles className="absolute top-3 right-3 w-4 h-4 text-white/60" />
      </div>

      {/* 内容 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[#5f6368] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(script.createdAt)}
          </span>
          <span className="text-xs text-[#5f6368] flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {script.totalPages}页
          </span>
        </div>

        <FiveElements script={script} />

        {script.goldenQuote && (
          <div className="mt-3 pt-3 border-t border-[#e5e7eb]/60 flex items-start gap-2">
            <Quote className="w-3.5 h-3.5 text-[#BA7517] shrink-0 mt-0.5" />
            <p className="text-xs text-[#5f6368] italic line-clamp-2">
              "{script.goldenQuote}"
            </p>
          </div>
        )}

        <button className="mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-lg text-sm text-[#0F6E56] font-medium bg-[#E1F5EE]/50 group-hover:bg-[#E1F5EE] transition-colors">
          查看详情
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ParentWorksPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading, promptLogin } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      promptLogin();
    }
  }, [authLoading, isLoggedIn, promptLogin]);

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [works, setWorks] = useState<ScriptWork[]>([]);
  const [total, setTotal] = useState<number>(0);
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

  const loadWorks = useCallback(async (childId: string) => {
    if (!childId) return;
    setLoading(true);
    try {
      const res = await scriptsApi.listScripts(childId, 'completed', 1, 50);
      setWorks(res.items);
      setTotal(res.total);
    } catch (err) {
      logger.error('加载作品列表失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (selectedChildId) {
      loadWorks(selectedChildId);
    }
  }, [selectedChildId, loadWorks]);

  const handleChildChange = (value: string) => {
    setSelectedChildId(value);
    setWorks([]);
    setTotal(0);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
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

  if (loading && children.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
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
            <BookOpen />
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
            <BookOpen className="w-5 h-5 text-[#0F6E56]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#085041] leading-tight">作品墙</h1>
            <p className="text-xs text-[#5f6368]">
              共 <span className="font-semibold text-[#0F6E56]">{total}</span> 个作品
            </p>
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

      {/* 作品网格 */}
      {works.length === 0 && !loading ? (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Heart />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>宝贝还没有作品呢</EmptyTitle>
              <EmptyDescription>期待第一个故事！</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {works.map((script: ScriptWork) => (
            <WorkCard
              key={script.id}
              script={script}
              onClick={() => navigate(`/script/${script.id}`)}
            />
          ))}
        </div>
      )}

      {loading && works.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentWorksPage;
