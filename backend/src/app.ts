import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { globalLimiter, loginLimiter, registerLimiter, signupLimiter, forgotPasswordLimiter } from './middlewares/rateLimiter';
import router from './routes';

export const createApp = () => {
  const app = express();

  // ── Security ───────────────────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", env.FRONTEND_URL],
        frameSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow loading external images
  }));

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, Postman, curl)
        if (!origin) return callback(null, true);
        const allowedOrigins = [
          env.FRONTEND_URL,
          'https://my.codvedha.com',
          'http://my.codvedha.com',
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:5173'
        ];
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  // Layer 1: Global IP-based (generous for shared campus networks)
  app.use(globalLimiter);

  // Layer 2: Auth endpoints (IP-based, separate counters per endpoint)
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/register', registerLimiter);
  app.use('/api/auth/signup', signupLimiter);
  app.use('/api/auth/forgot-password', forgotPasswordLimiter);
  // Face auth limiter is applied inside auth.routes.ts (not here to avoid double-limiting)

  // Layer 3 (role-based) is applied inside individual route files after authenticate middleware

  // ── Body Parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(compression() as any);

  // ── Logging ───────────────────────────────────────────────────────────────
  if (env.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ── Routes ────────────────────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      success: true,
      application: "CodVedha LMS API",
      status: "Running"
    });
  });

  app.use('/api', router);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Resource not found',
    });
  });

  // ── Error Handler (must be last) ──────────────────────────────────────────
  app.use(errorHandler);

  return app;
};
