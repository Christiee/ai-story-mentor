import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ListScriptsResponse,
  ScriptDetailResponse,
  MentorChatRequest,
  MentorChatResponse,
  StartScriptRequest,
  GeneratePagesResponse,
  GenerateAudioRequest,
  GenerateAudioResponse,
  ScriptWork,
} from '@shared/api.interface';

export async function listScripts(
  childId: string,
  status?: 'draft' | 'completed',
  page = 1,
  pageSize = 20,
): Promise<ListScriptsResponse> {
  try {
    const params: Record<string, string | number> = { childId, page, pageSize };
    if (status) params.status = status;
    const res = await axiosForBackend.get('/api/scripts', { params });
    return res.data;
  } catch (err) {
    logger.error('获取剧本列表失败', err);
    throw err;
  }
}

export async function listExampleScripts(
  page = 1,
  pageSize = 6,
): Promise<ListScriptsResponse> {
  try {
    const res = await axiosForBackend.get('/api/scripts/examples', {
      params: { page, pageSize },
    });
    return res.data;
  } catch (err) {
    logger.error('获取示例作品失败', err);
    throw err;
  }
}

export async function listShowcaseScripts(
  page = 1,
  pageSize = 12,
): Promise<ListScriptsResponse> {
  try {
    const res = await axiosForBackend.get('/api/scripts/showcase', {
      params: { page, pageSize },
    });
    return res.data;
  } catch (err) {
    logger.error('获取精选故事失败', err);
    throw err;
  }
}

export async function getExampleScriptDetail(
  id: string,
): Promise<ScriptDetailResponse> {
  try {
    const res = await axiosForBackend.get(`/api/scripts/examples/${id}`);
    return res.data;
  } catch (err) {
    logger.error('获取示例作品详情失败', err);
    throw err;
  }
}

export async function startScript(childId: string): Promise<ScriptWork> {
  try {
    const res = await axiosForBackend.post('/api/scripts/start', { childId });
    return res.data;
  } catch (err) {
    logger.error('开始剧本创作失败', err);
    throw err;
  }
}

export async function mentorChat(data: MentorChatRequest): Promise<MentorChatResponse> {
  try {
    const res = await axiosForBackend.post('/api/scripts/mentor-chat', data);
    return res.data;
  } catch (err) {
    logger.error('导师对话失败', err);
    throw err;
  }
}

export async function getScriptDetail(id: string): Promise<ScriptDetailResponse> {
  try {
    const res = await axiosForBackend.get(`/api/scripts/${id}`);
    return res.data;
  } catch (err) {
    logger.error('获取剧本详情失败', err);
    throw err;
  }
}

export async function generatePages(scriptId: string): Promise<GeneratePagesResponse> {
  try {
    const res = await axiosForBackend.post('/api/scripts/generate-pages', { scriptId });
    return res.data;
  } catch (err) {
    logger.error('生成分页内容失败', err);
    throw err;
  }
}

export async function generateAudio(data: GenerateAudioRequest): Promise<GenerateAudioResponse> {
  try {
    const res = await axiosForBackend.post('/api/scripts/generate-audio', data);
    return res.data;
  } catch (err) {
    logger.error('生成配音失败', err);
    throw err;
  }
}
