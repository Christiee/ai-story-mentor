import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, X } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface LoginRequireModalProps {
  open: boolean;
  onClose: () => void;
}

const LoginRequireModal = ({ open, onClose }: LoginRequireModalProps) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Next frame: trigger CSS transition for fade-in + scale
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timer);
  }, [open]);

  const handleGoLogin = () => {
    logger.info('用户点击登录引导弹窗的去登录按钮');
    onClose();
    navigate('/login');
  };

  const handleBrowse = () => {
    logger.info('用户点击登录引导弹窗的再逛逛按钮');
    onClose();
  };

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-require-title"
    >
      {/* Mask */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ease-out ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-[#5f6368] hover:bg-[#f0f3f5] transition-colors z-10"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-8 flex flex-col items-center text-center">
          {/* Illustration area */}
          <div className="relative w-20 h-20 mb-5">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E1F5EE] to-[#FAEEDA] flex items-center justify-center">
              <BookOpen className="w-9 h-9 text-[#0F6E56]" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-[#BA7517] to-[#D4942E] flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2
            id="login-require-title"
            className="text-xl font-bold text-[#085041] mb-2 leading-tight"
          >
            登录后就能造自己的故事啦
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-[#5f6368] leading-relaxed mb-6">
            登录后你的作品会被保存下来，
            <br />
            换设备也能继续创作
          </p>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleGoLogin}
              className="w-full py-3 px-6 rounded-xl bg-[#0F6E56] text-white font-medium text-base hover:bg-[#085041] active:scale-[0.98] transition-all shadow-sm"
            >
              去登录
            </button>
            <button
              onClick={handleBrowse}
              className="w-full py-3 px-6 rounded-xl bg-[#f0f3f5] text-[#5f6368] font-medium text-base hover:bg-[#e5e7eb] active:scale-[0.98] transition-all"
            >
              再逛逛
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRequireModal;
