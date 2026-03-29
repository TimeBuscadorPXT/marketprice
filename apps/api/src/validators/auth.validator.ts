import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ error: 'Nome e obrigatorio' })
    .min(2, 'Nome deve ter no minimo 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  email: z
    .string({ error: 'Email e obrigatorio' })
    .email('Email invalido'),
  password: z
    .string({ error: 'Senha e obrigatoria' })
    .min(6, 'Senha deve ter no minimo 6 caracteres'),
  region: z
    .string()
    .max(100, 'Regiao deve ter no maximo 100 caracteres')
    .default(''),
});

export const loginSchema = z.object({
  email: z
    .string({ error: 'Email e obrigatorio' })
    .email('Email invalido'),
  password: z
    .string({ error: 'Senha e obrigatoria' })
    .min(1, 'Senha e obrigatoria'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ error: 'Refresh token e obrigatorio' })
    .min(1, 'Refresh token e obrigatorio'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
