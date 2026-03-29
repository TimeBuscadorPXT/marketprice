import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export async function listModels(brand?: string, category?: string) {
  const where: Record<string, unknown> = {};
  if (brand) where.brand = { equals: brand, mode: 'insensitive' as const };
  if (category) where.category = category;

  const models = await prisma.product.findMany({
    where,
    orderBy: [{ brand: 'asc' }, { name: 'asc' }, { variant: 'asc' }],
    select: {
      id: true,
      category: true,
      brand: true,
      name: true,
      variant: true,
      aliases: true,
      _count: { select: { listings: true } },
    },
  });

  return models;
}

export async function getModelById(id: string) {
  const model = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      brand: true,
      name: true,
      variant: true,
      aliases: true,
      _count: { select: { listings: true, suppliers: true } },
    },
  });

  if (!model) {
    throw new NotFoundError('Modelo', id);
  }

  return model;
}
