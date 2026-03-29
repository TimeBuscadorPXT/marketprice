import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import * as authController from '../controllers/auth.controller';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas de login. Tente novamente em 1 minuto.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitos registros. Tente novamente em 1 hora.' },
});

router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.get('/me', authenticate, authController.getMe);
router.post('/onboarding/complete', authenticate, authController.completeOnboarding);

export default router;
