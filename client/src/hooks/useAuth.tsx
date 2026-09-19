import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { AppUser } from '@shared/api.interface';
import * as authApi from '../api/auth';
import { getVisitorId } from '../utils/visitor';

const TOKEN_KEY = 'storymentor_token';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isLoggedIn: boolean;
  loginPromptOpen: boolean;
  loginWithCode: (
    phone: string,
    code: string,
  ) => Promise<{ mergedChildrenCount: number }>;
  loginWithPassword: (
    phone: string,
    password: string,
  ) => Promise<{ mergedChildrenCount: number }>;
  sendCode: (phone: string) => Promise<{
    devMode: boolean;
    devCode?: string;
    message: string;
  }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  promptLogin: () => void;
  closeLoginPrompt: () => void;
  requireLogin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

function removeToken(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loginPromptOpen, setLoginPromptOpen] = useState<boolean>(false);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.getCurrentUser();
      setUser(res.user);
    } catch (err) {
      logger.error('刷新用户信息失败', err);
      removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const sendCode = useCallback(
    async (phone: string): Promise<{
      devMode: boolean;
      devCode?: string;
      message: string;
    }> => {
      const res = await authApi.sendCode(phone);
      return {
        devMode: res.devMode,
        devCode: res.devCode,
        message: res.message,
      };
    },
    [],
  );

  const loginWithCode = useCallback(
    async (
      phone: string,
      code: string,
    ): Promise<{ mergedChildrenCount: number }> => {
      const visitorId = getVisitorId();
      const res = await authApi.smsLogin(phone, code, visitorId);
      setToken(res.token);
      setUser(res.user);
      return { mergedChildrenCount: res.mergedChildrenCount };
    },
    [],
  );

  const loginWithPassword = useCallback(
    async (
      phone: string,
      password: string,
    ): Promise<{ mergedChildrenCount: number }> => {
      const visitorId = getVisitorId();
      const res = await authApi.passwordLogin(phone, password, visitorId);
      setToken(res.token);
      setUser(res.user);
      return { mergedChildrenCount: res.mergedChildrenCount };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      logger.error('退出登录接口调用失败', err);
    }
    removeToken();
    setUser(null);
  }, []);

  const isLoggedIn = user !== null;

  const promptLogin = useCallback(() => {
    setLoginPromptOpen(true);
  }, []);

  const closeLoginPrompt = useCallback(() => {
    setLoginPromptOpen(false);
  }, []);

  const requireLogin = useCallback((): boolean => {
    if (isLoggedIn) return true;
    promptLogin();
    return false;
  }, [isLoggedIn, promptLogin]);

  const value: AuthContextType = {
    user,
    loading,
    isLoggedIn,
    loginPromptOpen,
    loginWithCode,
    loginWithPassword,
    sendCode,
    logout,
    refreshUser,
    promptLogin,
    closeLoginPrompt,
    requireLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };
