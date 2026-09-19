import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  VoiceConfigResponse,
  SpeechToTextResponse,
  SpeechSynthesisRequest,
  SpeechSynthesisResponse,
} from '@shared/api.interface';

export async function speechToText(audioBlob: Blob, mimeType?: string): Promise<SpeechToTextResponse> {
  const type = mimeType || audioBlob.type || 'audio/ogg';
  const formData = new FormData();
  const ext = type.includes('ogg') ? 'ogg'
    : type.includes('mp4') || type.includes('m4a') ? 'm4a'
    : type.includes('mpeg') || type.includes('mp3') ? 'mp3'
    : type.includes('wav') ? 'wav'
    : type.includes('webm') ? 'webm'
    : 'ogg';
  formData.append('file', audioBlob, `recording.${ext}`);
  formData.append('mimeType', type);
  const res = await axiosForBackend.post('/api/voice/speech-to-text', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function speechSynthesis(
  text: string,
  options?: { voiceGender?: 'female' | 'male'; speed?: string },
): Promise<SpeechSynthesisResponse> {
  const body: SpeechSynthesisRequest = {
    text,
    voiceGender: options?.voiceGender,
    speed: options?.speed,
  };
  const res = await axiosForBackend.post('/api/voice/speech-synthesis', body);
  return res.data;
}

export async function getVoiceConfig(): Promise<VoiceConfigResponse> {
  const res = await axiosForBackend.get('/api/voice/config');
  return res.data;
}
