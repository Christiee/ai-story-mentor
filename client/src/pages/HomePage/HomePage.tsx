import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Star,
  BookOpen,
  User,
  Award,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { childrenApi, scriptsApi, badgesApi } from '@client/src/api';
import { useAuth } from '@client/src/hooks/useAuth';
import type {
  ChildProfile,
  ScriptWork,
  AchievementBadge,
} from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';
import AddChildModal from '@client/src/components/AddChildModal';
import ChildSelectModal from '@client/src/components/ChildSelectModal';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, requireLogin } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [scripts, setScripts] = useState<ScriptWork[]>([]);
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [exampleScripts, setExampleScripts] = useState<ScriptWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showChildSelect, setShowChildSelect] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      if (isLoggedIn) {
        const childrenRes = await childrenApi.listChildren();
        const childList = childrenRes.items;
        setChildren(childList);
        if (childList.length > 0) {
          setSelectedChildId(childList[0].id);
          const [scriptsRes, badgesRes, showcaseRes] = await Promise.all([
            scriptsApi.listScripts(childList[0].id, undefined, 1, 3),
            badgesApi.listBadges(childList[0].id),
            scriptsApi.listShowcaseScripts(1, 6),
          ]);
          setScripts(scriptsRes.items);
          setBadges(badgesRes.items.slice(0, 3));
          setExampleScripts(showcaseRes.items);
        } else {
          const showcaseRes = await scriptsApi.listShowcaseScripts(1, 6);
          setExampleScripts(showcaseRes.items);
        }
      } else {
        const examplesRes = await scriptsApi.listExampleScripts(1, 6);
        setExampleScripts(examplesRes.items);
      }
    } catch (err) {
      logger.error('加载首页数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = (): void => {
    if (!requireLogin()) return;

    if (children.length === 0) {
      setShowAddChild(true);
      return;
    }

    if (children.length > 1) {
      setShowChildSelect(true);
      return;
    }

    navigate(`/create?childId=${children[0].id}`);
  };

  const handleChildCreated = (child: { id: string; name: string }): void => {
    setShowAddChild(false);
    setShowChildSelect(false);
    void loadData();
    navigate(`/create?childId=${child.id}`);
  };

  const handleChildSelected = (childId: string): void => {
    setShowChildSelect(false);
    setSelectedChildId(childId);
    navigate(`/create?childId=${childId}`);
  };

  const handleAddFromSelect = (): void => {
    setShowChildSelect(false);
    setShowAddChild(true);
  };

  const handleViewPortfolio = (): void => {
    navigate('/portfolio');
  };

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

  const hasChildren = isLoggedIn && children.length > 0;
  const displayChild = hasChildren
    ? children.find((c) => c.id === selectedChildId) || children[0]
    : null;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E1F5EE] via-white to-[#FAEEDA] p-8 md:p-12">
        <div className="relative z-10 max-w-xl">
          {displayChild && (
            <p className="text-[#0F6E56] font-medium mb-2 flex items-center gap-2">
              <span className="inline-block w-8 h-8 rounded-full bg-white/60 text-base leading-8 text-center">
                {displayChild.avatar || '👋'}
              </span>
              嗨，{displayChild.name}！
            </p>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-[#085041] leading-tight mb-3">
            今天造点什么？
          </h1>
          <p className="text-[#5f6368] text-base md:text-lg mb-6">
            和剧本导师一起，造出你自己的故事
          </p>
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 bg-[#0F6E56] hover:bg-[#085041] text-white font-semibold px-8 py-4 rounded-2xl text-lg shadow-lg shadow-[#0F6E56]/20 transition-all hover:scale-105 active:scale-95"
          >
            <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            开始造故事
            <Sparkles className="w-5 h-5" />
          </button>
          {isLoggedIn && children.length > 0 && (
            <p className="text-sm text-[#5f6368] mt-3">
              {children.length > 1
                ? '有多个宝贝，点击开始可以选择哦'
                : `为 ${displayChild?.name || '宝贝'} 创作新故事`}
            </p>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:block">
          <div className="relative">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#BA7517]/20 to-[#0F6E56]/20 flex items-center justify-center">
              <BookOpen className="w-20 h-20 text-[#0F6E56]" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-[#FAEEDA] flex items-center justify-center">
              <Star className="w-6 h-6 text-[#BA7517] fill-[#BA7517]" />
            </div>
            <div className="absolute -bottom-1 -left-3 w-8 h-8 rounded-full bg-[#E1F5EE] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#0F6E56]" />
            </div>
          </div>
        </div>
      </section>

      {/* 孩子选择（登录后） */}
      {isLoggedIn && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#1a1d1f] flex items-center gap-2">
              <User className="w-5 h-5 text-[#0F6E56]" />
              我的宝贝
            </h2>
            {children.length > 0 && (
              <button
                onClick={() => setShowChildSelect(true)}
                className="text-sm text-[#0F6E56] font-medium hover:text-[#085041]"
              >
                切换宝贝
              </button>
            )}
          </div>
          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-[#e5e7eb] text-center">
              <div className="w-20 h-20 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-[#0F6E56]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1a1d1f] mb-2">
                还没有宝贝档案呢
              </h3>
              <p className="text-[#5f6368] mb-5 text-sm">
                创建宝贝档案，导师会记住宝宝的喜好<br />让每一个故事都更贴心
              </p>
              <button
                onClick={() => setShowAddChild(true)}
                className="inline-flex items-center gap-2 bg-[#0F6E56] hover:bg-[#085041] text-white font-medium px-6 py-3 rounded-xl transition-all"
              >
                <Sparkles className="w-4 h-4" />
                添加宝贝
              </button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {children.map((child) => (
                <div
                  key={child.id}
                  onClick={handleStartCreate}
                  className={`flex-shrink-0 bg-white rounded-2xl p-5 border-2 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer ${
                    child.id === selectedChildId
                      ? 'border-[#0F6E56] bg-[#E1F5EE]/20'
                      : 'border-[#e5e7eb] hover:border-[#0F6E56]/30'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E1F5EE] to-[#0F6E56]/20 flex items-center justify-center text-2xl">
                    {child.avatar || <User className="w-7 h-7 text-[#0F6E56]" />}
                  </div>
                  <div>
                    <div className="font-semibold text-[#1a1d1f]">
                      {child.name}
                    </div>
                    <div className="text-sm text-[#5f6368]">{child.age}岁</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 示例/最近作品 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#1a1d1f] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0F6E56]" />
            {isLoggedIn ? '最近作品' : '精彩故事'}
          </h2>
          {isLoggedIn && children.length > 0 && (
            <button
              onClick={handleViewPortfolio}
              className="text-sm text-[#0F6E56] font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {isLoggedIn ? (
          scripts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-[#e5e7eb] text-center">
              <div className="w-16 h-16 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-[#0F6E56]" />
              </div>
              <p className="text-[#5f6368] mb-4">
                还没有作品呢，去造第一个故事吧！
              </p>
              {children.length > 0 && (
                <button
                  onClick={handleStartCreate}
                  className="inline-flex items-center gap-2 bg-[#0F6E56] hover:bg-[#085041] text-white font-medium px-6 py-2.5 rounded-xl transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  开始造故事
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  onClick={() => navigate(`/script/${script.id}`)}
                  className="flex-shrink-0 w-56 bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="h-32 bg-gradient-to-br from-[#E1F5EE] to-[#FAEEDA] flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-[#0F6E56]/40" strokeWidth={1.5} />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#1a1d1f] truncate mb-1">
                      {script.title || '未命名故事'}
                    </h3>
                    <p className="text-sm text-[#5f6368] truncate">
                      主角：{script.protagonist || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : exampleScripts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[#e5e7eb] text-center">
            <div className="w-16 h-16 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-[#0F6E56]" />
            </div>
            <p className="text-[#5f6368]">精彩故事正在准备中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exampleScripts.map((script) => (
              <div
                key={script.id}
                onClick={() => navigate(`/script/${script.id}`)}
                className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              >
                {script.coverImage ? (
                  <div className="h-40 bg-[#E1F5EE] overflow-hidden">
                    <Image
                      src={script.coverImage}
                      alt={script.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-[#E1F5EE] to-[#FAEEDA] flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-[#0F6E56]/40" strokeWidth={1.5} />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-[#1a1d1f] truncate mb-1">
                    {script.title || '未命名故事'}
                  </h3>
                  <p className="text-sm text-[#5f6368] truncate">
                    主角：{script.protagonist || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 成就徽章 */}
      {isLoggedIn && badges.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-[#1a1d1f] mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#BA7517]" />
            成就徽章
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex-shrink-0 bg-white rounded-2xl p-5 border border-[#e5e7eb] flex flex-col items-center gap-2 w-36 hover:shadow-md transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-[#FAEEDA] flex items-center justify-center">
                  <Award className="w-7 h-7 text-[#BA7517]" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-[#1a1d1f] text-sm">
                    {badge.badgeName}
                  </div>
                  <div className="text-xs text-[#5f6368] mt-1 line-clamp-2">
                    {badge.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 大家的故事 / 精选故事 */}
      {isLoggedIn && exampleScripts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#1a1d1f] flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#0F6E56]" />
              大家的故事
            </h2>
            <button
              onClick={() => navigate('/showcase')}
              className="text-sm text-[#0F6E56] font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exampleScripts.map((script) => (
              <div
                key={script.id}
                onClick={() => navigate(`/script/${script.id}`)}
                className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              >
                {script.coverImage ? (
                  <div className="h-40 bg-[#E1F5EE] overflow-hidden">
                    <Image
                      src={script.coverImage}
                      alt={script.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-[#E1F5EE] to-[#FAEEDA] flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-[#0F6E56]/40" strokeWidth={1.5} />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-[#1a1d1f] truncate mb-1">
                    {script.title || '未命名故事'}
                  </h3>
                  <p className="text-sm text-[#5f6368] truncate">
                    主角：{script.protagonist || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 游客引导 */}
      {!isLoggedIn && (
        <section className="bg-gradient-to-r from-[#E1F5EE] to-[#FAEEDA] rounded-2xl p-6 md:p-8 text-center">
          <h2 className="text-xl font-bold text-[#085041] mb-2">
            登录后保存你的故事
          </h2>
          <p className="text-[#5f6368] mb-5 max-w-md mx-auto text-sm">
            作品和成长数据会自动保存，换设备也能继续创作，还能看到宝贝的成长报告
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-[#0F6E56] hover:bg-[#085041] text-white font-medium px-6 py-3 rounded-xl transition-all"
          >
            <Sparkles className="w-4 h-4" />
            登录 / 注册
          </button>
        </section>
      )}

      <AddChildModal
        open={showAddChild}
        onClose={() => setShowAddChild(false)}
        onCreated={handleChildCreated}
        submitText="开始造故事"
      />

      <ChildSelectModal
        open={showChildSelect}
        children={children}
        onSelect={handleChildSelected}
        onClose={() => setShowChildSelect(false)}
        onAddChild={handleAddFromSelect}
      />
    </div>
  );
};

export default HomePage;
