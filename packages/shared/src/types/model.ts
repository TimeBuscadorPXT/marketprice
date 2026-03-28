export type ModelCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

/** Modelo normalizado de celular */
export interface Model {
  id: string;
  brand: string;
  name: string;
  storage: string;
  color: string | null;
  condition: ModelCondition;
  referencePrice: number;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
}
