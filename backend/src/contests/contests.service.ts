import { prisma } from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler';
import { logger } from '../shared/utils/logger';
import slugify from 'slugify';

export async function getContests(query: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 50);
  const skip = (page - 1) * limit;

  const where: any = { isPublic: true };
  if (query.status) where.status = query.status;

  const [contests, total] = await Promise.all([
    prisma.contest.findMany({
      where,
      include: {
        _count: { select: { participants: true, problems: true } },
      },
      orderBy: { startTime: 'asc' },
      skip,
      take: limit,
    }),
    prisma.contest.count({ where }),
  ]);

  return {
    data: contests,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getContestBySlug(slug: string, userId?: string) {
  const contest = await prisma.contest.findFirst({
    where: { slug, isPublic: true },
    include: {
      problems: {
        include: {
          problem: {
            select: { slug: true, title: true, difficulty: true, acceptedCount: true, submissionCount: true },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
      _count: { select: { participants: true } },
    },
  });

  if (!contest) throw new AppError('Contest not found', 404, 'NOT_FOUND');

  let isRegistered = false;
  let participant = null;
  if (userId) {
    participant = await prisma.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: contest.id, userId } },
    });
    isRegistered = !!participant;
  }

  // Hide problems if contest hasn't started yet
  const now = new Date();
  const problems = contest.status === 'LIVE' || contest.status === 'ENDED' || contest.status === 'RESULTS'
    ? contest.problems.filter(cp => !cp.unlockAt || cp.unlockAt <= now)
    : [];

  return { ...contest, problems, isRegistered, participant };
}

export async function registerForContest(contestId: string, userId: string) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, status: true, registrationEnd: true, maxParticipants: true, entryFee: true, title: true },
  });

  if (!contest) throw new AppError('Contest not found', 404, 'NOT_FOUND');

  if (!['REGISTRATION', 'LIVE'].includes(contest.status)) {
    throw new AppError('Registration is not open for this contest', 400, 'REGISTRATION_CLOSED');
  }

  if (contest.registrationEnd && contest.registrationEnd < new Date()) {
    throw new AppError('Registration deadline has passed', 400, 'REGISTRATION_CLOSED');
  }

  if (contest.entryFee > 0) {
    throw new AppError('This contest requires payment. Use the payment endpoint.', 402, 'PAYMENT_REQUIRED');
  }

  if (contest.maxParticipants) {
    const count = await prisma.contestParticipant.count({ where: { contestId } });
    if (count >= contest.maxParticipants) {
      throw new AppError('Contest is full', 400, 'CONTEST_FULL');
    }
  }

  const existing = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });

  if (existing) throw new AppError('Already registered for this contest', 409, 'ALREADY_REGISTERED');

  const participant = await prisma.contestParticipant.create({
    data: { contestId, userId },
  });

  return participant;
}

export async function getScoreboard(contestId: string, limit = 100) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { type: true, status: true },
  });

  if (!contest) throw new AppError('Contest not found', 404, 'NOT_FOUND');

  const participants = await prisma.contestParticipant.findMany({
    where: { contestId, isDisqualified: false },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, rating: true } },
    },
    orderBy: contest.type === 'ICPC'
      ? [{ score: 'desc' }, { penalty: 'asc' }]
      : [{ score: 'desc' }],
    take: limit,
  });

  // Get per-problem solve status for each participant
  const problemSolves = await prisma.submission.groupBy({
    by: ['userId', 'problemId'],
    where: {
      contestId,
      verdict: 'ACCEPTED',
    },
    _count: true,
  });

  const solveMap = new Map<string, Set<string>>();
  for (const s of problemSolves) {
    if (!solveMap.has(s.userId)) solveMap.set(s.userId, new Set());
    solveMap.get(s.userId)!.add(s.problemId);
  }

  return participants.map((p, idx) => ({
    rank: idx + 1,
    userId: p.userId,
    username: p.user.username,
    displayName: p.user.displayName,
    avatarUrl: p.user.avatarUrl,
    rating: p.user.rating,
    score: p.score,
    penalty: p.penalty,
    solvedCount: solveMap.get(p.userId)?.size || 0,
  }));
}

export async function updateContestScoreboard(
  contestId: string,
  userId: string,
  problemId: string,
  verdict: string,
  score: number,
) {
  const participant = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });

  if (!participant) return;

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { type: true, startTime: true },
  });

  if (!contest) return;

  if (verdict === 'ACCEPTED') {
    // Check if already solved this problem in this contest
    const prevAC = await prisma.submission.count({
      where: { contestId, userId, problemId, verdict: 'ACCEPTED', id: { not: undefined } },
    });

    if (prevAC <= 1) {
      // First AC for this problem
      const cp = await prisma.contestProblem.findFirst({
        where: { contestId, problemId },
        select: { points: true },
      });
      const points = cp?.points || score;

      let penalty = 0;
      if (contest.type === 'ICPC') {
        // Count wrong attempts before this AC
        const wrongAttempts = await prisma.submission.count({
          where: { contestId, userId, problemId, verdict: { not: 'ACCEPTED' } },
        });
        const elapsed = Math.floor((Date.now() - contest.startTime.getTime()) / 60000);
        penalty = elapsed + wrongAttempts * 20;
      }

      await prisma.contestParticipant.update({
        where: { contestId_userId: { contestId, userId } },
        data: {
          score: { increment: points },
          penalty: { increment: penalty },
        },
      });
    }
  }
}

export async function createContest(data: any, createdById: string) {
  const slug = await generateUniqueContestSlug(data.title);
  return prisma.contest.create({
    data: { ...data, slug, createdById },
  });
}

export async function updateContest(id: string, data: any) {
  return prisma.contest.update({ where: { id }, data });
}

async function generateUniqueContestSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let suffix = 1;
  while (await prisma.contest.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}
