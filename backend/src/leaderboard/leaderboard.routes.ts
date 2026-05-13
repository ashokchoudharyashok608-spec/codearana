import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../shared/utils/prisma';

const router = Router();

/**
 * @openapi
 * /api/leaderboard:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Get global leaderboard (ELO-style rating)
 *     security: []
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50 } = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
    }).parse(req.query);

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null, isEmailVerified: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          rating: true,
          maxRating: true,
          totalSolved: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { rating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { deletedAt: null, isEmailVerified: true } }),
    ]);

    const data = users.map((u, idx) => ({
      rank: skip + idx + 1,
      ...u,
      totalSubmissions: u._count.submissions,
    }));

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
