import { api } from './api';

export interface AiChatResponse {
  response: string;
  actions?: string[];
  intent?: string;
  sources?: { title: string; url?: string; score?: number; type?: string }[];
}

export async function sendAiMessage(
  message: string,
  context?: { emergencyCount?: number },
): Promise<AiChatResponse> {
  return api.post<AiChatResponse>('/ai/chat', { message, context });
}
