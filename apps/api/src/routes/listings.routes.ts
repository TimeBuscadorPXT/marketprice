import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createListingsSchema, listListingsQuerySchema } from '../validators/listing.validator';
import { deepUpdateSchema } from '../validators/deep-update.validator';
import * as listingController from '../controllers/listing.controller';

const router = Router();

router.post('/', authenticate, validate(createListingsSchema), listingController.createListings);
router.get('/', authenticate, validate(listListingsQuerySchema, 'query'), listingController.listListings);
router.put('/deep-update', authenticate, validate(deepUpdateSchema), listingController.deepUpdate);

export default router;
