import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middlewares/authenticate';
import { faceAuthLimiter } from '../../middlewares/rateLimiter';
import { validate } from '../../middlewares/validate';
import {
  loginSchema,
  registerSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  faceEnrollSchema,
  faceVerifySchema,
} from './auth.validator';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);

router.post('/face-enroll', faceAuthLimiter, validate(faceEnrollSchema), authController.enrollFace);
router.post('/face-verify', faceAuthLimiter, validate(faceVerifySchema), authController.verifyFace);

router.post('/refresh', authController.refresh);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
