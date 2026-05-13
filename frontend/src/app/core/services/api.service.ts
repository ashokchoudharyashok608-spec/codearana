import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  acceptedCount: number;
  submissionCount: number;
  acceptanceRate: number;
  isSolved?: boolean;
  setter?: { username: string };
}

export interface ProblemDetail extends Problem {
  description: string;
  timeLimit: number;
  memoryLimit: number;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  explanation?: string;
  testCases: { id: string; input: string; output: string; explanation?: string }[];
  userStatus?: string;
}

export interface Submission {
  id: string;
  problemId: string;
  language: string;
  code: string;
  verdict: string;
  score: number;
  executionTime?: number;
  memoryUsed?: number;
  testsPassed: number;
  testsTotal: number;
  errorOutput?: string;
  createdAt: string;
  problem?: { slug: string; title: string; difficulty: string };
}

export interface Contest {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'ICPC' | 'IOI';
  status: string;
  startTime: string;
  endTime: string;
  entryFee: number;
  prizePool: number;
  isRegistered?: boolean;
  _count?: { participants: number; problems: number };
}

export interface PagedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class ProblemsApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getProblems(params: { page?: number; limit?: number; difficulty?: string; tags?: string; search?: string }): Observable<PagedResponse<Problem>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<PagedResponse<Problem>>(`${this.api}/problems`, { params: httpParams });
  }

  getProblem(slug: string): Observable<ProblemDetail> {
    return this.http.get<ProblemDetail>(`${this.api}/problems/${slug}`);
  }

  createProblem(data: any): Observable<Problem> {
    return this.http.post<Problem>(`${this.api}/problems`, data);
  }

  updateProblem(id: string, data: any): Observable<Problem> {
    return this.http.patch<Problem>(`${this.api}/problems/${id}`, data);
  }

  deleteProblem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/problems/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class SubmissionsApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  submit(data: { problemId: string; language: string; code: string; contestId?: string }): Observable<{ id: string; verdict: string }> {
    return this.http.post<{ id: string; verdict: string }>(`${this.api}/submissions`, data);
  }

  getSubmission(id: string): Observable<Submission> {
    return this.http.get<Submission>(`${this.api}/submissions/${id}`);
  }

  getMySubmissions(params?: { page?: number; problemId?: string; verdict?: string }): Observable<PagedResponse<Submission>> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<PagedResponse<Submission>>(`${this.api}/submissions`, { params: httpParams });
  }
}

@Injectable({ providedIn: 'root' })
export class ContestsApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getContests(params?: { status?: string; page?: number }): Observable<PagedResponse<Contest>> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<PagedResponse<Contest>>(`${this.api}/contests`, { params: httpParams });
  }

  getContest(slug: string): Observable<Contest & { problems: any[]; isRegistered: boolean }> {
    return this.http.get<any>(`${this.api}/contests/${slug}`);
  }

  register(contestId: string): Observable<any> {
    return this.http.post<any>(`${this.api}/contests/${contestId}/register`, {});
  }

  getScoreboard(contestId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/contests/${contestId}/scoreboard`);
  }

  createContest(data: any): Observable<Contest> {
    return this.http.post<Contest>(`${this.api}/contests`, data);
  }

  updateContest(id: string, data: any): Observable<Contest> {
    return this.http.patch<Contest>(`${this.api}/contests/${id}`, data);
  }
}

@Injectable({ providedIn: 'root' })
export class PaymentsApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  createCheckout(data: { type: string; contestId?: string; plan?: string }): Observable<{ sessionId: string; url: string }> {
    return this.http.post<{ sessionId: string; url: string }>(`${this.api}/payments/create-checkout`, data);
  }

  getHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/payments/history`);
  }
}

@Injectable({ providedIn: 'root' })
export class LeaderboardApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getLeaderboard(params?: { page?: number; limit?: number }): Observable<PagedResponse<any>> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<PagedResponse<any>>(`${this.api}/leaderboard`, { params: httpParams });
  }
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getProfile(username: string): Observable<any> {
    return this.http.get<any>(`${this.api}/users/${username}/profile`);
  }

  updateMe(data: any): Observable<any> {
    return this.http.patch<any>(`${this.api}/users/me`, data);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.api}/admin/stats`);
  }

  getUsers(params?: any): Observable<PagedResponse<any>> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<PagedResponse<any>>(`${this.api}/admin/users`, { params: httpParams });
  }

  updateUserRole(id: string, role: string): Observable<any> {
    return this.http.patch<any>(`${this.api}/admin/users/${id}/role`, { role });
  }

  getSubmissions(params?: any): Observable<PagedResponse<any>> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<PagedResponse<any>>(`${this.api}/admin/submissions`, { params: httpParams });
  }

  rejudge(submissionId: string): Observable<any> {
    return this.http.post<any>(`${this.api}/admin/submissions/${submissionId}/rejudge`, {});
  }
}
