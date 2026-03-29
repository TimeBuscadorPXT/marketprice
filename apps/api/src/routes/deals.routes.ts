import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { dealsQuerySchema } from '../validators/deals.validator';
import * as dealsController from '../controllers/deals.controller';

const router = Router();

router.get('/', authenticate, validate(dealsQuerySchema, 'query'), dealsController.getDeals);

export default router;
