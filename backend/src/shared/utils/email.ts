import sgMail from '@sendgrid/mail';
import { Job } from 'bullmq';
import { logger } from './logger';
import { emailQueue } from './queues';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || 'noreply@codearena.dev',
  name: process.env.SENDGRID_FROM_NAME || 'CodeArena',
};

// ── Email templates ───────────────────────────────────────────────────────────
function verifyEmailHtml(username: string, token: string): string {
  const url = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
  return `
    <div style="font-family: monospace; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 40px; border-radius: 8px;">
      <h1 style="color: #58a6ff; font-size: 24px;">Verify your email</h1>
      <p>Hey <strong>${username}</strong>,</p>
      <p>Click the button below to verify your CodeArena account:</p>
      <a href="${url}" style="display: inline-block; background: #238636; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
        Verify Email
      </a>
      <p style="color: #8b949e; font-size: 12px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>`;
}

function resetPasswordHtml(username: string, token: string): string {
  const url = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  return `
    <div style="font-family: monospace; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 40px; border-radius: 8px;">
      <h1 style="color: #f85149; font-size: 24px;">Reset your password</h1>
      <p>Hey <strong>${username}</strong>,</p>
      <p>You requested a password reset. Click below to set a new password:</p>
      <a href="${url}" style="display: inline-block; background: #da3633; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
        Reset Password
      </a>
      <p style="color: #8b949e; font-size: 12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>`;
}

function contestRegistrationHtml(username: string, contestTitle: string): string {
  return `
    <div style="font-family: monospace; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 40px; border-radius: 8px;">
      <h1 style="color: #58a6ff;">Contest Registration Confirmed</h1>
      <p>Hey <strong>${username}</strong>,</p>
      <p>You're registered for <strong>${contestTitle}</strong>!</p>
      <p>Good luck! May your code compile on the first try.</p>
      <a href="${process.env.FRONTEND_URL}/contests" style="display: inline-block; background: #238636; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
        View Contest
      </a>
    </div>`;
}

// ── Queue helpers ─────────────────────────────────────────────────────────────
export async function queueVerificationEmail(email: string, username: string, token: string) {
  await emailQueue.add('verify-email', { type: 'verify-email', email, username, token });
}

export async function queuePasswordResetEmail(email: string, username: string, token: string) {
  await emailQueue.add('reset-password', { type: 'reset-password', email, username, token });
}

export async function queueContestRegistrationEmail(email: string, username: string, contestTitle: string) {
  await emailQueue.add('contest-registration', { type: 'contest-registration', email, username, contestTitle });
}

// ── Worker processor ─────────────────────────────────────────────────────────
export async function processEmailJob(job: Job) {
  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('SendGrid not configured, skipping email');
    return;
  }

  const { type, email, username } = job.data;

  try {
    switch (type) {
      case 'verify-email':
        await sgMail.send({
          to: email,
          from: FROM,
          subject: 'Verify your CodeArena email',
          html: verifyEmailHtml(username, job.data.token),
        });
        break;

      case 'reset-password':
        await sgMail.send({
          to: email,
          from: FROM,
          subject: 'Reset your CodeArena password',
          html: resetPasswordHtml(username, job.data.token),
        });
        break;

      case 'contest-registration':
        await sgMail.send({
          to: email,
          from: FROM,
          subject: `Registered: ${job.data.contestTitle}`,
          html: contestRegistrationHtml(username, job.data.contestTitle),
        });
        break;

      default:
        logger.warn(`Unknown email type: ${type}`);
    }
    logger.info(`Email sent: ${type} → ${email}`);
  } catch (err: any) {
    logger.error(`Email send failed: ${type} → ${email}`, err.response?.body || err);
    throw err;
  }
}
