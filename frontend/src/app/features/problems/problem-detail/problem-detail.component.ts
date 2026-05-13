import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MonacoEditorModule, NgxMonacoEditorConfig } from '@monaco-editor/angular';
import { Subscription } from 'rxjs';
import { ProblemsApiService, SubmissionsApiService, ProblemDetail } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';
import { ThemeService } from '../../../core/services/theme.service';

interface LanguageConfig {
  id: string;
  label: string;
  monacoLang: string;
  defaultCode: string;
}

const LANGUAGES: LanguageConfig[] = [
  { id: 'CPP', label: 'C++', monacoLang: 'cpp', defaultCode: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Your code here\n    \n    return 0;\n}\n' },
  { id: 'PYTHON3', label: 'Python 3', monacoLang: 'python', defaultCode: 'import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Your code here\n    pass\n\nsolve()\n' },
  { id: 'JAVA', label: 'Java', monacoLang: 'java', defaultCode: 'import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // Your code here\n    }\n}\n' },
  { id: 'JAVASCRIPT', label: 'JavaScript', monacoLang: 'javascript', defaultCode: 'const readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on("line", l => lines.push(l.trim()));\nrl.on("close", () => {\n    // Your code here\n});\n' },
  { id: 'GO', label: 'Go', monacoLang: 'go', defaultCode: 'package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nvar reader *bufio.Reader\nvar writer *bufio.Writer\n\nfunc main() {\n    reader = bufio.NewReader(os.Stdin)\n    writer = bufio.NewWriter(os.Stdout)\n    defer writer.Flush()\n    // Your code here\n}\n' },
  { id: 'RUST', label: 'Rust', monacoLang: 'rust', defaultCode: 'use std::io::{self, BufRead, Write};\n\nfn main() {\n    let stdin = io::stdin();\n    let stdout = io::stdout();\n    let mut out = io::BufWriter::new(stdout.lock());\n    \n    for line in stdin.lock().lines() {\n        let line = line.unwrap();\n        // Your code here\n        writeln!(out, "{}", line).unwrap();\n    }\n}\n' },
];

