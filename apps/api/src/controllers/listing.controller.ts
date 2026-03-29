import { Request, Response, NextFunction } from 'express';
import * as listingService from '../services/listing.service';

export async function createListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listings = req.body.listings as Array<{ title: string; price: number }> | undefined;
    if (listings) {
      console.log(`[Listings] Recebendo ${listings.length} anuncios:`);
      listings.slice(0, 5).forEach((l, i) => console.log(`  ${i + 1}. "${l.title}" - R$${l.price}`));
      if (listings.length > 5) console.log(`  ... e mais ${listings.length - 5}`);
    }
    const result = await listingService.createListings(req.user!.userId, req.body);
    console.log(`[Listings] Resultado: ${JSON.stringify(result)}`);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listingService.listListings(req.user!.userId, req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deepUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listingService.deepUpdateListing(req.user!.userId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
