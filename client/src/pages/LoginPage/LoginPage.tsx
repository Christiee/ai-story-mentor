import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { useAuth } from '@client/src/hooks/useAuth';

const PHONE_REGEX = /^1\d{10}$/;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithPassword } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const validatePhone = (value: string): string => {
    if (!value) return '请输入手机号';
    if (!PHONE_REGEX.test(value)) return '请输入正确的11位手机号';
    return '';
  };

  const handlePasswordLogin = async (): Promise<void> => {
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }
    if (!password) {
      setPwdError('请输入密码');
      return;
    }
    if (password.length < 6) {
      setPwdError('密码至少6位');
      return;
    }
    setPhoneError('');
    setPwdError('');
    setGlobalError('');
    setLoginLoading(true);
    try {
      const result = await loginWithPassword(phone, password);
      if (result.mergedChildrenCount > 0) {
        toast.success(`已合并 ${result.mergedChildrenCount} 个孩子的创作数据`);
      } else {
        toast.success('登录成功');
      }
      navigate('/');
    } catch (err) {
      logger.error('密码登录失败', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || '登录失败，请检查手机号和密码';
      setGlobalError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGuestContinue = (): void => {
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f6f7f9] px-4 py-8">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-8">
        {/* Logo 与标题区 */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E1F5EE] to-[#0F6E56]/20 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-[#0F6E56]" />
          </div>
          <h1 className="text-[28px] font-bold text-[#1a1d1f] tracking-[0.5px] mb-2">
            欢迎回来
          </h1>
          <p className="text-[13px] text-[#5f6368] text-center">
            登录后可以跨设备同步你的作品
          </p>
        </div>

        {/* 全局错误提示 */}
        {globalError && (
          <div className="mb-4 p-3 rounded-[10px] bg-[#FCEBEB] text-[#A32D2D] text-[13px] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A32D2D] flex-shrink-0" />
            {globalError}
          </div>
        )}

        {/* 密码登录表单 */}
        <div className="space-y-4">
          {/* 手机号输入 */}
          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368] text-[15px] pointer-events-none">
                +86
              </span>
              <Input
                type="tel"
                value={phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                  if (phoneError) setPhoneError('');
                }}
                placeholder="请输入手机号"
                className="pl-12 h-11 rounded-[10px] text-[15px] border-[#e5e7eb] focus:border-[#0F6E56] focus:ring-[#0F6E56]/10"
                maxLength={11}
              />
            </div>
            {phoneError && (
              <p className="mt-1.5 text-[13px] text-[#A32D2D]">
                {phoneError}
              </p>
            )}
          </div>

          {/* 密码输入 */}
          <div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPassword(e.target.value);
                  if (pwdError) setPwdError('');
                }}
                placeholder="请输入密码"
                className="h-11 pr-10 rounded-[10px] text-[15px] border-[#e5e7eb] focus:border-[#0F6E56] focus:ring-[#0F6E56]/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#1a1d1f] transition-colors"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {pwdError && (
              <p className="mt-1.5 text-[13px] text-[#A32D2D]">{pwdError}</p>
            )}
          </div>

          {/* 登录按钮 */}
          <Button
            onClick={handlePasswordLogin}
            disabled={loginLoading}
            className="w-full h-11 rounded-[10px] bg-[#0F6E56] hover:bg-[#085041] text-white text-[15px] font-medium mt-2"
          >
            {loginLoading && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {loginLoading ? '登录中...' : '登录'}
          </Button>
        </div>

        {/* 内测提示 */}
        <p className="mt-4 text-[12.5px] text-[#5f6368] text-center">
          内测中，账号由管理员开通
        </p>

        {/* 底部区域 */}
        <div className="mt-6 pt-4 border-t border-[#e5e7eb]">
          <p className="text-[13px] text-[#5f6368] text-center mb-3">
            手机号仅用于账号登录，不会用于其他用途
          </p>
          <button
            onClick={handleGuestContinue}
            className="w-full flex items-center justify-center gap-1 text-[13px] text-[#0F6E56] font-medium hover:text-[#085041] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            游客模式继续
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