@Component({
  selector: 'app-problem-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatTabsModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
    MonacoEditorModule,
  ],
  template: `
    <div class="problem-page">
      <!-- Left Panel: Problem Statement -->
      <div class="problem-panel">
        @if (loading()) {
          <div class="loading-center"><mat-spinner diameter="48"></mat-spinner></div>
        } @else if (problem()) {
          <div class="problem-header">
            <div class="breadcrumb">
              <a routerLink="/problems">Problems</a>
              <mat-icon>chevron_right</mat-icon>
              <span>{{ problem()!.title }}</span>
            </div>
            <div class="problem-title-row">
              <h1>{{ problem()!.title }}</h1>
              <span class="diff-badge" [class]="problem()!.difficulty.toLowerCase()">
                {{ problem()!.difficulty }}
              </span>
            </div>
            <div class="problem-meta">
              <span><mat-icon inline>timer</mat-icon> {{ problem()!.timeLimit }}ms</span>
              <span><mat-icon inline>memory</mat-icon> {{ problem()!.memoryLimit }}MB</span>
              <span><mat-icon inline>check_circle</mat-icon>
                {{ problem()!.acceptedCount }}/{{ problem()!.submissionCount }}
                ({{ problem()!.acceptanceRate }}%)
              </span>
            </div>
            <div class="tags">
              @for (tag of problem()!.tags; track tag) {
                <span class="tag">{{ tag }}</span>
              }
            </div>
          </div>

          <mat-tab-group class="problem-tabs" animationDuration="0">
            <mat-tab label="Problem">
              <div class="problem-description" [innerHTML]="renderedDescription()"></div>

              @if (problem()!.testCases?.length) {
                <div class="examples">
                  <h3>Examples</h3>
                  @for (tc of problem()!.testCases; track tc.id; let i = $index) {
                    <div class="example">
                      <div class="example-header">Example {{ i + 1 }}</div>
                      <div class="io-grid">
                        <div class="io-block">
                          <div class="io-label">Input</div>
                          <pre class="io-code">{{ tc.input }}</pre>
                        </div>
                        <div class="io-block">
                          <div class="io-label">Output</div>
                          <pre class="io-code">{{ tc.output }}</pre>
                        </div>
                      </div>
                      @if (tc.explanation) {
                        <div class="explanation">
                          <strong>Explanation:</strong> {{ tc.explanation }}
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              @if (problem()!.constraints) {
                <div class="constraints">
                  <h3>Constraints</h3>
                  <pre>{{ problem()!.constraints }}</pre>
                </div>
              }
            </mat-tab>

            <mat-tab label="Submissions">
              <div class="submissions-tab">
                @if (!auth.isAuthenticated()) {
                  <div class="login-prompt">
                    <mat-icon>lock</mat-icon>
                    <p><a routerLink="/auth/login">Sign in</a> to view your submissions</p>
                  </div>
                } @else if (mySubmissions().length === 0) {
                  <p class="no-subs">No submissions yet. Write some code and submit!</p>
                } @else {
                  <table class="subs-table">
                    <thead>
                      <tr><th>Status</th><th>Language</th><th>Time</th><th>Memory</th><th>Submitted</th></tr>
                    </thead>
                    <tbody>
                      @for (sub of mySubmissions(); track sub.id) {
                        <tr>
                          <td><span class="verdict-badge" [class]="verdictClass(sub.verdict)">{{ sub.verdict.replace('_', ' ') }}</span></td>
                          <td>{{ sub.language }}</td>
                          <td>{{ sub.executionTime ? sub.executionTime + 'ms' : '-' }}</td>
                          <td>{{ sub.memoryUsed ? (sub.memoryUsed / 1024).toFixed(1) + 'MB' : '-' }}</td>
                          <td>{{ sub.createdAt | date:'MMM d, HH:mm' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </div>
            </mat-tab>
          </mat-tab-group>
        }
      </div>

      <!-- Right Panel: Code Editor -->
      <div class="editor-panel">
        <div class="editor-toolbar">
          <mat-form-field class="lang-select" subscriptSizing="dynamic">
            <mat-select [(ngModel)]="selectedLang" (ngModelChange)="onLangChange()">
              @for (lang of languages; track lang.id) {
                <mat-option [value]="lang.id">{{ lang.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="toolbar-actions">
            <button mat-icon-button (click)="resetCode()" matTooltip="Reset to default">
              <mat-icon>restart_alt</mat-icon>
            </button>
            <button mat-icon-button (click)="copyCode()" matTooltip="Copy code">
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
        </div>

        <ngx-monaco-editor
          class="monaco-editor"
          [options]="editorOptions()"
          [(ngModel)]="code"
          (onInit)="onEditorInit($event)">
        </ngx-monaco-editor>

        <!-- Custom Test Input -->
        <div class="custom-input-section">
          <div class="custom-input-header" (click)="showCustomInput.set(!showCustomInput())">
            <mat-icon>{{ showCustomInput() ? 'expand_less' : 'expand_more' }}</mat-icon>
            Custom Input
          </div>
          @if (showCustomInput()) {
            <textarea
              class="custom-input-area"
              [(ngModel)]="customInput"
              placeholder="Enter custom test input..."
              rows="4">
            </textarea>
          }
        </div>

        <!-- Submission Result -->
        @if (submissionResult()) {
          <div class="verdict-panel" [class]="'verdict-' + verdictClass(submissionResult()!.verdict)">
            <div class="verdict-header">
              <mat-icon>{{ submissionResult()!.verdict === 'ACCEPTED' ? 'check_circle' : 'cancel' }}</mat-icon>
              <span class="verdict-text">{{ submissionResult()!.verdict.replace(/_/g, ' ') }}</span>
              @if (submissionResult()!.verdict === 'PENDING') {
                <mat-spinner diameter="16"></mat-spinner>
              }
            </div>
            @if (submissionResult()!.verdict !== 'PENDING') {
              <div class="verdict-details">
                @if (submissionResult()!.executionTime) {
                  <span><mat-icon inline>timer</mat-icon> {{ submissionResult()!.executionTime }}ms</span>
                }
                @if (submissionResult()!.memoryUsed) {
                  <span><mat-icon inline>memory</mat-icon> {{ (submissionResult()!.memoryUsed! / 1024).toFixed(1) }}MB</span>
                }
                @if (submissionResult()!.testsTotal) {
                  <span><mat-icon inline>fact_check</mat-icon> {{ submissionResult()!.testsPassed }}/{{ submissionResult()!.testsTotal }} tests</span>
                }
              </div>
              @if (submissionResult()!.errorOutput) {
                <pre class="error-output">{{ submissionResult()!.errorOutput }}</pre>
              }
            }
          </div>
        }

        <!-- Action Buttons -->
        <div class="editor-actions">
          <button mat-stroked-button (click)="runCode()" [disabled]="submitting()">
            <mat-icon>play_arrow</mat-icon> Run
          </button>
          <button mat-raised-button color="primary" (click)="submitCode()" [disabled]="submitting() || !auth.isAuthenticated()">
            @if (submitting()) { <mat-spinner diameter="16"></mat-spinner> }
            @else { <mat-icon>send</mat-icon> }
            {{ submitting() ? 'Judging...' : 'Submit' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .problem-page {
      display: grid;
      grid-template-columns: 1fr 1fr;
      height: calc(100vh - 64px);
      overflow: hidden;
    }
    .problem-panel {
      overflow-y: auto;
      border-right: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }
    .editor-panel {
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
      overflow: hidden;
    }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .problem-header { padding: 24px; border-bottom: 1px solid var(--border-color); }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }
    .breadcrumb a { color: var(--accent-primary); text-decoration: none; }
    .breadcrumb mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .problem-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .problem-title-row h1 { font-size: 22px; font-weight: 700; margin: 0; }
    .diff-badge { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 4px; white-space: nowrap; }
    .diff-badge.easy { background: rgba(63,185,80,.15); color: #3fb950; }
    .diff-badge.medium { background: rgba(210,167,7,.15); color: #d2a707; }
    .diff-badge.hard { background: rgba(248,81,73,.15); color: #f85149; }
    .problem-meta { display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
    .tags { display: flex; gap: 8px; flex-wrap: wrap; }
    .tag { font-size: 12px; padding: 3px 10px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-secondary); }
    .problem-tabs { flex: 1; }
    ::ng-deep .problem-tabs .mat-mdc-tab-body-content { padding: 0 !important; }
    .problem-description { padding: 24px; font-size: 15px; line-height: 1.7; }
    .problem-description :global(pre) { background: var(--bg-tertiary); padding: 12px; border-radius: 6px; overflow-x: auto; }
    .problem-description :global(code) { background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
    .examples { padding: 0 24px 24px; }
    .examples h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    .example { background: var(--bg-tertiary); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .example-header { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; }
    .io-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .io-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .io-code { background: var(--bg-primary); padding: 10px; border-radius: 6px; font-size: 13px; margin: 0; white-space: pre-wrap; word-break: break-all; }
    .explanation { margin-top: 12px; font-size: 14px; color: var(--text-secondary); }
    .constraints { padding: 0 24px 24px; }
    .constraints h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .constraints pre { background: var(--bg-tertiary); padding: 12px; border-radius: 8px; font-size: 13px; white-space: pre-wrap; }
    .submissions-tab { padding: 24px; }
    .login-prompt { text-align: center; padding: 40px; color: var(--text-secondary); }
    .login-prompt a { color: var(--accent-primary); text-decoration: none; }
    .no-subs { color: var(--text-secondary); text-align: center; padding: 40px 0; }
    .subs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .subs-table th { padding: 8px 12px; text-align: left; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); font-weight: 500; }
    .subs-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
    .verdict-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; }
    .verdict-badge.ac { background: rgba(63,185,80,.15); color: #3fb950; }
    .verdict-badge.wa { background: rgba(248,81,73,.15); color: #f85149; }
    .verdict-badge.tle { background: rgba(210,167,7,.15); color: #d2a707; }
    .verdict-badge.re { background: rgba(248,81,73,.15); color: #f85149; }
    .verdict-badge.ce { background: rgba(139,148,158,.15); color: #8b949e; }
    .verdict-badge.pending { background: rgba(88,166,255,.15); color: #58a6ff; }

    /* Editor */
    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }
    .lang-select { width: 160px; }
    .toolbar-actions { display: flex; gap: 4px; }
    .monaco-editor { flex: 1; min-height: 0; }
    ::ng-deep .monaco-editor { height: 100% !important; }
    .custom-input-section { border-top: 1px solid var(--border-color); }
    .custom-input-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      color: var(--text-secondary);
    }
    .custom-input-header:hover { color: var(--text-primary); }
    .custom-input-area {
      width: 100%;
      background: var(--bg-tertiary);
      border: none;
      border-top: 1px solid var(--border-color);
      color: var(--text-primary);
      font-family: monospace;
      font-size: 13px;
      padding: 12px 16px;
      resize: none;
      outline: none;
      box-sizing: border-box;
    }
    .verdict-panel {
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
    }
    .verdict-panel.verdict-ac { background: rgba(63,185,80,.08); border-top-color: rgba(63,185,80,.3); }
    .verdict-panel.verdict-wa, .verdict-panel.verdict-re { background: rgba(248,81,73,.08); border-top-color: rgba(248,81,73,.3); }
    .verdict-panel.verdict-tle { background: rgba(210,167,7,.08); border-top-color: rgba(210,167,7,.3); }
    .verdict-panel.verdict-pending { background: rgba(88,166,255,.08); border-top-color: rgba(88,166,255,.3); }
    .verdict-header { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; margin-bottom: 6px; }
    .verdict-details { display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
    .error-output { background: var(--bg-tertiary); padding: 10px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; overflow-x: auto; margin: 8px 0 0; color: #f85149; max-height: 120px; }
    .editor-actions {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }
    .editor-actions button { flex: 1; }

    @media (max-width: 900px) {
      .problem-page { grid-template-columns: 1fr; grid-template-rows: 50vh 50vh; }
      .problem-panel { height: 50vh; }
    }
  `],
})
export class ProblemDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private problemsApi = inject(ProblemsApiService);
  private submissionsApi = inject(SubmissionsApiService);
  private socketService = inject(SocketService);
  private snack = inject(MatSnackBar);
  auth = inject(AuthService);
  themeService = inject(ThemeService);

  languages = LANGUAGES;
  problem = signal<ProblemDetail | null>(null);
  loading = signal(true);
  submitting = signal(false);
  submissionResult = signal<any>(null);
  mySubmissions = signal<any[]>([]);
  showCustomInput = signal(false);
  renderedDescription = signal('');

  selectedLang = 'CPP';
  code = LANGUAGES[0].defaultCode;
  customInput = '';
  private editor: any;
  private socketSub?: Subscription;

  editorOptions = signal<any>({
    theme: 'vs-dark',
    language: 'cpp',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    wordWrap: 'on',
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
    padding: { top: 12, bottom: 12 },
  });

  constructor() {
    effect(() => {
      const isDark = this.themeService.theme() === 'dark';
      this.editorOptions.update(o => ({ ...o, theme: isDark ? 'vs-dark' : 'vs' }));
    });
  }

  ngOnInit() {
    this.socketService.connect();

    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.problemsApi.getProblem(slug).subscribe({
      next: (p) => {
        this.problem.set(p);
        this.renderedDescription.set(this.renderMarkdown(p.description));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    if (this.auth.isAuthenticated()) {
      this.loadMySubmissions(slug);
    }

    // Listen for real-time verdict updates
    this.socketSub = this.socketService.onSubmissionUpdate().subscribe((update: any) => {
      this.submissionResult.update(r => r ? { ...r, ...update } : update);
      if (update.verdict && update.verdict !== 'PENDING') {
        this.submitting.set(false);
        if (update.verdict === 'ACCEPTED') {
          this.snack.open('🎉 Accepted!', 'Close', { duration: 5000, panelClass: ['success-snack'] });
          if (this.problem()) this.loadMySubmissions(this.problem()!.slug);
        }
      }
    });
  }

  ngOnDestroy() {
    this.socketSub?.unsubscribe();
  }

  onEditorInit(editor: any) {
    this.editor = editor;
  }

  onLangChange() {
    const lang = this.languages.find(l => l.id === this.selectedLang)!;
    this.code = lang.defaultCode;
    this.editorOptions.update(o => ({ ...o, language: lang.monacoLang }));
  }

  resetCode() {
    const lang = this.languages.find(l => l.id === this.selectedLang)!;
    this.code = lang.defaultCode;
  }

  copyCode() {
    navigator.clipboard.writeText(this.code);
    this.snack.open('Code copied!', 'OK', { duration: 2000 });
  }

  submitCode() {
    if (!this.auth.isAuthenticated()) {
      this.snack.open('Please sign in to submit', 'Sign In');
      return;
    }
    if (!this.code.trim()) {
      this.snack.open('Write some code first!', 'OK');
      return;
    }

    this.submitting.set(true);
    this.submissionResult.set({ verdict: 'PENDING' });

    this.submissionsApi.submit({
      problemId: this.problem()!.id,
      language: this.selectedLang,
      code: this.code,
    }).subscribe({
      error: (err) => {
        this.submitting.set(false);
        this.submissionResult.set(null);
      },
    });
  }

  runCode() {
    this.snack.open('Custom run coming soon! Use Submit to test against all test cases.', 'OK', { duration: 3000 });
  }

  verdictClass(verdict: string): string {
    const map: Record<string, string> = {
      'ACCEPTED': 'ac',
      'WRONG_ANSWER': 'wa',
      'TIME_LIMIT_EXCEEDED': 'tle',
      'MEMORY_LIMIT_EXCEEDED': 'mle',
      'RUNTIME_ERROR': 're',
      'COMPILATION_ERROR': 'ce',
      'PENDING': 'pending',
    };
    return map[verdict] || 'pending';
  }

  private loadMySubmissions(slug: string) {
    this.problemsApi.getProblem(slug).subscribe(p => {
      this.submissionsApi.getMySubmissions({ problemId: p.id }).subscribe({
        next: (res) => this.mySubmissions.set(res.data),
      });
    });
  }

  private renderMarkdown(md: string): string {
    // Simple markdown rendering — in production use a library like marked
    return md
      .replace(/## (.+)/g, '<h2>$1</h2>')
      .replace(/# (.+)/g, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\n\n/g, '<br><br>');
  }
}
