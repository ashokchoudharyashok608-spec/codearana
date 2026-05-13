import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ContestsApiService, Contest } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg">
        <div class="grid-overlay"></div>
        <div class="glow glow-1"></div>
        <div class="glow glow-2"></div>
      </div>
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          <span>10,000+ coders competing daily</span>
        </div>
        <h1 class="hero-title">
          Code.<br>Compete.<br>
          <span class="gradient-text">Conquer.</span>
        </h1>
        <p class="hero-subtitle">
          The ultimate competitive programming arena. Sharpen your skills,
          compete in real-time contests, and climb the global leaderboard.
        </p>
        <div class="hero-actions">
          @if (auth.isAuthenticated()) {
            <a mat-raised-button color="primary" routerLink="/problems" class="cta-primary">
              <mat-icon>code</mat-icon> Solve Problems
            </a>
            <a mat-stroked-button routerLink="/contests" class="cta-secondary">
              <mat-icon>emoji_events</mat-icon> View Contests
            </a>
          } @else {
            <a mat-raised-button color="primary" routerLink="/auth/register" class="cta-primary">
              <mat-icon>rocket_launch</mat-icon> Start Competing — Free
            </a>
            <a mat-stroked-button routerLink="/auth/login" class="cta-secondary">
              Sign In
            </a>
          }
        </div>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-value">500+</span>
            <span class="stat-label">Problems</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-value">Weekly</span>
            <span class="stat-label">Contests</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-value">6</span>
            <span class="stat-label">Languages</span>
          </div>
        </div>
      </div>
      <div class="hero-code">
        <div class="code-window">
          <div class="code-titlebar">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="code-filename">solution.cpp</span>
          </div>
          <pre class="code-body"><code><span class="kw">#include</span> <span class="str">&lt;bits/stdc++.h&gt;</span>
<span class="kw">using namespace</span> std;

<span class="type">int</span> <span class="fn">main</span>() &#123;
  <span class="type">int</span> n;
  cin >> n;
  <span class="type">vector</span>&lt;<span class="type">int</span>&gt; a(n);
  <span class="kw">for</span> (<span class="type">auto</span>&amp; x : a) cin >> x;

  <span class="comment">// Two pointers approach</span>
  <span class="type">int</span> l = <span class="num">0</span>, r = n - <span class="num">1</span>;
  <span class="kw">while</span> (l &lt; r) &#123;
    <span class="kw">if</span> (a[l] + a[r] == target)
      <span class="kw">return</span> cout &lt;&lt; l &lt;&lt; <span class="str">" "</span> &lt;&lt; r, <span class="num">0</span>;
    a[l] + a[r] &lt; target ? l++ : r--;
  &#125;
