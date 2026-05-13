import Stripe from 'stripe';
import { prisma } from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler';
import { logger } from '../shared/utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const PLAN_PRICES: Record<string, string | undefined> = {
  PRO: process.env.STRIPE_PRO_PRICE_ID,
  ELITE: process.env.STRIPE_ELITE_PRICE_ID,
};

export async function createContestCheckout(contestId: string, userId: string, frontendUrl: string) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, title: true, entryFee: true, status: true, stripePriceId: true },
  });

  if (!contest) throw new AppError('Contest not found', 404, 'NOT_FOUND');
  if (contest.entryFee === 0) throw new AppError('This contest is free', 400, 'FREE_CONTEST');
  if (!['REGISTRATION', 'LIVE'].includes(contest.status)) {
    throw new AppError('Registration is not open', 400, 'REGISTRATION_CLOSED');
  }

  const existing = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });
  if (existing) throw new AppError('Already registered', 409, 'ALREADY_REGISTERED');

  // Get or create Stripe customer
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName || user.username,
      metadata: { userId },
    });
    customerId = customer.id;
    if (user.subscription) {
      await prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }
  }

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      userId,
      contestId,
      amount: contest.entryFee,
      status: 'PENDING',
      description: `Contest entry: ${contest.title}`,
    },
  });

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: contest.entryFee,
        product_data: {
          name: `CodeArena: ${contest.title}`,
          description: 'Contest entry fee',
        },
      },
      quantity: 1,
    }],
    metadata: {
      paymentId: payment.id,
      contestId,
      userId,
      type: 'contest_entry',
    },
    success_url: `${frontendUrl}/contests/${contestId}?payment=success`,
    cancel_url: `${frontendUrl}/contests/${contestId}?payment=cancelled`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  });

  return { sessionId: session.id, url: session.url };
}

export async function createSubscriptionCheckout(plan: string, userId: string, frontendUrl: string) {
  const priceId = PLAN_PRICES[plan];
  if (!priceId) throw new AppError('Invalid plan', 400, 'INVALID_PLAN');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName || user.username,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, plan, type: 'subscription' },
    success_url: `${frontendUrl}/profile?subscription=success`,
    cancel_url: `${frontendUrl}/pricing?subscription=cancelled`,
    subscription_data: { metadata: { userId, plan } },
  });

  return { sessionId: session.id, url: session.url };
}

export async function handleWebhook(rawBody: Buffer, signature: string) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    logger.error('Stripe webhook signature verification failed:', err.message);
    throw new AppError('Invalid webhook signature', 400, 'INVALID_SIGNATURE');
  }

  logger.info(`Stripe webhook: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      logger.debug(`Unhandled webhook event: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { paymentId, contestId, userId, type } = session.metadata || {};

  if (type === 'contest_entry' && paymentId) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED', stripePaymentIntentId: session.payment_intent as string },
    });

    // Register user for contest
    if (contestId && userId) {
      await prisma.contestParticipant.upsert({
        where: { contestId_userId: { contestId, userId } },
        update: {},
        create: { contestId, userId },
      });
      logger.info(`User ${userId} registered for contest ${contestId} after payment`);
    }
  }

  if (type === 'subscription' && session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    await handleSubscriptionUpdated(sub);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const plan = subscription.metadata?.plan || 'FREE';
  const status = mapStripeStatus(subscription.status);

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: plan as any,
      status: status as any,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    create: {
      userId,
      plan: plan as any,
      status: status as any,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { plan: 'FREE', status: 'CANCELLED', stripeSubscriptionId: null },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: 'PAST_DUE' },
  });
  logger.warn(`Payment failed for customer ${customerId}`);
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  const map: Record<string, string> = {
    active: 'ACTIVE',
    trialing: 'TRIALING',
    canceled: 'CANCELLED',
    past_due: 'PAST_DUE',
    unpaid: 'PAST_DUE',
    incomplete: 'PAST_DUE',
    incomplete_expired: 'CANCELLED',
  };
  return map[status] || 'ACTIVE';
}

export async function getPaymentHistory(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    include: { contest: { select: { title: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
