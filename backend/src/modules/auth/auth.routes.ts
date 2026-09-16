import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middlewares/authenticate';
import { verifyOrigin } from '../../middlewares/verifyOrigin';
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

// Cookie-authenticated → add CSRF Origin/Referer check (verifyOrigin) since the
// refresh cookie is sent automatically by the browser. Non-browser callers
// (mobile/native) with no Origin/Referer are unaffected.
router.post('/refresh', verifyOrigin, authController.refresh);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Session heartbeat — does its own token/session inspection (never hard-401s)
router.get('/session-check', authController.sessionCheck);

// Protected routes (also cookie-touching on logout → CSRF Origin check)
router.post('/logout', verifyOrigin, authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
