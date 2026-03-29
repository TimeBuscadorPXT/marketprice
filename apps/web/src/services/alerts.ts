import api from './api';

export interface AlertRule {
  id: string;
  name: string;
  modelId: string | null;
  region: string;
  condition: 'price_below' | 'price_above' | 'new_deal_hot' | 'price_drop';
  threshold: number | null;
  channel: 'telegram' | 'email' | 'both';
  isActive: boolean;
  lastTriggered: string | null;
  createdAt: string;
  model: { brand: string; name: string; variant: string } | null;
}

export async function getAlerts(): Promise<AlertRule[]> {
  const { data } = await api.get('/alerts');
  return data.data;
}

export async function createAlert(input: {
  name: string;
  modelId?: string;
  region: string;
  condition: string;
  threshold?: number;
  channel: string;
}): Promise<AlertRule> {
  const { data } = await api.post('/alerts', input);
  return data.data;
}

export async function updateAlert(id: string, input: Record<string, unknown>): Promise<AlertRule> {
  const { data } = await api.put(`/alerts/${id}`, input);
  return data.data;
}

export async function deleteAlert(id: string): Promise<void> {
  await api.delete(`/alerts/${id}`);
}

export async function checkAlerts(settings: Record<string, string>): Promise<Array<{ alertId: string; triggered: boolean }>> {
  const { data } = await api.post('/alerts/check', settings);
  return data.data;
}

export async function testNotification(channel: string, settings: Record<string, string>): Promise<boolean> {
  const { data } = await api.post('/alerts/test', { channel, ...settings });
  return data.data.sent;
}
