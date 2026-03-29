import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z
    .string({ error: 'Nome e obrigatorio' })
    .min(1, 'Nome e obrigatorio')
    .max(200, 'Nome deve ter no maximo 200 caracteres'),
  modelId: z.string({ error: 'ID do modelo e obrigatorio' }).uuid('ID do modelo invalido'),
  price: z.number({ error: 'Preco e obrigatorio' }).positive('Preco deve ser positivo'),
  notes: z.string().max(1000, 'Notas devem ter no maximo 1000 caracteres').optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  modelId: z.string().uuid('ID do modelo invalido').optional(),
  price: z.number().positive('Preco deve ser positivo').optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const supplierParamsSchema = z.object({
  id: z.string().uuid('ID invalido'),
});

export const supplierCompareQuerySchema = z.object({
  region: z.string({ error: 'Regiao e obrigatoria' }).min(1, 'Regiao e obrigatoria'),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
