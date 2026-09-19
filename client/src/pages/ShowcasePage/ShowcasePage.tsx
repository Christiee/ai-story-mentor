import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Globe, Sparkles } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { scriptsApi } from '@client/src/api';
import type { ScriptWork } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

const ShowcasePage: React.FC = () => {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<ScriptWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 12;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const res = await scriptsApi.listShowcaseScripts(1, PAGE_SIZE);
      setScripts(res.items);
      setHasMore(res.items.length === PAGE_SIZE && res.total > PAGE_SIZE);
      setPage(1);
    } catch (err) {
      logger.error('加载精选故事失败', err);
      setError('加载失败了，刷新一下试试？');
      toast.error('加载失败了');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async (): Promise<void> => {
    try {
      const nextPage = page + 1;
      const res = await scriptsApi.listShowcaseScripts(nextPage, PAGE_SIZE);
      setScripts((prev) => [...prev, ...res.items]);
      setPage(nextPage);
      setHasMore(res.items.length === PAGE_SIZE);
    } catch (err) {
      logger.error('加载更多精选故事失败', err);
      toast.error('加载失败了');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-[#e5e7eb] rounded-lg animate-pulse" />
          <div className="h-5 w-20 bg-[#e5e7eb] rounded animate-pulse" />
        </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#085041] flex items-center gap-2">
          <Globe className="w-6 h-6" />
          大家的故事
        </h1>
        <span className="text-sm text-[#5f6368]">
          精选小朋友们创作的优质故事
        </span>
      </div>

      <div className="bg-gradient-to-r from-[#E1F5EE] to-[#FAEEDA] rounded-2xl p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-[#BA7517]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#085041] mb-1">
              看看其他小朋友的故事吧
            </h2>
            <p className="text-sm text-[#1a1d1f]/70">
              每个故事都经过AI审核，内容安全、积极向上。你也可以创作自己的故事，让更多人看到哦！
            </p>
          </div>
        </div>
      </div>

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

      {scripts.length === 0 && !error ? (
        <div className="bg-white rounded-2xl p-10 border border-[#e5e7eb] text-center">
          <div className="w-20 h-20 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-[#0F6E56]/60" />
          </div>
          <h3 className="text-lg font-semibold text-[#1a1d1f] mb-2">
            故事正在准备中
          </h3>
          <p className="text-[#5f6368] mb-6">
            精彩故事马上来，先去创作你的第一个故事吧
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scripts.map((script) => (
              <div
                key={script.id}
                onClick={() => navigate(`/script/${script.id}`)}
                className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group"
              >
                <div className="relative h-40 bg-gradient-to-br from-[#E1F5EE] via-[#FAEEDA] to-[#E1F5EE] flex items-center justify-center overflow-hidden">
                  {script.coverImage ? (
                    <Image
                      src={script.coverImage}
                      alt={script.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <BookOpen
                      className="w-14 h-14 text-[#0F6E56]/30 transition-transform group-hover:scale-110"
                      strokeWidth={1.5}
                    />
                  )}
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-[#0F6E56] text-white text-xs font-medium rounded-full">
                    精选
                  </span>
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

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                className="px-6 py-2.5 bg-white border border-[#e5e7eb] text-[#0F6E56] font-medium rounded-xl hover:border-[#0F6E56]/30 hover:bg-[#E1F5EE]/20 transition-all"
              >
                加载更多
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShowcasePage;
