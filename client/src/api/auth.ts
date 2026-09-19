import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  SendCodeRequest,
  SendCodeResponse,
  SmsCodeLoginRequest,
  PasswordLoginRequest,
  LoginResponse,
  CurrentUserResponse,
  LogoutResponse,
} from '@shared/api.interface';

export async function sendCode(phone: string): Promise<SendCodeResponse> {
  try {
    const data: SendCodeRequest = { phone };
    const res = await axiosForBackend.post('/api/auth/send-code', data);
    return res.data;
  } catch (err) {
    logger.error('发送验证码失败', err);
    throw err;
  }
}

export async function smsLogin(
  phone: string,
  code: string,
  visitorId: string,
): Promise<LoginResponse> {
  try {
    const data: SmsCodeLoginRequest = { phone, code, visitorId };
    const res = await axiosForBackend.post('/api/auth/sms-login', data);
    return res.data;
  } catch (err) {
    logger.error('验证码登录失败', err);
    throw err;
  }
}

export async function passwordLogin(
  phone: string,
  password: string,
  visitorId: string,
): Promise<LoginResponse> {
  try {
    const data: PasswordLoginRequest = { phone, password, visitorId };
    const res = await axiosForBackend.post('/api/auth/password-login', data);
    return res.data;
  } catch (err) {
    logger.error('密码登录失败', err);
    throw err;
  }
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  try {
    const res = await axiosForBackend.get('/api/auth/me');
    return res.data;
  } catch (err) {
    logger.error('获取当前用户失败', err);
    throw err;
  }
}

export async function logout(): Promise<LogoutResponse> {
  try {
    const res = await axiosForBackend.post('/api/auth/logout');
    return res.data;
  } catch (err) {
    logger.error('退出登录失败', err);
    throw err;
  }
}
