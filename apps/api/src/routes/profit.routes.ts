import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { profitCalculateSchema } from '../validators/profit.validator';
import * as profitController from '../controllers/profit.controller';

const router = Router();

router.post('/calculate', authenticate, validate(profitCalculateSchema), profitController.calculateProfit);

export default router;
