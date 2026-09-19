import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ListDailyResponse,
  TodayDailyResponse,
} from '@shared/api.interface';

export async function getTodayDaily(childId: string): Promise<TodayDailyResponse> {
  try {
    const res = await axiosForBackend.get('/api/daily/today', { params: { childId } });
    return res.data;
  } catch (err) {
    logger.error('获取今日亮点日报失败', err);
    throw err;
  }
}

export async function listDaily(
  childId: string,
  page = 1,
  pageSize = 30,
): Promise<ListDailyResponse> {
  try {
    const res = await axiosForBackend.get('/api/daily', { params: { childId, page, pageSize } });
    return res.data;
  } catch (err) {
    logger.error('获取亮点日报列表失败', err);
    throw err;
  }
}
