import { Request, Response, NextFunction } from 'express';
import * as dealsService from '../services/deals.service';

export async function getDeals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dealsService.getDeals(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
