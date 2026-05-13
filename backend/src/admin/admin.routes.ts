import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../shared/utils/prisma';
import { authenticate, requireAdmin } from '../shared/middleware/auth';
import { getQueueStats } from '../shared/utils/queues';
import { getJudge0Health } from '../submissions/judge0.client';
import { getAllProblemsAdmin } from '../problems/problems.service';
import { submissionQueue } from '../shared/utils/queues';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireAdmin);

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get platform statistics
 */
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers, totalProblems, totalSubmissions, totalContests,
      recentSubmissions, queueStats, judge0Healthy,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.problem.count({ where: { deletedAt: null } }),
      prisma.submission.count(),
      prisma.contest.count(),
      prisma.submission.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      getQueueStats(),
      getJudge0Health(),
    ]);

    const verdictDist = await prisma.submission.groupBy({
      by: ['verdict'],
      _count: true,
    });

    const dailySubmissions = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "Submission"
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      totals: { users: totalUsers, problems: totalProblems, submissions: totalSubmissions, contests: totalContests },
      recent: { submissionsToday: recentSubmissions },
      queue: queueStats,
      system: { judge0: judge0Healthy ? 'healthy' : 'down' },
      verdictDistribution: verdictDist.map((v) => ({ verdict: v.verdict, count: v._count })),
      dailySubmissions: dailySubmissions.map((r) => ({ date: r.date, count: Number(r.count) })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, search } = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(50),
      search: z.string().optional(),
    }).parse(req.query);

    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, displayName: true,
          role: true, rating: true, totalSolved: true, isEmailVerified: true,
          createdAt: true, subscription: { select: { plan: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, meta: { page, limit, total } });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user role
 */
router.patch('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = z.object({ role: z.enum(['USER', 'SETTER', 'ADMIN']) }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: role as any },
      select: { id: true, username: true, role: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/problems:
 *   get:
 *     tags: [Admin]
 *     summary: List all problems including unpublished
 */
router.get('/problems', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(50),
    }).parse(req.query);

    const result = await getAllProblemsAdmin({ page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/submissions/{id}/rejudge:
 *   post:
 *     tags: [Admin]
 *     summary: Rejudge a submission
 */
router.post('/submissions/:id/rejudge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: { problem: { select: { timeLimit: true, memoryLimit: true } } },
    });

    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    await prisma.submission.update({
      where: { id: submission.id },
      data: { verdict: 'PENDING', testsPassed: 0, testsTotal: 0, errorOutput: null },
    });

    await submissionQueue.add('judge', {
      submissionId: submission.id,
      userId: submission.userId,
      problemId: submission.problemId,
      contestId: submission.contestId,
      language: submission.language,
      code: submission.code,
      timeLimit: submission.problem.timeLimit,
      memoryLimit: submission.problem.memoryLimit,
    }, { priority: 1 });

    res.json({ message: 'Submission queued for rejudging', submissionId: submission.id });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/submissions:
 *   get:
 *     tags: [Admin]
 *     summary: List all submissions with filters
 */
router.get('/submissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, verdict, userId, problemId } = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(50),
      verdict: z.string().optional(),
      userId: z.string().optional(),
      problemId: z.string().optional(),
    }).parse(req.query);

    const skip = (page - 1) * limit;
    const where: any = {};
    if (verdict) where.verdict = verdict;
    if (userId) where.userId = userId;
    if (problemId) where.problemId = problemId;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          user: { select: { username: true } },
          problem: { select: { slug: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ]);

    res.json({ data: submissions, meta: { page, limit, total } });
  } catch (err) {
    next(err);
  }
});

export default router;
