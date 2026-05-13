import axios from 'axios';
import { logger } from '../shared/utils/logger';

const judge0Client = axios.create({
  baseURL: process.env.JUDGE0_URL || 'http://judge0:2358',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': process.env.JUDGE0_AUTH_TOKEN || '',
  },
  timeout: 30000,
});

// Judge0 language IDs
export const LANGUAGE_IDS: Record<string, number> = {
  CPP: 54,       // C++ (GCC 9.2.0)
  JAVA: 62,      // Java (OpenJDK 13)
  PYTHON3: 71,   // Python 3.8.1
  JAVASCRIPT: 63, // JavaScript (Node.js 12)
  GO: 60,        // Go 1.13.5
  RUST: 73,      // Rust 1.40.0
};

export interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;  // seconds
  memory_limit?: number;    // KB
  wall_time_limit?: number;
}

export interface Judge0Result {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;         // seconds as string
  memory: number | null;       // KB
  exit_code: number | null;
}

// Judge0 status IDs
export const JUDGE0_STATUS: Record<number, string> = {
  1: 'In Queue',
  2: 'Processing',
  3: 'ACCEPTED',
  4: 'WRONG_ANSWER',
  5: 'TIME_LIMIT_EXCEEDED',
  6: 'COMPILATION_ERROR',
  7: 'RUNTIME_ERROR',    // SIGSEGV
  8: 'RUNTIME_ERROR',    // SIGXFSZ
  9: 'RUNTIME_ERROR',    // SIGFPE
  10: 'RUNTIME_ERROR',   // SIGABRT
  11: 'RUNTIME_ERROR',   // NZEC
  12: 'RUNTIME_ERROR',   // Other
  13: 'RUNTIME_ERROR',   // Internal error
  14: 'MEMORY_LIMIT_EXCEEDED',
};

export function mapVerdict(statusId: number): string {
  if (statusId === 3) return 'ACCEPTED';
  if (statusId === 4) return 'WRONG_ANSWER';
  if (statusId === 5) return 'TIME_LIMIT_EXCEEDED';
  if (statusId === 6) return 'COMPILATION_ERROR';
  if (statusId === 14) return 'MEMORY_LIMIT_EXCEEDED';
  if (statusId >= 7 && statusId <= 13) return 'RUNTIME_ERROR';
  return 'PENDING';
}

export async function submitToJudge0(submission: Judge0Submission): Promise<string> {
  const response = await judge0Client.post('/submissions?base64_encoded=false&wait=false', submission);
  return response.data.token;
}

export async function getResult(token: string): Promise<Judge0Result> {
  const response = await judge0Client.get(
    `/submissions/${token}?base64_encoded=false&fields=token,stdout,stderr,compile_output,message,status,time,memory,exit_code`
  );
  return response.data;
}

export async function pollResult(token: string, maxWaitMs = 30000): Promise<Judge0Result> {
  const interval = 1000;
  const maxAttempts = maxWaitMs / interval;

  for (let i = 0; i < maxAttempts; i++) {
    const result = await getResult(token);
    if (result.status.id > 2) return result; // Not In Queue/Processing
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`Judge0 timeout after ${maxWaitMs}ms`);
}

export async function getJudge0Health(): Promise<boolean> {
  try {
    const res = await judge0Client.get('/health_check');
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function getJudge0Config(): Promise<any> {
  try {
    const res = await judge0Client.get('/config_info');
    return res.data;
  } catch (err) {
    logger.error('Failed to get Judge0 config', err);
    return null;
  }
}
