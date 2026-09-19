import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { LatestRadarResponse } from '@shared/api.interface';

export async function getLatestRadar(childId: string): Promise<LatestRadarResponse> {
  try {
    const res = await axiosForBackend.get('/api/radar/latest', { params: { childId } });
    return res.data;
  } catch (err) {
    logger.error('获取能力雷达失败', err);
    throw err;
  }
}
