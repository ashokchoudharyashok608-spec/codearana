import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentsApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge?: string;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="pricing-page">
      <div class="page-header">
        <div class="header-badge">Simple, transparent pricing</div>
        <h1>Choose your plan</h1>
        <p class="subtitle">
          Start free. Upgrade when you're ready to compete at full speed.
        </p>
      </div>

      <div class="plans-grid">
        @for (plan of plans; track plan.id) {
          <div class="plan-card" [class.highlighted]="plan.highlight">
            @if (plan.badge) {
              <div class="plan-badge">{{ plan.badge }}</div>
            }
            <div class="plan-header">
              <h2 class="plan-name">{{ plan.name }}</h2>
              <div class="plan-price">
                <span class="price-amount">{{ plan.price }}</span>
                @if (plan.period) {
                  <span class="price-period">{{ plan.period }}</span>
                }
              </div>
              <p class="plan-desc">{{ plan.description }}</p>
            </div>
            <ul class="feature-list">
              @for (feature of plan.features; track feature) {
                <li class="feature-item">
                  <mat-icon class="feature-check">check_circle</mat-icon>
                  {{ feature }}
                </li>
              }
            </ul>
            <div class="plan-action">
              @if (auth.isAuthenticated()) {
                @if (plan.id === 'free') {
                  <button mat-stroked-button disabled class="plan-btn">Current Free Plan</button>
                } @else {
                  <button mat-raised-button [color]="plan.highlight ? 'primary' : 'default'"
                    class="plan-btn" (click)="subscribe(plan.id)" [disabled]="loadingPlan() === plan.id">
                    @if (loadingPlan() === plan.id) {
                      <mat-spinner diameter="20" />
                    } @else {
                      {{ plan.cta }}
                    }
                  </button>
                }
              } @else {
                <a mat-raised-button [color]="plan.highlight ? 'primary' : 'default'"
                  routerLink="/auth/register" class="plan-btn">
                  {{ plan.cta }}
                </a>
              }
            </div>
          </div>
        }
      </div>

      <!-- FAQ -->
      <div class="faq-section">
        <h2>Frequently asked questions</h2>
        <div class="faq-grid">
          @for (faq of faqs; track faq.q) {
            <div class="faq-item">
              <h3>{{ faq.q }}</h3>
              <p>{{ faq.a }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pricing-page { max-width: 1100px; margin: 0 auto; padding: 60px 24px; }

    .page-header { text-align: center; margin-bottom: 64px; }
    .header-badge {
      display: inline-block;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }
    .page-header h1 { font-size: 44px; font-weight: 800; margin: 0 0 16px; }
    .subtitle { font-size: 18px; color: var(--text-secondary); max-width: 480px; margin: 0 auto; }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 80px;
    }
    .plan-card {
      position: relative;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 36px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      transition: transform .2s, border-color .2s;
    }
    .plan-card:hover { transform: translateY(-4px); }
    .plan-card.highlighted {
      border-color: var(--accent-primary);
      background: linear-gradient(180deg, rgba(88,166,255,.06) 0%, var(--bg-secondary) 100%);
    }
    .plan-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent-primary);
      color: #fff;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .plan-header { display: flex; flex-direction: column; gap: 12px; }
    .plan-name { font-size: 22px; font-weight: 700; margin: 0; }
    .plan-price { display: flex; align-items: baseline; gap: 4px; }
    .price-amount { font-size: 44px; font-weight: 800; }
    .price-period { color: var(--text-secondary); font-size: 16px; }
    .plan-desc { color: var(--text-secondary); font-size: 14px; margin: 0; line-height: 1.5; }

    .feature-list { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .feature-item { display: flex; align-items: flex-start; gap: 10px; font-size: 15px; }
    .feature-check { color: #3fb950; font-size: 18px; flex-shrink: 0; margin-top: 1px; }

    .plan-action { margin-top: auto; }
    .plan-btn { width: 100%; height: 48px; font-size: 16px !important; }

    /* FAQ */
    .faq-section { border-top: 1px solid var(--border-color); padding-top: 64px; }
    .faq-section h2 { font-size: 28px; font-weight: 700; margin-bottom: 40px; text-align: center; }
    .faq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(440px, 1fr)); gap: 32px; }
    .faq-item h3 { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
    .faq-item p { color: var(--text-secondary); margin: 0; line-height: 1.6; font-size: 14px; }

    @media (max-width: 600px) {
      .page-header h1 { font-size: 32px; }
      .faq-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class PricingComponent {
  auth = inject(AuthService);
  private paymentsApi = inject(PaymentsApiService);
  private snack = inject(MatSnackBar);

  loadingPlan = signal('');

  plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: '',
      description: 'Everything you need to get started with competitive programming.',
      features: [
        '5 submissions per day',
        'Access to all 500+ problems',
        'Participate in free contests',
        'Public leaderboard ranking',
        'Submission history',
        'Profile & achievement system',
      ],
      cta: 'Get Started — Free',
      highlight: false,
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: '$9.99',
      period: '/ month',
      description: 'Unlimited submissions and priority judging for serious competitors.',
      badge: 'Most Popular',
      features: [
        'Unlimited submissions',
        'Standard queue priority',
        'All free features',
        'Access to paid contests',
        'Advanced submission analytics',
        'Email support',
      ],
      cta: 'Upgrade to Pro',
      highlight: true,
    },
    {
      id: 'ELITE',
      name: 'Elite',
      price: '$29.99',
      period: '/ month',
      description: 'Maximum performance for competitive programmers aiming for the top.',
      features: [
        'Unlimited submissions',
        'Priority queue (faster verdicts)',
        'All Pro features',
        'Early access to new problems',
        'Contest entry credits ($10/mo)',
        'Priority email & Discord support',
      ],
      cta: 'Go Elite',
      highlight: false,
    },
  ];

  faqs = [
    { q: 'Can I cancel my subscription anytime?', a: 'Yes! You can cancel at any time from your profile page. Your plan remains active until the end of the billing period.' },
    { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex) via Stripe. Your card details are never stored on our servers.' },
    { q: 'What is the priority queue?', a: 'Elite subscribers\' submissions jump to the front of the judging queue. During high-traffic periods, this can reduce wait time from minutes to seconds.' },
    { q: 'Are contest entry fees separate?', a: 'Yes. Contest fees are separate from subscriptions. Elite subscribers receive $10/month in credits that can be applied to contest entry fees.' },
    { q: 'Can I get a refund?', a: 'We offer a 7-day money-back guarantee on first-time subscriptions. Contest entry fees are non-refundable once a contest has started.' },
    { q: 'Is there a student discount?', a: 'Yes! Contact us with your .edu email for a 50% discount on Pro and Elite plans.' },
  ];

  subscribe(planId: string) {
    this.loadingPlan.set(planId);
    this.paymentsApi.createCheckout({ type: 'subscription', plan: planId }).subscribe({
      next: (res) => { window.location.href = res.url; },
      error: (err) => {
        this.snack.open(err.error?.message || 'Checkout failed', 'Dismiss', { duration: 4000 });
        this.loadingPlan.set('');
      },
    });
  }
}
