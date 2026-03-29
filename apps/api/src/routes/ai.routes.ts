import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { insightsQuerySchema, analyzeDealSchema, modelSummaryQuerySchema, aiChatSchema } from '../validators/ai.validator';
import * as aiController from '../controllers/ai.controller';

const router = Router();

router.get('/insights', authenticate, validate(insightsQuerySchema, 'query'), aiController.getInsights);
router.post('/analyze-deal', authenticate, validate(analyzeDealSchema), aiController.analyzeDeal);
router.get('/model-summary', authenticate, validate(modelSummaryQuerySchema, 'query'), aiController.getModelSummary);
router.post('/chat', authenticate, validate(aiChatSchema), aiController.aiChat);

export default router;
