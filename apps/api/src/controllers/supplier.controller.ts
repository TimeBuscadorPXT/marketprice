import { Request, Response, NextFunction } from 'express';
import * as supplierService from '../services/supplier.service';

export async function listSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const suppliers = await supplierService.listSuppliers(req.user!.userId);
    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
}

export async function createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplier = await supplierService.createSupplier(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
}

export async function updateSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplier = await supplierService.updateSupplier(
      req.user!.userId,
      req.params.id as string,
      req.body
    );
    res.json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
}

export async function deleteSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await supplierService.deleteSupplier(req.user!.userId, req.params.id as string);
    res.json({ success: true, data: { message: 'Fornecedor removido com sucesso' } });
  } catch (err) {
    next(err);
  }
}

export async function compareSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const region = req.query.region as string;
    const result = await supplierService.compareSuppliers(req.user!.userId, region);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
