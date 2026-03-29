import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  retailPriceQuerySchema,
  retailCompareSchema,
  retailRefreshSchema,
} from '../validators/retail-price.validator';
import * as retailPriceController from '../controllers/retail-price.controller';

const router = Router();

router.get(
  '/',
  authenticate,
  validate(retailPriceQuerySchema, 'query'),
  retailPriceController.getRetailPrices
);

router.get(
  '/compare',
  authenticate,
  validate(retailCompareSchema, 'query'),
  retailPriceController.compareRetailPrice
);

router.post(
  '/refresh',
  authenticate,
  validate(retailRefreshSchema, 'body'),
  retailPriceController.refreshRetailPrice
);

export default router;
