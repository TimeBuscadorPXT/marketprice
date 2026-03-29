import { z } from 'zod';

export const insightsQuerySchema = z.object({
  region: z.string().min(1, 'Região é obrigatória'),
});

export const analyzeDealSchema = z.object({
  dealId: z.string().min(1, 'ID do deal é obrigatório'),
});

export const modelSummaryQuerySchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
  region: z.string().min(1, 'Região é obrigatória'),
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.string().optional(),
});

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
export type AnalyzeDealInput = z.infer<typeof analyzeDealSchema>;
export type ModelSummaryQuery = z.infer<typeof modelSummaryQuerySchema>;
export type AiChatInput = z.infer<typeof aiChatSchema>;
