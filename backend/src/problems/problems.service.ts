import { prisma } from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler';
import { encrypt, decrypt } from '../shared/utils/encryption';
import sanitizeHtml from 'sanitize-html';
import slugify from 'slugify';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'pre', 'code', 'blockquote']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height'],
    code: ['class'],
    pre: ['class'],
  },
};

export async function getProblems(query: {
  page?: number;
  limit?: number;
  difficulty?: string;
  tags?: string[];
  search?: string;
  userId?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = { isPublished: true, deletedAt: null };
  if (query.difficulty) where.difficulty = query.difficulty;
  if (query.tags?.length) where.tags = { hasSome: query.tags };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { tags: { hasSome: [query.search.toLowerCase()] } },
    ];
  }

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      select: {
        id: true, slug: true, title: true, difficulty: true, tags: true,
        acceptedCount: true, submissionCount: true, createdAt: true,
        setter: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.problem.count({ where }),
  ]);

  // If user is authenticated, add their solve status
  let solvedSet = new Set<string>();
  if (query.userId) {
    const solved = await prisma.submission.findMany({
      where: { userId: query.userId, verdict: 'ACCEPTED' },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    solvedSet = new Set(solved.map((s) => s.problemId));
  }

  const enriched = problems.map((p) => ({
    ...p,
    acceptanceRate: p.submissionCount > 0
      ? Math.round((p.acceptedCount / p.submissionCount) * 100)
      : 0,
    isSolved: solvedSet.has(p.id),
  }));

  return {
    data: enriched,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getProblemBySlug(slug: string, userId?: string) {
  const problem = await prisma.problem.findFirst({
    where: { slug, isPublished: true, deletedAt: null },
    include: {
      setter: { select: { username: true, displayName: true } },
      testCases: {
        where: { isSample: true },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, input: true, output: true, explanation: true, isSample: true },
      },
    },
  });

  if (!problem) throw new AppError('Problem not found', 404, 'NOT_FOUND');

  let userSubmission = null;
  if (userId) {
    userSubmission = await prisma.submission.findFirst({
      where: { userId, problemId: problem.id },
      orderBy: { createdAt: 'desc' },
      select: { verdict: true, language: true, createdAt: true },
    });
  }

  return {
    ...problem,
    acceptanceRate: problem.submissionCount > 0
      ? Math.round((problem.acceptedCount / problem.submissionCount) * 100)
      : 0,
    userStatus: userSubmission?.verdict || null,
  };
}

export async function createProblem(data: any, setterId: string) {
  const slug = await generateUniqueSlug(data.title);
  const sanitizedDescription = sanitizeHtml(data.description, SANITIZE_OPTIONS);

  const { testCases, ...problemData } = data;

  const problem = await prisma.problem.create({
    data: {
      ...problemData,
      slug,
      setterId,
      description: sanitizedDescription,
      testCases: testCases
        ? {
            create: testCases.map((tc: any, idx: number) => ({
              input: tc.isHidden ? encrypt(tc.input) : tc.input,
              output: tc.isHidden ? encrypt(tc.output) : tc.output,
              isHidden: tc.isHidden || false,
              isSample: tc.isSample || false,
              points: tc.points || 0,
              explanation: tc.explanation,
              orderIndex: idx,
            })),
          }
        : undefined,
    },
    include: { testCases: true, setter: { select: { username: true } } },
  });

  return problem;
}

export async function updateProblem(id: string, data: any) {
  const { testCases, ...problemData } = data;

  if (problemData.description) {
    problemData.description = sanitizeHtml(problemData.description, SANITIZE_OPTIONS);
  }

  const problem = await prisma.problem.update({
    where: { id, deletedAt: null },
    data: problemData,
  });

  return problem;
}

export async function deleteProblem(id: string) {
  await prisma.problem.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getTestCasesForJudge(problemId: string) {
  const testCases = await prisma.testCase.findMany({
    where: { problemId },
    orderBy: { orderIndex: 'asc' },
  });

  return testCases.map((tc) => ({
    ...tc,
    input: tc.isHidden ? decrypt(tc.input) : tc.input,
    output: tc.isHidden ? decrypt(tc.output) : tc.output,
  }));
}

export async function getAllProblemsAdmin(query: { page?: number; limit?: number }) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 100);
  const skip = (page - 1) * limit;

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where: { deletedAt: null },
      include: {
        setter: { select: { username: true } },
        _count: { select: { testCases: true, submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.problem.count({ where: { deletedAt: null } }),
  ]);

  return { data: problems, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let suffix = 1;
  while (await prisma.problem.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}
