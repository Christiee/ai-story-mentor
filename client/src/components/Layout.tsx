import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, BarChart3, User, Home, ChevronDown, Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import LoginRequireModal from './LoginRequireModal';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isParent = location.pathname.startsWith('/parent');
  const [mode, setMode] = useState<'child' | 'parent'>(isParent ? 'parent' : 'child');
  const { user, loading, logout, loginPromptOpen, closeLoginPrompt } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const childNavItems: { to: string; label: string; icon: typeof Home; end?: boolean }[] = [
    { to: '/', label: '首页', icon: Home, end: true },
    { to: '/create', label: '造故事', icon: Sparkles },
    { to: '/showcase', label: '大家的故事', icon: Globe },
    { to: '/portfolio', label: '我的作品', icon: BookOpen },
  ];

  const parentNavItems: { to: string; label: string; icon: typeof Home; end?: boolean }[] = [
    { to: '/parent/daily', label: '亮点日报', icon: Sparkles },
    { to: '/parent/works', label: '作品墙', icon: BookOpen },
    { to: '/parent/radar', label: '成长雷达', icon: BarChart3 },
  ];

  const navItems = mode === 'child' ? childNavItems : parentNavItems;

  const switchMode = (newMode: 'child' | 'parent') => {
    setMode(newMode);
    if (newMode === 'child') {
      navigate('/');
    } else {
      navigate('/parent/daily');
    }
  };

  const maskPhone = (phone: string): string => {
    if (phone.length < 11) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(7);
  };

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    toast.success('已退出登录');
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const renderUserArea = () => {
    if (loading) {
      return <div className="w-20 h-8" />;
    }

    if (!user) {
      return (
        <button
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-[#0F6E56] hover:text-[#085041] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#E1F5EE]/50"
        >
          登录
        </button>
      );
    }

    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen((prev: boolean) => !prev)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[#1a1d1f] hover:bg-[#f0f3f5] transition-colors"
        >
          <span className="font-medium">{maskPhone(user.phone)}</span>
          <ChevronDown
            className={`w-4 h-4 text-[#5f6368] transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#e5e7eb] py-1.5 z-50">
            <div className="px-4 py-2.5 text-sm text-[#5f6368] border-b border-[#e5e7eb]">
              <div className="text-[11px] mb-0.5">我的账号</div>
              <div className="text-[#1a1d1f] font-medium">{maskPhone(user.phone)}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] flex flex-col">
      <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 no-underline">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#085041] to-[#0F6E56] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[#085041] font-bold text-base leading-tight">AI 剧本导师</div>
              <div className="text-[#5f6368] text-[11px]">StoryMentor</div>
            </div>
          </NavLink>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#f0f3f5] rounded-full p-1">
              <button
                onClick={() => switchMode('child')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  mode === 'child'
                    ? 'bg-white text-[#085041] shadow-sm'
                    : 'text-[#5f6368] hover:text-[#1a1d1f]'
                }`}
              >
                孩子端
              </button>
              <button
                onClick={() => switchMode('parent')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  mode === 'parent'
                    ? 'bg-white text-[#085041] shadow-sm'
                    : 'text-[#5f6368] hover:text-[#1a1d1f]'
                }`}
              >
                家长端
              </button>
            </div>

            {renderUserArea()}
          </div>
        </div>

        <nav className="max-w-5xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium no-underline border-b-2 transition-all -mb-px ${
                  isActive
                    ? 'text-[#0F6E56] border-[#0F6E56] bg-[#E1F5EE]/30'
                    : 'text-[#5f6368] border-transparent hover:text-[#1a1d1f] hover:bg-[#f0f3f5]'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-[#e5e7eb] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-[12px] text-[#5f6368]">
          <div>
            AI 剧本导师 · 让每个孩子都能造出自己骄傲的东西
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>创作辅助工具</span>
          </div>
        </div>
      </footer>

      <LoginRequireModal open={loginPromptOpen} onClose={closeLoginPrompt} />
    </div>
  );
};

export default Layout;
