import api from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  region: string,
): Promise<string> {
  const { data } = await api.post('/chat', {
    message,
    history: history.map(m => ({ role: m.role, content: m.content })),
    region,
  });
  return data.data.reply;
}
