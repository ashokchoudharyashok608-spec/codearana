import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler';
import { authenticate } from '../shared/middleware/auth';
import { rateLimiter } from '../shared/middleware/rateLimiter';
import { submissionQueue } from '../shared/utils/queues';
import { checkRateLimit } from '../shared/utils/redis';
import { logger } from '../shared/utils/logger';

const router = Router();

const submitSchema = z.object({
  problemId: z.string(),
  language: z.enum(['CPP', 'JAVA', 'PYTHON3', 'JAVASCRIPT', 'GO', 'RUST']),
  code: z.string().min(1).max(65536),
  contestId: z.string().optional(),
  // For custom test run (not a real submission)
  customInput: z.string().optional(),
  isCustomRun: z.boolean().default(false),
});

/**
 * @openapi
 * /api/submissions:
 *   post:
 *     tags: [Submissions]
 *     summary: Submit code for a problem
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [problemId, language, code]
 *             properties:
 *               problemId: { type: string }
 *               language: { type: string, enum: [CPP, JAVA, PYTHON3, JAVASCRIPT, GO, RUST] }
 *               code: { type: string }
 *               contestId: { type: string }
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = submitSchema.parse(req.body);
    const userId = req.user!.id;

    // Rate limit: 5 submissions per minute per user
    const rateKey = `sub_rate:${userId}`;
    const { allowed, remaining, resetAt } = await checkRateLimit(rateKey, 5, 60);
    if (!allowed) {
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', resetAt);
      return next(new AppError('Submission rate limit exceeded (max 5/min)', 429, 'RATE_LIMITED'));
    }

    // Check subscription for daily limits
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (subscription?.plan === 'FREE') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyCount = await prisma.submission.count({
        where: { userId, createdAt: { gte: today } },
      });
      if (dailyCount >= 5) {
        return next(new AppError('Daily submission limit reached (Free plan: 5/day). Upgrade to Pro for unlimited.', 429, 'DAILY_LIMIT'));
      }
    }

    // Validate problem exists
    const problem = await prisma.problem.findFirst({
      where: { id: data.problemId, isPublished: true, deletedAt: null },
      select: { id: true, timeLimit: true, memoryLimit: true, slug: true },
    });
    if (!problem) return next(new AppError('Problem not found', 404, 'NOT_FOUND'));

    // If contest submission, verify registration
    if (data.contestId) {
      const participant = await prisma.contestParticipant.findUnique({
        where: { contestId_userId: { contestId: data.contestId, userId } },
      });
      if (!participant) {
        return next(new AppError('Not registered for this contest', 403, 'FORBIDDEN'));
      }

      const contest = await prisma.contest.findUnique({
        where: { id: data.contestId },
        select: { status: true, startTime: true, endTime: true },
      });
      if (contest?.status !== 'LIVE') {
        return next(new AppError('Contest is not live', 400, 'CONTEST_NOT_LIVE'));
      }
    }

    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId: data.problemId,
        contestId: data.contestId,
        language: data.language as any,
        code: data.code,
        verdict: 'PENDING',
        isContestSub: !!data.contestId,
        testsTotal: 0,
      },
    });

    // Queue the job (Elite users get priority queue)
    const priority = subscription?.plan === 'ELITE' ? 1 : subscription?.plan === 'PRO' ? 5 : 10;
    await submissionQueue.add(
      'judge',
      {
        submissionId: submission.id,
        userId,
        problemId: data.problemId,
        contestId: data.contestId,
        language: data.language,
        code: data.code,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
      },
      { priority },
    );

    logger.info(`Submission queued: ${submission.id} (${data.language}) by ${userId}`);

    res.status(201).json({
      id: submission.id,
      verdict: 'PENDING',
      message: 'Submission queued for judging',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/submissions/{id}:
 *   get:
 *     tags: [Submissions]
 *     summary: Get submission details
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        problem: { select: { slug: true, title: true } },
        user: { select: { username: true } },
      },
    });

    if (!submission) return next(new AppError('Submission not found', 404, 'NOT_FOUND'));

    // Users can only see their own submissions (unless admin)
    if (submission.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    }

    res.json(submission);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/submissions:
 *   get:
 *     tags: [Submissions]
 *     summary: Get user's submission history
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, problemId, verdict } = z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      problemId: z.string().optional(),
      verdict: z.string().optional(),
    }).parse(req.query);

    const skip = (page - 1) * Math.min(limit, 50);
    const where: any = { userId: req.user!.id };
    if (problemId) where.problemId = problemId;
    if (verdict) where.verdict = verdict;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: { problem: { select: { slug: true, title: true, difficulty: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 50),
      }),
      prisma.submission.count({ where }),
    ]);

    res.json({
      data: submissions,
      meta: { page, limit, total, totalPages: Math.ceil(total / Math.min(limit, 50)) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
