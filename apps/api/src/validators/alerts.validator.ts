import { z } from 'zod';

export const createAlertSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  modelId: z.string().uuid().optional(),
  region: z.string().min(1, 'Região é obrigatória'),
  condition: z.enum(['price_below', 'price_above', 'new_deal_hot', 'price_drop']),
  threshold: z.number().positive().optional(),
  channel: z.enum(['telegram', 'email', 'both']),
});

export const updateAlertSchema = createAlertSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const alertSettingsSchema = z.object({
  telegramChatId: z.string().optional(),
  telegramBotToken: z.string().optional(),
  emailAddress: z.string().email('Email inválido').optional(),
  resendApiKey: z.string().optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type AlertSettingsInput = z.infer<typeof alertSettingsSchema>;
