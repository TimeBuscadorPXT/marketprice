import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createAlertSchema, updateAlertSchema } from '../validators/alerts.validator';
import * as alertsController from '../controllers/alerts.controller';

const router = Router();

router.get('/', authenticate, alertsController.getAlerts);
router.post('/', authenticate, validate(createAlertSchema), alertsController.createAlert);
router.put('/:id', authenticate, validate(updateAlertSchema), alertsController.updateAlert);
router.delete('/:id', authenticate, alertsController.deleteAlert);
router.post('/check', authenticate, alertsController.checkAlerts);
router.post('/test', authenticate, alertsController.testNotification);

export default router;
