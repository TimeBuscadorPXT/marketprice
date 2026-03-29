import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { velocityQuerySchema, sellersQuerySchema, marketHealthQuerySchema, listingQualityQuerySchema } from '../validators/analytics.validator';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

router.get('/velocity', authenticate, validate(velocityQuerySchema, 'query'), analyticsController.getVelocity);
router.get('/sellers', authenticate, validate(sellersQuerySchema, 'query'), analyticsController.getSellers);
router.get('/market-health', authenticate, validate(marketHealthQuerySchema, 'query'), analyticsController.getMarketHealth);
router.get('/listing-quality', authenticate, validate(listingQualityQuerySchema, 'query'), analyticsController.getListingQuality);

export default router;
