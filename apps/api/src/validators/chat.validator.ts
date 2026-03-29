import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória').max(2000, 'Mensagem muito longa'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
  region: z.string().min(1, 'Região é obrigatória'),
});

export type ChatInput = z.infer<typeof chatSchema>;
