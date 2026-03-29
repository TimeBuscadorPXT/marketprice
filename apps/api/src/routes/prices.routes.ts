import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { priceQuerySchema, priceSummaryQuerySchema } from '../validators/price.validator';
import * as priceController from '../controllers/price.controller';

const router = Router();

router.get('/regions', authenticate, priceController.getRegions);
router.get('/summary', authenticate, validate(priceSummaryQuerySchema, 'query'), priceController.getPriceSummary);
router.get('/', authenticate, validate(priceQuerySchema, 'query'), priceController.getPriceAnalysis);

export default router;
