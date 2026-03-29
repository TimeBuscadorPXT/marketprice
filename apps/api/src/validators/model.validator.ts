import { z } from 'zod';

export const listModelsQuerySchema = z.object({
  brand: z.string().optional(),
  category: z.string().optional(),
});

export const modelParamsSchema = z.object({
  id: z.string().uuid('ID invalido'),
});

export type ListModelsQuery = z.infer<typeof listModelsQuerySchema>;
