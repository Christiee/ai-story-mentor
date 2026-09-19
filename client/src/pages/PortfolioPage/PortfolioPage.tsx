import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, Filter, Lock, User, Plus } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { useAuth } from '@client/src/hooks/useAuth';
import { childrenApi, scriptsApi } from '@client/src/api';
import type { ScriptWork, ChildProfile } from '@shared/api.interface';
import AddChildModal from '@client/src/components/AddChildModal';

type FilterType = 'all' | 'completed' | 'draft';

const PortfolioPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading, promptLogin } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      promptLogin();
    }
  }, [authLoading, isLoggedIn, promptLogin]);

  const [scripts, setScripts] = useState<ScriptWork[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const childrenRes = await childrenApi.listChildren();
      const childList = childrenRes.items;
      setChildren(childList);

      if (childList.length > 0) {
        const targetId = selectedChildId && childList.some((c) => c.id === selectedChildId)
          ? selectedChildId
          : childList[0].id;
        if (!selectedChildId) setSelectedChildId(targetId);
        const res = await scriptsApi.listScripts(targetId, undefined, 1, 50);
        setScripts(res.items);
      }
    } catch (err) {
      logger.error('加载作品集失败', err);
      setError('加载失败了，刷新一下试试？');
      toast.error('加载失败了');
    } finally {
      setLoading(false);
    }
  };

  const filteredScripts = scripts.filter((s: ScriptWork) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'completed', label: '已完成' },
    { key: 'draft', label: '创作中' },
  ];

  const handleChildChange = (childId: string): void => {
    setSelectedChildId(childId);
    setLoading(true);
    scriptsApi
      .listScripts(childId, undefined, 1, 50)
      .then((res) => {
        setScripts(res.items);
      })
      .catch((err) => {
        logger.error('切换宝贝加载作品失败', err);
        toast.error('加载失败了');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleChildCreated = (): void => {
    setShowAddChild(false);
    void loadData();
  };

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 bg-[#e5e7eb] rounded-lg animate-pulse" />
          <div className="h-5 w-20 bg-[#e5e7eb] rounded animate-pulse" />
        </div>
        <div className="h-10 w-64 bg-[#e5e7eb] rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-[#E1F5EE] to-[#FAEEDA] animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 bg-[#e5e7eb] rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-[#e5e7eb] rounded animate-pulse" />
              </div>
            </div>
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

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#085041] flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          我的作品集
        </h1>
        <span className="text-sm text-[#5f6368]">
          共 {scripts.length} 个作品
        </span>
      </div>

      {/* 宝贝选择（多个宝贝时） */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => handleChildChange(child.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${child.id === selectedChildId
                ? 'bg-[#0F6E56] text-white'
                : 'bg-white border border-[#e5e7eb] text-[#5f6368] hover:border-[#0F6E56]/30 hover:text-[#1a1d1f]'
              }`}
            >
              <span className="text-base">{child.avatar || '👶'}</span>
              {child.name}
            </button>
          ))}
        </div>
      )}

      {/* 无宝贝空态 */}
      {children.length === 0 && (
        <div className="bg-white rounded-2xl p-10 border border-[#e5e7eb] text-center">
          <div className="w-20 h-20 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-[#0F6E56]/60" />
          </div>
          <h3 className="text-lg font-semibold text-[#1a1d1f] mb-2">
            还没有宝贝档案呢
          </h3>
          <p className="text-[#5f6368] mb-6">
            添加宝贝档案，开始创作之旅吧
          </p>
          <button
            onClick={() => setShowAddChild(true)}
            className="inline-flex items-center gap-2 bg-[#0F6E56] hover:bg-[#085041] text-white font-medium px-6 py-2.5 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            添加宝贝
          </button>
        </div>
      )}

      {error && (
        <div className="bg-[#FCEBEB] rounded-xl p-4 text-center text-[#A32D2D] text-sm">
          {error}
          <button
            onClick={loadData}
            className="ml-2 underline hover:no-underline font-medium"
          >
            重试
          </button>
        </div>
      )}

      {/* 筛选 */}
      {children.length > 0 && !error && (
        <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-[#e5e7eb] w-fit">
          <Filter className="w-4 h-4 text-[#5f6368] ml-2" />
          {filters.map(
            (f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-[#0F6E56] text-white'
                    : 'text-[#5f6368] hover:text-[#1a1d1f] hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ),
          )}
        </div>
      )}

      {/* 作品网格 */}
      {children.length > 0 && !error && filteredScripts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-[#e5e7eb] text-center">
          <div className="w-20 h-20 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-[#0F6E56]/60" />
          </div>
          <h3 className="text-lg font-semibold text-[#1a1d1f] mb-2">
            还没有作品呢
          </h3>
          <p className="text-[#5f6368] mb-6">
            去造第一个故事吧，你就是导演！
          </p>
          <button
            onClick={() => navigate(`/create?childId=${selectedChildId}`)}
            className="inline-flex items-center gap-2 bg-[#0F6E56] hover:bg-[#085041] text-white font-medium px-6 py-2.5 rounded-xl transition-all"
          >
            <Sparkles className="w-4 h-4" />
            开始造故事
          </button>
        </div>
      ) : children.length > 0 && !error ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScripts.map((script) => (
            <div
              key={script.id}
              onClick={() => navigate(`/script/${script.id}`)}
              className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group"
            >
              <div className="relative h-40 bg-gradient-to-br from-[#E1F5EE] via-[#FAEEDA] to-[#E1F5EE] flex items-center justify-center overflow-hidden">
                <BookOpen
                  className="w-14 h-14 text-[#0F6E56]/30 transition-transform group-hover:scale-110"
                  strokeWidth={1.5}
                />
                {script.status === 'completed' && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-[#0F6E56] text-white text-xs font-medium rounded-full">
                    已完成
                  </span>
                )}
                {script.status === 'draft' && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-[#BA7517] text-white text-xs font-medium rounded-full">
                    创作中
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#1a1d1f] truncate mb-2 text-lg">
                  {script.title || '未命名故事'}
                </h3>
                <div className="space-y-1 text-sm text-[#5f6368]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#0F6E56]">主角：</span>
                    <span className="truncate">
                      {script.protagonist || '—'}
                    </span>
                  </div>
                  <div className="text-xs">
                    {new Date(script.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <AddChildModal
        open={showAddChild}
        onClose={() => setShowAddChild(false)}
        onCreated={handleChildCreated}
        submitText="添加宝贝"
      />
    </div>
  );
};

export default PortfolioPage;
