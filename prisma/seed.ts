import { PrismaClient, Difficulty, Language, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@codearena.dev' },
    update: {},
    create: {
      email: 'admin@codearena.dev',
      username: 'admin',
      displayName: 'CodeArena Admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isEmailVerified: true,
      rating: 2500,
      maxRating: 2500,
    },
  });

  const setterPassword = await bcrypt.hash('Setter@123', 12);
  const setter = await prisma.user.upsert({
    where: { email: 'setter@codearena.dev' },
    update: {},
    create: {
      email: 'setter@codearena.dev',
      username: 'problem_setter',
      displayName: 'Problem Setter',
      passwordHash: setterPassword,
      role: Role.SETTER,
      isEmailVerified: true,
      rating: 1800,
      maxRating: 1900,
    },
  });

  // Sample user
  const userPassword = await bcrypt.hash('User@123', 12);
  const sampleUser = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice_codes',
      displayName: 'Alice',
      passwordHash: userPassword,
      role: Role.USER,
      isEmailVerified: true,
      rating: 1650,
      maxRating: 1720,
      totalSolved: 42,
    },
  });

  // Subscriptions
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, plan: 'ELITE', status: 'ACTIVE' },
  });
  await prisma.subscription.upsert({
    where: { userId: setter.id },
    update: {},
    create: { userId: setter.id, plan: 'PRO', status: 'ACTIVE' },
  });
  await prisma.subscription.upsert({
    where: { userId: sampleUser.id },
    update: {},
    create: { userId: sampleUser.id, plan: 'FREE', status: 'ACTIVE' },
  });

  // ── Achievements ────────────────────────────────────────────────────────────
  const achievements = [
    { code: 'FIRST_AC', title: 'First Blood', description: 'Get your first Accepted submission', points: 10 },
    { code: 'SOLVE_10', title: 'Getting Started', description: 'Solve 10 problems', points: 20 },
    { code: 'SOLVE_50', title: 'Problem Solver', description: 'Solve 50 problems', points: 50 },
    { code: 'SOLVE_100', title: 'Century Club', description: 'Solve 100 problems', points: 100 },
    { code: 'CONTEST_WIN', title: 'Champion', description: 'Win a contest', points: 200 },
    { code: 'STREAK_7', title: 'Week Warrior', description: '7-day submission streak', points: 30 },
    { code: 'STREAK_30', title: 'Monthly Grind', description: '30-day submission streak', points: 100 },
    { code: 'RATING_1800', title: 'Expert', description: 'Reach 1800 rating', points: 50 },
    { code: 'RATING_2000', title: 'Master', description: 'Reach 2000 rating', points: 100 },
    { code: 'SPEED_DEMON', title: 'Speed Demon', description: 'Submit within 1 minute of contest start', points: 25 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    });
  }

  // ── Problems ─────────────────────────────────────────────────────────────────
  const problems = [
    {
      slug: 'two-sum',
      title: 'Two Sum',
      difficulty: Difficulty.EASY,
      tags: ['array', 'hash-table'],
      description: `## Problem Statement

Given an array of integers \`nums\` and an integer \`target\`, return **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

## Examples

**Input:** nums = [2,7,11,15], target = 9
**Output:** [0,1]
**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].

**Input:** nums = [3,2,4], target = 6
**Output:** [1,2]

## Constraints

- 2 ≤ nums.length ≤ 10⁴
- -10⁹ ≤ nums[i] ≤ 10⁹
- -10⁹ ≤ target ≤ 10⁹
- Only one valid answer exists.`,
      timeLimit: 1000,
      memoryLimit: 128,
      sampleInput: '4\n2 7 11 15\n9',
      sampleOutput: '0 1',
      testCases: [
        { input: '4\n2 7 11 15\n9', output: '0 1', isSample: true, isHidden: false },
        { input: '3\n3 2 4\n6', output: '1 2', isSample: true, isHidden: false },
        { input: '2\n3 3\n6', output: '0 1', isSample: false, isHidden: true },
        { input: '5\n1 5 3 8 2\n10', output: '1 3', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'reverse-linked-list',
      title: 'Reverse Linked List',
      difficulty: Difficulty.EASY,
      tags: ['linked-list', 'recursion'],
      description: `## Problem Statement

Given the \`head\` of a singly linked list, reverse the list, and return **the reversed list**.

## Examples

**Input:** head = [1,2,3,4,5]
**Output:** [5,4,3,2,1]

**Input:** head = [1,2]
**Output:** [2,1]

## Constraints

- The number of nodes in the list is the range [0, 5000].
- -5000 ≤ Node.val ≤ 5000

## Follow up

A linked list can be reversed either iteratively or recursively. Could you implement both?`,
      timeLimit: 1000,
      memoryLimit: 128,
      sampleInput: '5\n1 2 3 4 5',
      sampleOutput: '5 4 3 2 1',
      testCases: [
        { input: '5\n1 2 3 4 5', output: '5 4 3 2 1', isSample: true, isHidden: false },
        { input: '2\n1 2', output: '2 1', isSample: true, isHidden: false },
        { input: '0\n', output: '', isSample: false, isHidden: true },
        { input: '1\n42', output: '42', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'longest-common-subsequence',
      title: 'Longest Common Subsequence',
      difficulty: Difficulty.MEDIUM,
      tags: ['string', 'dynamic-programming'],
      description: `## Problem Statement

Given two strings \`text1\` and \`text2\`, return the **length** of their longest **common subsequence**. If there is no common subsequence, return \`0\`.

A **subsequence** of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.

## Examples

**Input:** text1 = "abcde", text2 = "ace"
**Output:** 3
**Explanation:** The longest common subsequence is "ace" and its length is 3.

**Input:** text1 = "abc", text2 = "abc"
**Output:** 3

**Input:** text1 = "abc", text2 = "def"
**Output:** 0

## Constraints

- 1 ≤ text1.length, text2.length ≤ 1000
- text1 and text2 consist of only lowercase English characters.`,
      timeLimit: 2000,
      memoryLimit: 256,
      sampleInput: 'abcde\nace',
      sampleOutput: '3',
      testCases: [
        { input: 'abcde\nace', output: '3', isSample: true, isHidden: false },
        { input: 'abc\nabc', output: '3', isSample: true, isHidden: false },
        { input: 'abc\ndef', output: '0', isSample: false, isHidden: true },
        { input: 'oxcpqrsvwf\nshmtulqrypy', output: '2', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'number-of-islands',
      title: 'Number of Islands',
      difficulty: Difficulty.MEDIUM,
      tags: ['array', 'bfs', 'dfs', 'graph', 'union-find'],
      description: `## Problem Statement

Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the **number of islands**.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.

## Examples

**Input:**
\`\`\`
4 5
1 1 1 1 0
1 1 0 1 0
1 1 0 0 0
0 0 0 0 0
\`\`\`
**Output:** 1

**Input:**
\`\`\`
4 5
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
\`\`\`
**Output:** 3

## Constraints

- m == grid.length
- n == grid[i].length
- 1 ≤ m, n ≤ 300
- grid[i][j] is '0' or '1'.`,
      timeLimit: 2000,
      memoryLimit: 256,
      sampleInput: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0',
      sampleOutput: '1',
      testCases: [
        { input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', output: '1', isSample: true, isHidden: false },
        { input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', output: '3', isSample: true, isHidden: false },
        { input: '1 1\n1', output: '1', isSample: false, isHidden: true },
        { input: '2 2\n0 0\n0 0', output: '0', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'merge-k-sorted-lists',
      title: 'Merge K Sorted Lists',
      difficulty: Difficulty.HARD,
      tags: ['linked-list', 'divide-and-conquer', 'heap', 'merge-sort'],
      description: `## Problem Statement

You are given an array of \`k\` linked-lists \`lists\`, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.

## Examples

**Input:** lists = [[1,4,5],[1,3,4],[2,6]]
**Output:** [1,1,2,3,4,4,5,6]

**Input:** lists = []
**Output:** []

**Input:** lists = [[]]
**Output:** []

## Constraints

- k == lists.length
- 0 ≤ k ≤ 10⁴
- 0 ≤ lists[i].length ≤ 500
- -10⁴ ≤ lists[i][j] ≤ 10⁴
- lists[i] is sorted in **ascending order**.
- The sum of lists[i].length won't exceed 10⁴.`,
      timeLimit: 3000,
      memoryLimit: 256,
      sampleInput: '3\n3 1 4 5\n3 1 3 4\n2 2 6',
      sampleOutput: '1 1 2 3 4 4 5 6',
      testCases: [
        { input: '3\n3 1 4 5\n3 1 3 4\n2 2 6', output: '1 1 2 3 4 4 5 6', isSample: true, isHidden: false },
        { input: '0', output: '', isSample: true, isHidden: false },
        { input: '2\n2 1 2\n2 3 4', output: '1 2 3 4', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'climbing-stairs',
      title: 'Climbing Stairs',
      difficulty: Difficulty.EASY,
      tags: ['math', 'dynamic-programming', 'memoization'],
      description: `## Problem Statement

You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?

## Examples

**Input:** n = 2
**Output:** 2
**Explanation:** There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps

**Input:** n = 3
**Output:** 3
**Explanation:** There are three ways: 1. 1+1+1, 2. 1+2, 3. 2+1

## Constraints

- 1 ≤ n ≤ 45`,
      timeLimit: 1000,
      memoryLimit: 64,
      sampleInput: '2',
      sampleOutput: '2',
      testCases: [
        { input: '2', output: '2', isSample: true, isHidden: false },
        { input: '3', output: '3', isSample: true, isHidden: false },
        { input: '10', output: '89', isSample: false, isHidden: true },
        { input: '45', output: '1836311903', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'binary-search',
      title: 'Binary Search',
      difficulty: Difficulty.EASY,
      tags: ['array', 'binary-search'],
      description: `## Problem Statement

Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with **O(log n)** runtime complexity.

## Examples

**Input:** nums = [-1,0,3,5,9,12], target = 9
**Output:** 4

**Input:** nums = [-1,0,3,5,9,12], target = 2
**Output:** -1

## Constraints

- 1 ≤ nums.length ≤ 10⁴
- -10⁴ < nums[i], target < 10⁴
- All integers in nums are **unique**.
- nums is sorted in ascending order.`,
      timeLimit: 1000,
      memoryLimit: 64,
      sampleInput: '6\n-1 0 3 5 9 12\n9',
      sampleOutput: '4',
      testCases: [
        { input: '6\n-1 0 3 5 9 12\n9', output: '4', isSample: true, isHidden: false },
        { input: '6\n-1 0 3 5 9 12\n2', output: '-1', isSample: true, isHidden: false },
        { input: '1\n5\n5', output: '0', isSample: false, isHidden: true },
        { input: '3\n1 3 5\n0', output: '-1', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'word-break',
      title: 'Word Break',
      difficulty: Difficulty.MEDIUM,
      tags: ['string', 'dynamic-programming', 'trie', 'memoization'],
      description: `## Problem Statement

Given a string \`s\` and a dictionary of strings \`wordDict\`, return \`true\` if \`s\` can be segmented into a space-separated sequence of one or more dictionary words.

**Note** that the same word in the dictionary may be reused multiple times in the segmentation.

## Examples

**Input:** s = "leetcode", wordDict = ["leet","code"]
**Output:** true

**Input:** s = "applepenapple", wordDict = ["apple","pen"]
**Output:** true

**Input:** s = "catsandog", wordDict = ["cats","dog","sand","and","cat"]
**Output:** false

## Constraints

- 1 ≤ s.length ≤ 300
- 1 ≤ wordDict.length ≤ 1000
- 1 ≤ wordDict[i].length ≤ 20`,
      timeLimit: 2000,
      memoryLimit: 256,
      sampleInput: 'leetcode\n2\nleet code',
      sampleOutput: 'true',
      testCases: [
        { input: 'leetcode\n2\nleet code', output: 'true', isSample: true, isHidden: false },
        { input: 'catsandog\n5\ncats dog sand and cat', output: 'false', isSample: true, isHidden: false },
        { input: 'aaaaaaa\n2\naaa aaaa', output: 'true', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'trapping-rain-water',
      title: 'Trapping Rain Water',
      difficulty: Difficulty.HARD,
      tags: ['array', 'two-pointers', 'dynamic-programming', 'stack', 'monotonic-stack'],
      description: `## Problem Statement

Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.

## Examples

**Input:** height = [0,1,0,2,1,0,1,3,2,1,2,1]
**Output:** 6

**Input:** height = [4,2,0,3,2,5]
**Output:** 9

## Constraints

- n == height.length
- 1 ≤ n ≤ 2 × 10⁴
- 0 ≤ height[i] ≤ 10⁵`,
      timeLimit: 2000,
      memoryLimit: 256,
      sampleInput: '12\n0 1 0 2 1 0 1 3 2 1 2 1',
      sampleOutput: '6',
      testCases: [
        { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6', isSample: true, isHidden: false },
        { input: '6\n4 2 0 3 2 5', output: '9', isSample: true, isHidden: false },
        { input: '3\n3 0 3', output: '3', isSample: false, isHidden: true },
        { input: '1\n5', output: '0', isSample: false, isHidden: true },
      ],
    },
    {
      slug: 'median-of-two-sorted-arrays',
      title: 'Median of Two Sorted Arrays',
      difficulty: Difficulty.HARD,
      tags: ['array', 'binary-search', 'divide-and-conquer'],
      description: `## Problem Statement

Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return **the median** of the two sorted arrays.

The overall run time complexity should be **O(log (m+n))**.

## Examples

**Input:** nums1 = [1,3], nums2 = [2]
**Output:** 2.00000

**Input:** nums1 = [1,2], nums2 = [3,4]
**Output:** 2.50000

## Constraints

- nums1.length == m
- nums2.length == n
- 0 ≤ m ≤ 1000
- 0 ≤ n ≤ 1000
- 1 ≤ m + n ≤ 2000
- -10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶`,
      timeLimit: 2000,
      memoryLimit: 128,
      sampleInput: '2\n1 3\n1\n2',
      sampleOutput: '2.00000',
      testCases: [
        { input: '2\n1 3\n1\n2', output: '2.00000', isSample: true, isHidden: false },
        { input: '2\n1 2\n2\n3 4', output: '2.50000', isSample: true, isHidden: false },
        { input: '0\n\n1\n1', output: '1.00000', isSample: false, isHidden: true },
      ],
    },
  ];

  for (const p of problems) {
    const { testCases, ...problemData } = p;
    const problem = await prisma.problem.upsert({
      where: { slug: problemData.slug },
      update: {},
      create: {
        ...problemData,
        isPublished: true,
        setterId: setter.id,
        acceptedCount: Math.floor(Math.random() * 500),
        submissionCount: Math.floor(Math.random() * 2000) + 500,
        testCases: {
          create: testCases.map((tc, idx) => ({
            ...tc,
            orderIndex: idx,
            points: tc.isHidden ? 20 : 0,
          })),
        },
      },
    });
    console.log(`  ✓ Problem: ${problem.title}`);
  }

  // ── Sample Contest ───────────────────────────────────────────────────────────
  const now = new Date();
  const contest = await prisma.contest.upsert({
    where: { slug: 'weekly-contest-1' },
    update: {},
    create: {
      slug: 'weekly-contest-1',
      title: 'Weekly Contest #1',
      description: 'Welcome to the first CodeArena Weekly Contest! Compete with coders from around the world.',
      type: 'ICPC',
      status: 'REGISTRATION',
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // tomorrow
      endTime: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      registrationEnd: new Date(now.getTime() + 23 * 60 * 60 * 1000),
      entryFee: 0,
      prizePool: 0,
      isPublic: true,
      createdById: admin.id,
    },
  });

  const easyProblem = await prisma.problem.findFirst({ where: { difficulty: 'EASY' } });
  const medProblem = await prisma.problem.findFirst({ where: { difficulty: 'MEDIUM' } });
  const hardProblem = await prisma.problem.findFirst({ where: { difficulty: 'HARD' } });

  if (easyProblem && medProblem && hardProblem) {
    await prisma.contestProblem.createMany({
      skipDuplicates: true,
      data: [
        { contestId: contest.id, problemId: easyProblem.id, label: 'A', points: 100, orderIndex: 0 },
        { contestId: contest.id, problemId: medProblem.id, label: 'B', points: 200, orderIndex: 1 },
        { contestId: contest.id, problemId: hardProblem.id, label: 'C', points: 300, orderIndex: 2 },
      ],
    });
  }

  console.log(`  ✓ Contest: ${contest.title}`);
  console.log('\n✅ Seed complete!');
  console.log('\nDefault credentials:');
  console.log('  Admin: admin@codearena.dev / Admin@123');
  console.log('  Setter: setter@codearena.dev / Setter@123');
  console.log('  User: alice@example.com / User@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
