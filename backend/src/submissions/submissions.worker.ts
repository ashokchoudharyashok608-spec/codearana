import { Job } from 'bullmq';
import { prisma } from '../shared/utils/prisma';
import { logger } from '../shared/utils/logger';
import { emitSubmissionUpdate, emitScoreboardUpdate } from '../shared/utils/socketio';
import { submitToJudge0, pollResult, mapVerdict, LANGUAGE_IDS } from './judge0.client';
import { getTestCasesForJudge } from '../problems/problems.service';
import { updateContestScoreboard } from '../contests/contests.service';

export interface SubmissionJobData {
  submissionId: string;
  userId: string;
  problemId: string;
  contestId?: string;
  language: string;
  code: string;
  timeLimit: number;
  memoryLimit: number;
}

export async function processSubmissionJob(job: Job<SubmissionJobData>) {
  const { submissionId, userId, problemId, contestId, language, code, timeLimit, memoryLimit } = job.data;

  logger.info(`Processing submission ${submissionId} for problem ${problemId}`);

  try {
    // Mark as processing
    await prisma.submission.update({
      where: { id: submissionId },
      data: { verdict: 'PENDING' },
    });

    emitSubmissionUpdate(userId, submissionId, { verdict: 'PENDING', status: 'Judging...' });

    // Get test cases
    const testCases = await getTestCasesForJudge(problemId);

    if (!testCases.length) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { verdict: 'SKIPPED', errorOutput: 'No test cases defined' },
      });
      return;
    }

    const languageId = LANGUAGE_IDS[language];
    if (!languageId) throw new Error(`Unsupported language: ${language}`);

    let finalVerdict = 'ACCEPTED';
    let totalTime = 0;
    let maxMemory = 0;
    let testsPassed = 0;
    let errorOutput: string | null = null;
    let totalScore = 0;

    // Run against each test case
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

      try {
        const token = await submitToJudge0({
          source_code: code,
          language_id: languageId,
          stdin: tc.input,
          expected_output: tc.output,
          cpu_time_limit: timeLimit / 1000,        // convert ms → seconds
          memory_limit: memoryLimit * 1024,         // convert MB → KB
          wall_time_limit: (timeLimit / 1000) * 2,
        });

        const result = await pollResult(token, 60000);
        const verdict = mapVerdict(result.status.id);

        if (result.time) totalTime = Math.max(totalTime, parseFloat(result.time) * 1000);
        if (result.memory) maxMemory = Math.max(maxMemory, result.memory);

        if (verdict === 'ACCEPTED') {
          testsPassed++;
          totalScore += tc.points || 0;
        } else {
          // For ICPC style: stop on first failure
          finalVerdict = verdict;
          if (verdict === 'COMPILATION_ERROR') {
            errorOutput = result.compile_output || result.stderr || 'Compilation Error';
            break; // No point running more test cases
          }
          if (verdict === 'RUNTIME_ERROR') {
            errorOutput = result.stderr || result.message || 'Runtime Error';
          }
          if (verdict === 'WRONG_ANSWER') {
            errorOutput = `Expected output differs from actual output on test case ${i + 1}`;
          }
          break; // ICPC: stop at first failure
        }

        // Emit progress update
        emitSubmissionUpdate(userId, submissionId, {
          verdict: 'PENDING',
          status: `Running test case ${i + 1}/${testCases.length}`,
          testsPassed,
          testsTotal: testCases.length,
        });
      } catch (tcErr: any) {
        logger.error(`Test case ${i} error for submission ${submissionId}:`, tcErr);
        finalVerdict = 'RUNTIME_ERROR';
        errorOutput = 'Internal judge error';
        break;
      }
    }

    // All passed?
    if (testsPassed === testCases.length) finalVerdict = 'ACCEPTED';

    // Update submission record
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        verdict: finalVerdict as any,
        score: totalScore,
        executionTime: Math.round(totalTime),
        memoryUsed: maxMemory,
        testsPassed,
        testsTotal: testCases.length,
        errorOutput,
      },
    });

    // Update problem stats if AC
    if (finalVerdict === 'ACCEPTED') {
      // Check if this is user's first AC on this problem
      const prevAC = await prisma.submission.count({
        where: { userId, problemId, verdict: 'ACCEPTED', id: { not: submissionId } },
      });

      if (prevAC === 0) {
        await prisma.$transaction([
          prisma.problem.update({
            where: { id: problemId },
            data: { acceptedCount: { increment: 1 } },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { totalSolved: { increment: 1 } },
          }),
        ]);

        // Check achievements
        await checkAchievements(userId);
      }
    }

    // Always increment submission count
    await prisma.problem.update({
      where: { id: problemId },
      data: { submissionCount: { increment: 1 } },
    });

    // Emit final verdict to user
    emitSubmissionUpdate(userId, submissionId, {
      verdict: finalVerdict,
      executionTime: updated.executionTime,
      memoryUsed: updated.memoryUsed,
      testsPassed,
      testsTotal: testCases.length,
      score: totalScore,
      errorOutput,
    });

    // Update contest scoreboard if applicable
    if (contestId) {
      await updateContestScoreboard(contestId, userId, problemId, finalVerdict, totalScore);
      const scoreboard = await getContestScoreboard(contestId);
      emitScoreboardUpdate(contestId, scoreboard);
    }

    logger.info(`Submission ${submissionId} judged: ${finalVerdict} (${testsPassed}/${testCases.length})`);
    return updated;
  } catch (err: any) {
    logger.error(`Fatal error judging submission ${submissionId}:`, err);

    await prisma.submission.update({
      where: { id: submissionId },
      data: { verdict: 'RUNTIME_ERROR', errorOutput: 'Internal judge error' },
    });

    emitSubmissionUpdate(userId, submissionId, {
      verdict: 'RUNTIME_ERROR',
      errorOutput: 'Internal judge error',
    });

    throw err;
  }
}

async function checkAchievements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalSolved: true },
  });
  if (!user) return;

  const toAward: string[] = [];

  if (user.totalSolved === 1) toAward.push('FIRST_AC');
  if (user.totalSolved >= 10) toAward.push('SOLVE_10');
  if (user.totalSolved >= 50) toAward.push('SOLVE_50');
  if (user.totalSolved >= 100) toAward.push('SOLVE_100');

  for (const code of toAward) {
    const achievement = await prisma.achievement.findUnique({ where: { code } });
    if (!achievement) continue;
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: {},
      create: { userId, achievementId: achievement.id },
    });
  }
}

async function getContestScoreboard(contestId: string) {
  const participants = await prisma.contestParticipant.findMany({
    where: { contestId },
    include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
    orderBy: [{ score: 'desc' }, { penalty: 'asc' }],
    take: 100,
  });

  return participants.map((p, idx) => ({
    rank: idx + 1,
    userId: p.userId,
    username: p.user.username,
    displayName: p.user.displayName,
    avatarUrl: p.user.avatarUrl,
    score: p.score,
    penalty: p.penalty,
  }));
}
