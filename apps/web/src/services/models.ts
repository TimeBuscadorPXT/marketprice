import api from './api';

export interface Product {
  id: string;
  category: string;
  brand: string;
  name: string;
  variant: string;
  aliases: string[];
  _count: { listings: number };
}

export async function getModels(brand?: string, category?: string): Promise<Product[]> {
  const params: Record<string, string> = {};
  if (brand) params.brand = brand;
  if (category) params.category = category;
  const { data } = await api.get('/models', { params });
  return data.data;
}

export async function getModelById(id: string): Promise<Product> {
  const { data } = await api.get(`/models/${id}`);
  return data.data;
}