&#125;
</code></pre>
          <div class="verdict accepted">
            <mat-icon>check_circle</mat-icon> Accepted — 12ms
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">Everything you need to excel</h2>
        <div class="features-grid">
          @for (feature of features; track feature.title) {
            <div class="feature-card">
              <div class="feature-icon">{{ feature.icon }}</div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Live Contests Section -->
    <section class="contests-preview">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Upcoming Contests</h2>
          <a mat-button routerLink="/contests" color="primary">View All →</a>
        </div>
        <div class="contests-grid">
          @for (contest of upcomingContests(); track contest.id) {
            <a [routerLink]="['/contests', contest.slug]" class="contest-card">
              <div class="contest-type-badge" [class]="contest.type.toLowerCase()">{{ contest.type }}</div>
              <h3 class="contest-title">{{ contest.title }}</h3>
              <div class="contest-meta">
                <span><mat-icon inline>people</mat-icon> {{ contest._count?.participants || 0 }} registered</span>
                <span><mat-icon inline>attach_money</mat-icon>
                  {{ contest.entryFee === 0 ? 'Free' : '$' + (contest.entryFee / 100).toFixed(2) }}
                </span>
              </div>
              <div class="contest-time">
                <mat-icon>schedule</mat-icon>
                {{ contest.startTime | date:'MMM d, h:mm a' }}
              </div>
              <div class="contest-status-badge" [class]="contest.status.toLowerCase()">
                {{ contest.status }}
              </div>
            </a>
          } @empty {
            <div class="empty-contests">
              <mat-icon>event_available</mat-icon>
              <p>No upcoming contests right now. Check back soon!</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Languages Section -->
    <section class="languages">
      <div class="container">
        <h2 class="section-title">Code in your language</h2>
        <div class="lang-chips">
          @for (lang of languages; track lang.name) {
            <div class="lang-chip">
              <span class="lang-icon">{{ lang.icon }}</span>
              {{ lang.name }}
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Hero */
    .hero {
      position: relative;
      min-height: calc(100vh - 64px);
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 48px;
      padding: 80px 80px;
      overflow: hidden;
    }
    .hero-bg { position: absolute; inset: 0; z-index: 0; }
    .grid-overlay {
      position: absolute; inset: 0;
      background-image: linear-gradient(var(--border-color) 1px, transparent 1px),
                        linear-gradient(90deg, var(--border-color) 1px, transparent 1px);
      background-size: 60px 60px;
      opacity: 0.3;
    }
    .glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.15;
    }
    .glow-1 { width: 600px; height: 600px; background: var(--accent-primary); top: -100px; left: -100px; }
    .glow-2 { width: 400px; height: 400px; background: var(--accent-secondary); bottom: -100px; right: 0; }
    .hero-content { position: relative; z-index: 1; }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }
    .badge-dot {
      width: 8px; height: 8px;
      background: #00ff88;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .hero-title {
      font-size: clamp(48px, 6vw, 80px);
      font-weight: 900;
      line-height: 1.1;
      margin: 0 0 20px;
      font-family: 'JetBrains Mono', monospace;
    }
    .gradient-text {
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero-subtitle { font-size: 18px; color: var(--text-secondary); max-width: 480px; margin-bottom: 32px; line-height: 1.6; }
    .hero-actions { display: flex; gap: 16px; margin-bottom: 48px; flex-wrap: wrap; }
    .cta-primary { padding: 12px 28px !important; font-size: 16px !important; }
    .cta-secondary { padding: 12px 28px !important; font-size: 16px !important; }
    .hero-stats { display: flex; align-items: center; gap: 24px; }
    .stat { text-align: center; }
    .stat-value { display: block; font-size: 24px; font-weight: 700; color: var(--text-primary); }
    .stat-label { font-size: 13px; color: var(--text-secondary); }
    .stat-divider { width: 1px; height: 40px; background: var(--border-color); }

    /* Code Window */
    .hero-code { position: relative; z-index: 1; }
    .code-window {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,0.4);
    }
    .code-titlebar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border-color);
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.red { background: #ff5f57; }
    .dot.yellow { background: #febc2e; }
    .dot.green { background: #28c840; }
    .code-filename { margin-left: 8px; font-size: 13px; color: var(--text-secondary); font-family: monospace; }
    .code-body { margin: 0; padding: 20px; font-size: 13px; line-height: 1.7; overflow-x: auto; }
    .kw { color: #ff7b72; }
    .type { color: #79c0ff; }
    .str { color: #a5d6ff; }
    .fn { color: #d2a8ff; }
    .num { color: #f2cc60; }
    .comment { color: #8b949e; }
    .verdict {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      border-top: 1px solid var(--border-color);
    }
    .verdict.accepted { color: #3fb950; background: rgba(63, 185, 80, 0.1); }

    /* Sections */
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .section-title { font-size: 36px; font-weight: 700; margin-bottom: 48px; text-align: center; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .section-header .section-title { margin-bottom: 0; }

    .features { padding: 100px 0; }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .feature-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 32px;
      transition: transform 0.2s, border-color 0.2s;
    }
    .feature-card:hover { transform: translateY(-4px); border-color: var(--accent-primary); }
    .feature-icon { font-size: 32px; margin-bottom: 16px; }
    .feature-card h3 { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
    .feature-card p { color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0; }

    .contests-preview { padding: 80px 0; background: var(--bg-secondary); }
    .contests-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .contest-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      text-decoration: none;
      color: inherit;
      display: block;
      position: relative;
      transition: transform 0.2s, border-color 0.2s;
    }
    .contest-card:hover { transform: translateY(-2px); border-color: var(--accent-primary); }
    .contest-type-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .contest-type-badge.icpc { background: rgba(88, 166, 255, 0.15); color: #58a6ff; }
    .contest-type-badge.ioi { background: rgba(163, 113, 247, 0.15); color: #a371f7; }
    .contest-title { font-size: 18px; font-weight: 600; margin: 0 0 12px; }
    .contest-meta { display: flex; gap: 16px; color: var(--text-secondary); font-size: 13px; margin-bottom: 8px; }
    .contest-time { display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 13px; }
    .contest-status-badge {
      position: absolute;
      top: 24px; right: 24px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .contest-status-badge.registration { background: rgba(63, 185, 80, 0.15); color: #3fb950; }
    .contest-status-badge.live { background: rgba(248, 81, 73, 0.15); color: #f85149; animation: pulse 1s infinite; }
    .contest-status-badge.draft { background: rgba(139, 148, 158, 0.15); color: #8b949e; }
    .empty-contests {
      grid-column: 1/-1;
      text-align: center;
      padding: 60px;
      color: var(--text-secondary);
    }
    .empty-contests mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; }

    .languages { padding: 80px 0; }
    .lang-chips { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
    .lang-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 500;
      transition: border-color 0.2s;
    }
    .lang-chip:hover { border-color: var(--accent-primary); }
    .lang-icon { font-size: 24px; }

    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; padding: 40px 24px; min-height: auto; }
      .hero-code { display: none; }
    }
  `],
})
export class LandingComponent implements OnInit {
  auth = inject(AuthService);
  private contestsApi = inject(ContestsApiService);

  upcomingContests = signal<Contest[]>([]);

  features = [
    { icon: '⚡', title: 'Real-time Judging', desc: 'Submit code and get instant feedback with detailed verdict information — AC, WA, TLE, MLE, CE, and more.' },
    { icon: '🏆', title: 'Competitive Contests', desc: 'ICPC and IOI-style contests with live scoreboards, penalty systems, and real prize pools.' },
    { icon: '📊', title: 'ELO Rating System', desc: 'Track your progress with a dynamic rating system. Compete to reach the top of the global leaderboard.' },
    { icon: '🎯', title: '500+ Problems', desc: 'A curated problem set spanning all difficulty levels and topics, from basic algorithms to advanced data structures.' },
    { icon: '🌐', title: '6 Languages', desc: 'Compete in C++, Java, Python 3, JavaScript, Go, or Rust. Use the language you know best.' },
    { icon: '📈', title: 'Detailed Analytics', desc: 'Visualize your progress with submission heatmaps, difficulty breakdowns, and rating history charts.' },
  ];

  languages = [
    { icon: '🔷', name: 'C++' },
    { icon: '☕', name: 'Java' },
    { icon: '🐍', name: 'Python 3' },
    { icon: '🟨', name: 'JavaScript' },
    { icon: '🔵', name: 'Go' },
    { icon: '🦀', name: 'Rust' },
  ];

  ngOnInit() {
    this.contestsApi.getContests({ status: 'REGISTRATION' }).subscribe({
      next: (res) => this.upcomingContests.set(res.data.slice(0, 3)),
    });
  }
}
