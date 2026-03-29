import { Request, Response, NextFunction } from 'express';
import * as modelService from '../services/model.service';

export async function listModels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brand = req.query.brand as string | undefined;
    const category = req.query.category as string | undefined;
    const models = await modelService.listModels(brand, category);
    res.json({ success: true, data: models });
  } catch (err) {
    next(err);
  }
}

export async function getModelById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const model = await modelService.getModelById(req.params.id as string);
    res.json({ success: true, data: model });
  } catch (err) {
    next(err);
  }
}
