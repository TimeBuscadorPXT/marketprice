import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { chatSchema } from '../validators/chat.validator';
import * as chatController from '../controllers/chat.controller';

const router = Router();

router.post('/', authenticate, validate(chatSchema), chatController.sendMessage);

export default router;
