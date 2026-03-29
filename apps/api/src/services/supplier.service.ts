import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { CreateSupplierInput, UpdateSupplierInput } from '../validators/supplier.validator';
import { getMarketAverage } from './price.service';

export async function listSuppliers(userId: string) {
  return prisma.supplier.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      price: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      model: { select: { id: true, brand: true, name: true, variant: true } },
    },
  });
}

export async function createSupplier(userId: string, input: CreateSupplierInput) {
  return prisma.supplier.create({
    data: {
      userId,
      modelId: input.modelId,
      name: input.name,
      price: input.price,
      notes: input.notes ?? null,
    },
    select: {
      id: true,
      name: true,
      price: true,
      notes: true,
      createdAt: true,
      model: { select: { id: true, brand: true, name: true, variant: true } },
    },
  });
}

export async function updateSupplier(userId: string, id: string, input: UpdateSupplierInput) {
  const existing = await prisma.supplier.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError('Fornecedor', id);
  }

  return prisma.supplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.modelId !== undefined && { modelId: input.modelId }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    select: {
      id: true,
      name: true,
      price: true,
      notes: true,
      updatedAt: true,
      model: { select: { id: true, brand: true, name: true, variant: true } },
    },
  });
}

export async function deleteSupplier(userId: string, id: string) {
  const existing = await prisma.supplier.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError('Fornecedor', id);
  }

  await prisma.supplier.delete({ where: { id } });
}

interface SupplierWithModel {
  id: string;
  name: string;
  price: { toString(): string };
  model: { id: string; brand: string; name: string; variant: string };
}

export async function compareSuppliers(userId: string, region: string) {
  const suppliers: SupplierWithModel[] = await prisma.supplier.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      price: true,
      model: { select: { id: true, brand: true, name: true, variant: true } },
    },
  });

  const results = await Promise.all(
    suppliers.map(async (supplier: SupplierWithModel) => {
      const marketAverage = await getMarketAverage(supplier.model.id, region);
      const supplierPrice = Number(supplier.price);
      const margin = marketAverage > 0
        ? Math.round(((marketAverage - supplierPrice) / marketAverage) * 10000) / 100
        : 0;

      let recommendation: string;
      if (marketAverage === 0) {
        recommendation = 'Sem dados de mercado suficientes';
      } else if (margin >= 20) {
        recommendation = 'Excelente - margem alta';
      } else if (margin >= 10) {
        recommendation = 'Bom - margem razoavel';
      } else if (margin >= 0) {
        recommendation = 'Marginal - margem baixa';
      } else {
        recommendation = 'Nao recomendado - preco acima do mercado';
      }

      return {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          price: supplierPrice,
          model: supplier.model,
        },
        marketAverage,
        margin,
        recommendation,
      };
    })
  );

  return results;
}
