import api from './api';

export interface CategoryConfig {
  id: string;
  label: string;
  outlierMin: number;
  outlierMax: number;
  variantLabel: string;
  brands: string[];
}

export async function getCategories(): Promise<CategoryConfig[]> {
  const { data } = await api.get('/models/categories');
  return data.data;
}
