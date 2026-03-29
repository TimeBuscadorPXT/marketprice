import { Request, Response, NextFunction } from 'express';
import * as profitService from '../services/profit.service';

export async function calculateProfit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await profitService.calculateProfit(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
