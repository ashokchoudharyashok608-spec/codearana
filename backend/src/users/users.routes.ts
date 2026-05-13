import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../shared/utils/prisma';
import { authenticate, optionalAuthenticate } from '../shared/middleware/auth';
import { AppError } from '../shared/middleware/errorHandler';

const router = Router();

/**
 * @openapi
 * /api/users/{username}/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile by username
 *     security: []
 */
router.get('/:username/profile', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findFirst({
      where: { username: req.params.username, deletedAt: null },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true,
        bio: true, rating: true, maxRating: true, totalSolved: true,
        role: true, createdAt: true,
        _count: { select: { submissions: true } },
      },
    });

    if (!user) return next(new AppError('User not found', 404, 'NOT_FOUND'));

    // Submission heatmap (last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const submissionsByDay = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "Submission"
      WHERE user_id = ${user.id}
        AND created_at >= ${oneYearAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const heatmap = submissionsByDay.map((r) => ({
      date: r.date,
      count: Number(r.count),
    }));

    // Verdicts distribution
    const verdictCounts = await prisma.submission.groupBy({
      by: ['verdict'],
      where: { userId: user.id },
      _count: true,
    });

    // Recent AC submissions
    const recentSolved = await prisma.submission.findMany({
      where: { userId: user.id, verdict: 'ACCEPTED' },
      select: {
        id: true, createdAt: true, language: true,
        problem: { select: { slug: true, title: true, difficulty: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      distinct: ['problemId'],
    });

    // Achievements
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });

    // Rating history
    const ratingHistory = await prisma.rating.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Difficulty breakdown
    const solvedByDifficulty = await prisma.$queryRaw<Array<{ difficulty: string; count: bigint }>>`
      SELECT p.difficulty, COUNT(DISTINCT s.problem_id) as count
      FROM "Submission" s
      JOIN "Problem" p ON s.problem_id = p.id
      WHERE s.user_id = ${user.id} AND s.verdict = 'ACCEPTED'
      GROUP BY p.difficulty
    `;

    res.json({
      ...user,
      totalSubmissions: user._count.submissions,
      heatmap,
      verdictCounts: verdictCounts.map((v) => ({ verdict: v.verdict, count: v._count })),
      recentSolved,
      achievements: achievements.map((a) => ({ ...a.achievement, earnedAt: a.earnedAt })),
      ratingHistory,
      solvedByDifficulty: solvedByDifficulty.map((r) => ({
        difficulty: r.difficulty,
        count: Number(r.count),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile
 */
router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      displayName: z.string().min(1).max(50).optional(),
      bio: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
