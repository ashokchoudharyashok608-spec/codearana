import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from 'passport';
import { Server as SocketIOServer } from 'socket.io';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { initPassport } from './auth/passport.config';

import { logger } from './shared/utils/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { rateLimiter } from './shared/middleware/rateLimiter';
import { prisma } from './shared/utils/prisma';
import { redis } from './shared/utils/redis';
import { initSocketIO } from './shared/utils/socketio';
import { initQueues } from './shared/utils/queues';

// Routes
import authRouter from './auth/auth.routes';
import problemsRouter from './problems/problems.routes';
import submissionsRouter from './submissions/submissions.routes';
import contestsRouter from './contests/contests.routes';
import paymentsRouter from './payments/payments.routes';
import leaderboardRouter from './leaderboard/leaderboard.routes';
import usersRouter from './users/users.routes';
import adminRouter from './admin/admin.routes';

const app = express();
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});
initSocketIO(io);

// ── Swagger ──────────────────────────────────────────────────────────────────
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CodeArena API',
      version: '1.0.0',
      description: 'Online Coding Judge Platform API',
    },
    servers: [{ url: process.env.API_URL || 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/**/*.routes.ts', './src/**/*.dto.ts'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ── Passport OAuth ───────────────────────────────────────────────────────────
initPassport();
app.use(passport.initialize());

// Raw body for Stripe webhooks BEFORE json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', rateLimiter.general);
app.use('/api/auth/', rateLimiter.auth);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: { database: 'ok', redis: 'ok' },
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: String(err) });
  }
});

// ── Swagger Docs ─────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/problems', problemsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/contests', contestsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');

    await redis.ping();
    logger.info('✅ Redis connected');

    await initQueues();
    logger.info('✅ Job queues initialized');

    server.listen(PORT, () => {
      logger.info(`🚀 CodeArena API running on port ${PORT}`);
      logger.info(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
});

bootstrap();

export { app, server, io };
