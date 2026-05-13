import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as problemsService from './problems.service';
import { authenticate, optionalAuthenticate, requireSetterOrAdmin, requireAdmin } from '../shared/middleware/auth';

const router = Router();

const createProblemSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  tags: z.array(z.string()).default([]),
  timeLimit: z.number().int().min(100).max(10000).default(2000),
  memoryLimit: z.number().int().min(16).max(512).default(256),
  constraints: z.string().optional(),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  explanation: z.string().optional(),
  isPublished: z.boolean().default(false),
  isSpecialJudge: z.boolean().default(false),
  checkerScript: z.string().optional(),
  testCases: z.array(z.object({
    input: z.string(),
    output: z.string(),
    isHidden: z.boolean().default(false),
    isSample: z.boolean().default(false),
    points: z.number().default(0),
    explanation: z.string().optional(),
  })).optional(),
});

/**
 * @openapi
 * /api/problems:
 *   get:
 *     tags: [Problems]
 *     summary: List all published problems (paginated, filterable)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: difficulty
 *         schema: { type: string, enum: [EASY, MEDIUM, HARD] }
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 */
router.get('/', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      tags: z.string().optional(),
      search: z.string().optional(),
    }).parse(req.query);

    const result = await problemsService.getProblems({
      ...query,
      tags: query.tags?.split(',').filter(Boolean),
      userId: req.user?.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/problems/{slug}:
 *   get:
 *     tags: [Problems]
 *     summary: Get problem details by slug
 *     security: []
 */
router.get('/:slug', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const problem = await problemsService.getProblemBySlug(req.params.slug, req.user?.id);
    res.json(problem);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/problems:
 *   post:
 *     tags: [Problems]
 *     summary: Create a new problem (SETTER/ADMIN only)
 */
router.post('/', authenticate, requireSetterOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProblemSchema.parse(req.body);
    const problem = await problemsService.createProblem(data, req.user!.id);
    res.status(201).json(problem);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/problems/{id}:
 *   patch:
 *     tags: [Problems]
 *     summary: Update a problem (SETTER/ADMIN only)
 */
router.patch('/:id', authenticate, requireSetterOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProblemSchema.partial().parse(req.body);
    const problem = await problemsService.updateProblem(req.params.id, data);
    res.json(problem);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/problems/{id}:
 *   delete:
 *     tags: [Problems]
 *     summary: Soft-delete a problem (ADMIN only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await problemsService.deleteProblem(req.params.id);
    res.json({ message: 'Problem deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
