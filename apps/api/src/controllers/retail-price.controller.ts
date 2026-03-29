import { Request, Response, NextFunction } from 'express';
import * as retailPriceService from '../services/retail-price.service';
import { RetailPriceQuery, RetailCompareQuery, RetailRefreshBody } from '../validators/retail-price.validator';

export async function getRetailPrices(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { modelId } = req.query as unknown as RetailPriceQuery;
    const prices = await retailPriceService.getRetailPricesForModel(modelId);
    res.json({ success: true, data: prices });
  } catch (err) {
    next(err);
  }
}

export async function compareRetailPrice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { modelId, usedPrice } = req.query as unknown as RetailCompareQuery;
    const comparison = await retailPriceService.getRetailComparison(modelId, Number(usedPrice));
    res.json({ success: true, data: comparison });
  } catch (err) {
    next(err);
  }
}

export async function refreshRetailPrice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { modelId } = req.body as RetailRefreshBody;
    const result = await retailPriceService.refreshRetailPrice(modelId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
