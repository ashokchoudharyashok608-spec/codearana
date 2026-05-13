import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as paymentsService from './payments.service';
import { authenticate } from '../shared/middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/payments/create-checkout:
 *   post:
 *     tags: [Payments]
 *     summary: Create a Stripe checkout session (contest entry or subscription)
 */
router.post('/create-checkout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      type: z.enum(['contest_entry', 'subscription']),
      contestId: z.string().optional(),
      plan: z.enum(['PRO', 'ELITE']).optional(),
    });
    const { type, contestId, plan } = schema.parse(req.body);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    let result;
    if (type === 'contest_entry' && contestId) {
      result = await paymentsService.createContestCheckout(contestId, req.user!.id, frontendUrl);
    } else if (type === 'subscription' && plan) {
      result = await paymentsService.createSubscriptionCheckout(plan, req.user!.id, frontendUrl);
    } else {
      return res.status(400).json({ message: 'Invalid checkout type or missing parameters' });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Stripe webhook handler
 *     security: []
 */
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) return res.status(400).json({ message: 'Missing stripe-signature header' });

    await paymentsService.handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get user's payment history
 */
router.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await paymentsService.getPaymentHistory(req.user!.id);
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

export default router;
