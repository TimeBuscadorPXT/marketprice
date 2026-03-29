import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service';

export async function getVelocity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getVelocity(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getSellers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getSellers(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMarketHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getMarketHealth(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getListingQuality(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getListingQuality(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
