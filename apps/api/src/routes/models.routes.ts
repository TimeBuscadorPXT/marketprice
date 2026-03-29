import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { listModelsQuerySchema, modelParamsSchema } from '../validators/model.validator';
import * as modelController from '../controllers/model.controller';
import { getAllCategories } from '../config/categories';

const router = Router();

router.get('/categories', (_req, res) => {
  res.json({ success: true, data: getAllCategories() });
});

router.get('/', validate(listModelsQuerySchema, 'query'), modelController.listModels);
router.get('/:id', validate(modelParamsSchema, 'params'), modelController.getModelById);

export default router;
