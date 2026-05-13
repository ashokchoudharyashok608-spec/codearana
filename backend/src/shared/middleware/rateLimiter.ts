import rateLimit from 'express-rate-limit';

export const rateLimiter = {
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later' },
  }),

  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many auth attempts, please try again later' },
  }),

  submissions: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    keyGenerator: (req) => req.user?.id || req.ip || 'anon',
    standardHeaders: true,
    message: { message: 'Submission rate limit exceeded (max 5/min)' },
  }),
};
