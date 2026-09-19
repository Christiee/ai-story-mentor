import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ListChildrenResponse,
  CreateChildRequest,
  UpdateChildRequest,
  ChildProfile,
} from '@shared/api.interface';

export async function listChildren(): Promise<ListChildrenResponse> {
  try {
    const res = await axiosForBackend.get('/api/children');
    return res.data;
  } catch (err) {
    logger.error('获取孩子列表失败', err);
    throw err;
  }
}

export async function createChild(data: CreateChildRequest): Promise<ChildProfile> {
  try {
    const res = await axiosForBackend.post('/api/children', data);
    return res.data;
  } catch (err) {
    logger.error('创建孩子档案失败', err);
    throw err;
  }
}

export async function updateChild(id: string, data: UpdateChildRequest): Promise<ChildProfile> {
  try {
    const res = await axiosForBackend.patch(`/api/children/${id}`, data);
    return res.data;
  } catch (err) {
    logger.error('更新孩子档案失败', err);
    throw err;
  }
}

export async function getChild(id: string): Promise<ChildProfile> {
  try {
    const res = await axiosForBackend.get(`/api/children/${id}`);
    return res.data;
  } catch (err) {
    logger.error('获取孩子档案失败', err);
    throw err;
  }
}
