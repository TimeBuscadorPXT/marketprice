import api from './api';

export interface AiInsight {
  emoji: string;
  title: string;
  text: string;
  actionType: 'buy' | 'sell' | 'wait' | 'alert';
  modelName?: string;
  dealId?: string;
}

export interface DealVerdict {
  verdict: 'comprar' | 'avaliar' | 'evitar';
  reason: string;
  confidence: number;
}

export interface ModelSummary {
  summary: string;
}

export async function getAiInsights(region: string): Promise<AiInsight[]> {
  const { data } = await api.get('/ai/insights', { params: { region } });
  return data.data;
}

export async function analyzeDeal(dealId: string): Promise<DealVerdict> {
  const { data } = await api.post('/ai/analyze-deal', { dealId });
  return data.data;
}

export async function getModelSummary(modelId: string, region: string): Promise<ModelSummary> {
  const { data } = await api.get('/ai/model-summary', { params: { modelId, region } });
  return data.data;
}

export async function sendAiChat(message: string, context?: string): Promise<string> {
  const { data } = await api.post('/ai/chat', { message, context });
  return data.data.reply;
}
