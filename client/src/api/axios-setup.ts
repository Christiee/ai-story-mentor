import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { getVisitorId } from '../utils/visitor';

const TOKEN_KEY = 'storymentor_token';

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

axiosForBackend.interceptors.request.use((config) => {
  const visitorId = getVisitorId();
  const token = getToken();
  if (config.headers) {
    config.headers.set('x-visitor-id', visitorId);
    if (token) {
      config.headers.set('x-auth-token', token);
    }
  }
  return config;
});
