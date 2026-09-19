import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ListBadgesResponse } from '@shared/api.interface';

export async function listBadges(childId: string): Promise<ListBadgesResponse> {
  try {
    const res = await axiosForBackend.get('/api/badges', { params: { childId } });
    return res.data;
  } catch (err) {
    logger.error('获取成就徽章失败', err);
    throw err;
  }
}
