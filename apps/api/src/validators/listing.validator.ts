import { z } from 'zod';

const listingItemSchema = z.object({
  title: z.string({ error: 'Título é obrigatório' }).min(1, 'Título é obrigatório'),
  price: z.number({ error: 'Preço é obrigatório' }).positive('Preço deve ser positivo'),
  region: z.string({ error: 'Região é obrigatória' }).min(1, 'Região é obrigatória'),
  publishedAt: z.string().datetime().optional(),
  fbUrl: z.string({ error: 'URL do Facebook é obrigatória' }).url('URL inválida'),
  condition: z.string().optional(),
  imageUrl: z.string().url('URL da imagem inválida').optional(),
  description: z.string().optional(),
  sellerName: z.string().optional(),
  photoCount: z.number().int().min(0).optional(),
  publishedText: z.string().optional(),
  daysOnMarket: z.number().int().min(0).optional(),
  hasShipping: z.boolean().optional(),
});

export const createListingsSchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido').optional(),
  listings: z
    .array(listingItemSchema, { error: 'Lista de anúncios é obrigatória' })
    .min(1, 'Envie pelo menos 1 anúncio'),
});

export const listListingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  modelId: z.string().uuid('ID do modelo inválido').optional(),
  region: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateListingsInput = z.infer<typeof createListingsSchema>;
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
