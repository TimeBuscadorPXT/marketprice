import { Request, Response, NextFunction } from 'express';
import * as priceService from '../services/price.service';

export async function getPriceAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await priceService.getPriceAnalysis(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPriceSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await priceService.getPriceSummary(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getRegions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const regions = await priceService.getAvailableRegions(req.user!.userId);
    res.json({ success: true, data: regions });
  } catch (err) {
    next(err);
  }
}
