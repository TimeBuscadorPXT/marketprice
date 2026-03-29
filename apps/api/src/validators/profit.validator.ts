import { z } from 'zod';

export const profitCalculateSchema = z.object({
  purchasePrice: z
    .number({ error: 'Preco de compra e obrigatorio' })
    .positive('Preco de compra deve ser positivo'),
  sellingPrice: z.number().positive('Preco de venda deve ser positivo').optional(),
  modelId: z.string().uuid('ID do modelo invalido').optional(),
  region: z.string().optional(),
  shippingIn: z.number().min(0, 'Frete de entrada nao pode ser negativo').default(0),
  shippingOut: z.number().min(0, 'Frete de saida nao pode ser negativo').default(0),
  packaging: z.number().min(0, 'Embalagem nao pode ser negativo').default(0),
  marketplaceFee: z.number().min(0).max(100, 'Taxa deve ser entre 0 e 100').default(0),
  otherCosts: z.number().min(0, 'Outros custos nao podem ser negativos').default(0),
});

export type ProfitCalculateInput = z.infer<typeof profitCalculateSchema>;
