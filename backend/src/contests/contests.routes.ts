import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as contestsService from './contests.service';
import { authenticate, optionalAuthenticate, requireAdmin, requireSetterOrAdmin } from '../shared/middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/contests:
 *   get:
 *     tags: [Contests]
 *     summary: List contests (upcoming, live, past)
 *     security: []
 */
router.get('/', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = z.object({
      status: z.enum(['DRAFT','REGISTRATION','LIVE','ENDED','RESULTS']).optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }).parse(req.query);

    const result = await contestsService.getContests(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/contests/{slug}:
 *   get:
 *     tags: [Contests]
 *     summary: Get contest details by slug
 *     security: []
 */
router.get('/:slug', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contest = await contestsService.getContestBySlug(req.params.slug, req.user?.id);
    res.json(contest);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/contests/{id}/register:
 *   post:
 *     tags: [Contests]
 *     summary: Register for a free contest
 */
router.post('/:id/register', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participant = await contestsService.registerForContest(req.params.id, req.user!.id);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/contests/{id}/scoreboard:
 *   get:
 *     tags: [Contests]
 *     summary: Get live contest scoreboard
 *     security: []
 */
router.get('/:id/scoreboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = z.coerce.number().max(500).default(100).parse(req.query.limit);
    const scoreboard = await contestsService.getScoreboard(req.params.id, limit);
    res.json(scoreboard);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/contests:
 *   post:
 *     tags: [Contests]
 *     summary: Create a contest (SETTER/ADMIN only)
 */
router.post('/', authenticate, requireSetterOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      title: z.string().min(3).max(200),
      description: z.string(),
      type: z.enum(['ICPC', 'IOI']).default('ICPC'),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      registrationEnd: z.string().datetime().optional(),
      entryFee: z.number().int().min(0).default(0),
      prizePool: z.number().int().min(0).default(0),
      maxParticipants: z.number().int().optional(),
      isPublic: z.boolean().default(true),
    });
    const data = schema.parse(req.body);
    const contest = await contestsService.createContest(data, req.user!.id);
    res.status(201).json(contest);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/contests/{id}:
 *   patch:
 *     tags: [Contests]
 *     summary: Update a contest (SETTER/ADMIN only)
 */
router.patch('/:id', authenticate, requireSetterOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['DRAFT','REGISTRATION','LIVE','ENDED','RESULTS']).optional(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      entryFee: z.number().int().min(0).optional(),
      prizePool: z.number().int().min(0).optional(),
      isPublic: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const contest = await contestsService.updateContest(req.params.id, data);
    res.json(contest);
  } catch (err) {
    next(err);
  }
});

export default router;
