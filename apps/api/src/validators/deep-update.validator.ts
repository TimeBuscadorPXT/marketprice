import { z } from 'zod';

export const deepUpdateSchema = z.object({
  fbUrl: z.string().url('URL inválida'),
  fullDescription: z.string().nullable().optional(),
  photoUrls: z.array(z.string().url()).optional().default([]),
  sellerProfileUrl: z.string().url().nullable().optional(),
  sellerJoinDate: z.string().nullable().optional(),
  sellerLocation: z.string().nullable().optional(),
  listedCategory: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  hasShipping: z.boolean().optional(),
});

export type DeepUpdateInput = z.infer<typeof deepUpdateSchema>;
