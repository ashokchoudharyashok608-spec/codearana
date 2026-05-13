import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ProblemsApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-problem-editor',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatChipsModule, MatDividerModule, MatTooltipModule,
  ],
  template: `
    <div class="editor-page">
      <div class="editor-header">
        <div class="header-left">
          <a mat-icon-button routerLink="/problems"><mat-icon>arrow_back</mat-icon></a>
          <h1>New Problem</h1>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="save(false)" [disabled]="saving()">
            Save Draft
          </button>
          <button mat-raised-button color="primary" (click)="save(true)" [disabled]="saving()">
            @if (saving()) { <mat-spinner diameter="18" /> } @else { Publish }
          </button>
        </div>
      </div>

      <form [formGroup]="form" class="editor-form">
        <!-- Basic Info -->
        <section class="form-section">
          <h2>Basic Info</h2>
          <div class="field-row">
            <mat-form-field class="field-grow">
              <mat-label>Title</mat-label>
              <input matInput formControlName="title" placeholder="e.g. Two Sum" />
              @if (f['title'].invalid && f['title'].touched) {
                <mat-error>Title is required (3–200 chars)</mat-error>
              }
            </mat-form-field>
            <mat-form-field class="field-fixed">
              <mat-label>Difficulty</mat-label>
              <mat-select formControlName="difficulty">
                <mat-option value="EASY">🟢 Easy</mat-option>
                <mat-option value="MEDIUM">🟡 Medium</mat-option>
                <mat-option value="HARD">🔴 Hard</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Tags -->
          <div class="tags-field">
            <label class="tags-label">Tags</label>
            <div class="tags-input-row">
              <input
                #tagInput
                class="tag-input"
                placeholder="Add tag and press Enter"
                (keydown.enter)="addTag(tagInput.value); tagInput.value = ''; $event.preventDefault()"
              />
            </div>
            <div class="tags-list">
              @for (tag of tags(); track tag) {
                <span class="tag-chip">
                  {{ tag }}
                  <button type="button" (click)="removeTag(tag)">×</button>
                </span>
              }
            </div>
          </div>
        </section>

        <mat-divider />

        <!-- Limits -->
        <section class="form-section">
          <h2>Limits</h2>
          <div class="field-row">
            <mat-form-field>
              <mat-label>Time Limit (ms)</mat-label>
              <input matInput type="number" formControlName="timeLimit" min="100" max="10000" />
              <span matSuffix>ms</span>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Memory Limit (MB)</mat-label>
              <input matInput type="number" formControlName="memoryLimit" min="16" max="512" />
              <span matSuffix>MB</span>
            </mat-form-field>
          </div>
        </section>

        <mat-divider />

        <!-- Problem Statement -->
        <section class="form-section">
          <h2>Problem Statement <span class="hint">(Markdown supported)</span></h2>
          <mat-form-field class="full-width textarea-field">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="12"
              placeholder="## Problem Statement&#10;&#10;Describe the problem here...&#10;&#10;## Input&#10;&#10;Describe input format...&#10;&#10;## Output&#10;&#10;Describe output format..."></textarea>
            @if (f['description'].invalid && f['description'].touched) {
              <mat-error>Description is required</mat-error>
            }
          </mat-form-field>

          <div class="field-row">
            <mat-form-field class="field-grow">
              <mat-label>Constraints</mat-label>
              <textarea matInput formControlName="constraints" rows="3"
                placeholder="1 ≤ n ≤ 10^5&#10;-10^9 ≤ a[i] ≤ 10^9"></textarea>
            </mat-form-field>
          </div>
        </section>

        <mat-divider />

        <!-- Sample I/O -->
        <section class="form-section">
          <h2>Sample Input / Output</h2>
          <div class="field-row">
            <mat-form-field class="field-grow">
              <mat-label>Sample Input</mat-label>
              <textarea matInput formControlName="sampleInput" rows="4" class="mono-area"
                placeholder="5&#10;1 2 3 4 5"></textarea>
            </mat-form-field>
            <mat-form-field class="field-grow">
              <mat-label>Sample Output</mat-label>
              <textarea matInput formControlName="sampleOutput" rows="4" class="mono-area"
                placeholder="15"></textarea>
            </mat-form-field>
          </div>
          <mat-form-field class="full-width">
            <mat-label>Explanation (optional)</mat-label>
            <textarea matInput formControlName="explanation" rows="3"
              placeholder="Explain the sample I/O..."></textarea>
          </mat-form-field>
        </section>

        <mat-divider />

        <!-- Test Cases -->
        <section class="form-section">
          <div class="section-header">
            <h2>Test Cases</h2>
            <button mat-stroked-button type="button" (click)="addTestCase()">
              <mat-icon>add</mat-icon> Add Test Case
            </button>
          </div>

          <div formArrayName="testCases" class="testcases-list">
            @for (tc of testCasesArray.controls; track $index; let i = $index) {
              <div [formGroupName]="i" class="testcase-card">
                <div class="testcase-header">
                  <span class="testcase-num">Test #{{ i + 1 }}</span>
                  <div class="testcase-flags">
                    <label class="flag-label">
                      <input type="checkbox" formControlName="isSample" />
                      Sample
                    </label>
                    <label class="flag-label">
                      <input type="checkbox" formControlName="isHidden" />
                      Hidden
                    </label>
                    <mat-form-field class="points-field">
                      <mat-label>Points</mat-label>
                      <input matInput type="number" formControlName="points" min="0" />
                    </mat-form-field>
                  </div>
                  <button mat-icon-button color="warn" type="button" (click)="removeTestCase(i)"
                    [disabled]="testCasesArray.length <= 1">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                <div class="field-row">
                  <mat-form-field class="field-grow">
                    <mat-label>Input</mat-label>
                    <textarea matInput formControlName="input" rows="4" class="mono-area"></textarea>
                  </mat-form-field>
                  <mat-form-field class="field-grow">
                    <mat-label>Expected Output</mat-label>
                    <textarea matInput formControlName="output" rows="4" class="mono-area"></textarea>
                  </mat-form-field>
                </div>
                <mat-form-field class="full-width">
                  <mat-label>Explanation (optional)</mat-label>
                  <input matInput formControlName="explanation" />
                </mat-form-field>
              </div>
            }
          </div>
        </section>
      </form>
    </div>
  `,
  styles: [`
    .editor-page { max-width: 960px; margin: 0 auto; padding: 24px; }
    .editor-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 32px; flex-wrap: wrap; gap: 12px;
    }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .header-left h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .editor-form { display: flex; flex-direction: column; gap: 24px; }
    .form-section { display: flex; flex-direction: column; gap: 16px; padding: 24px 0; }
    .form-section h2 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; }
    .hint { font-size: 13px; color: var(--text-secondary); font-weight: 400; }

    .field-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .field-grow { flex: 1; min-width: 200px; }
    .field-fixed { width: 160px; }
    .full-width { width: 100%; }

    mat-form-field { width: 100%; }
    .textarea-field textarea { min-height: 200px; }
    .mono-area { font-family: 'JetBrains Mono', monospace; font-size: 13px; }

    /* Tags */
    .tags-field { display: flex; flex-direction: column; gap: 8px; }
    .tags-label { font-size: 14px; color: var(--text-secondary); }
    .tag-input {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-primary);
      font-size: 14px;
      width: 300px;
      outline: none;
    }
    .tag-input:focus { border-color: var(--accent-primary); }
    .tags-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag-chip {
      display: flex; align-items: center; gap: 6px;
      background: rgba(88,166,255,.15); color: var(--accent-primary);
      border: 1px solid rgba(88,166,255,.3);
      border-radius: 6px; padding: 4px 10px; font-size: 13px;
    }
    .tag-chip button {
      background: none; border: none; cursor: pointer;
      color: inherit; font-size: 16px; padding: 0; line-height: 1;
    }

    /* Test Cases */
    .testcases-list { display: flex; flex-direction: column; gap: 16px; }
    .testcase-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px; padding: 20px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .testcase-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .testcase-num { font-weight: 700; font-size: 15px; color: var(--text-secondary); }
    .testcase-flags { display: flex; align-items: center; gap: 16px; flex: 1; }
    .flag-label { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
    .flag-label input[type="checkbox"] { accent-color: var(--accent-primary); width: 16px; height: 16px; }
    .points-field { max-width: 120px; }
  `],
})
export class ProblemEditorComponent {
  private fb = inject(FormBuilder);
  private problemsApi = inject(ProblemsApiService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  saving = signal(false);
  tags = signal<string[]>([]);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    difficulty: ['MEDIUM', Validators.required],
    timeLimit: [2000, [Validators.required, Validators.min(100), Validators.max(10000)]],
    memoryLimit: [256, [Validators.required, Validators.min(16), Validators.max(512)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    constraints: [''],
    sampleInput: [''],
    sampleOutput: [''],
    explanation: [''],
    testCases: this.fb.array([this.makeTestCase()]),
  });

  get f() { return this.form.controls; }
  get testCasesArray() { return this.form.get('testCases') as FormArray; }

  makeTestCase() {
    return this.fb.group({
      input: ['', Validators.required],
      output: ['', Validators.required],
      isSample: [false],
      isHidden: [true],
      points: [20],
      explanation: [''],
    });
  }

  addTestCase() { this.testCasesArray.push(this.makeTestCase()); }
  removeTestCase(i: number) { this.testCasesArray.removeAt(i); }

  addTag(value: string) {
    const tag = value.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !this.tags().includes(tag)) {
      this.tags.update(tags => [...tags, tag]);
    }
  }

  removeTag(tag: string) {
    this.tags.update(tags => tags.filter(t => t !== tag));
  }

  save(publish: boolean) {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const payload = {
      ...this.form.value,
      tags: this.tags(),
      isPublished: publish,
    };

    this.problemsApi.createProblem(payload).subscribe({
      next: (problem: any) => {
        this.snack.open(publish ? 'Problem published!' : 'Draft saved!', 'OK', { duration: 3000 });
        this.router.navigate(['/problems', problem.slug]);
      },
      error: (err: any) => {
        this.snack.open(err.error?.message || 'Failed to save problem', 'Dismiss', { duration: 4000 });
        this.saving.set(false);
      },
    });
  }
}
