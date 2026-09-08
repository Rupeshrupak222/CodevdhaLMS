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

  // Trust the first proxy hop (hosting load balancer / reverse proxy) so req.ip
  // reflects the real client — required for correct IP rate limiting and audit IPs.
  app.set('trust proxy', 1);

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

  // Explicit hardening headers (belt-and-suspenders alongside helmet)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY'); // clickjacking protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // HSTS only makes sense over HTTPS (production behind TLS)
    if (env.isProd) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    }
    next();
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        // Requests with no Origin header (server-to-server, curl, Postman, some
        // native clients). Allowed in dev for tooling convenience, but rejected
        // in production to reduce the cross-origin attack surface for the
        // credentialed API.
        if (!origin) return callback(null, !env.isProd);
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'X-Timezone'],
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
