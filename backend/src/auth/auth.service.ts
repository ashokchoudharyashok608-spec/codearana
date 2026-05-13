import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler';
import { queueVerificationEmail, queuePasswordResetEmail } from '../shared/utils/email';
import { logger } from '../shared/utils/logger';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { sub: userId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return token;
}

export async function register(data: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  });

  if (existing) {
    throw new AppError(
      existing.email === data.email ? 'Email already in use' : 'Username already taken',
      409,
      'DUPLICATE',
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const verifyToken = crypto.randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: {
      email: data.email,
      username: data.username,
      displayName: data.displayName || data.username,
      passwordHash,
      emailVerifyToken: verifyToken,
      subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
    },
  });

  await queueVerificationEmail(user.email, user.username, verifyToken);

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = await generateRefreshToken(user.id);

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = await generateRefreshToken(user.id);

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refreshTokens(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { token } });
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId, deletedAt: null },
  });

  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { token } });
  const newRefreshToken = await generateRefreshToken(user.id);
  const accessToken = generateAccessToken(user.id, user.email, user.role);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) throw new AppError('Invalid verification token', 400, 'INVALID_TOKEN');

  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifyToken: null },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
  if (!user) return; // Silently fail to prevent email enumeration

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: token,
      resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  await queuePasswordResetEmail(user.email, user.username, token);
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiry: { gt: new Date() },
    },
  });

  if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetPasswordToken: null, resetPasswordExpiry: null },
  });

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
}

export async function findOrCreateOAuthUser(profile: {
  provider: 'google' | 'github';
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  const providerField = profile.provider === 'google' ? 'googleId' : 'githubId';

  // Try by provider ID
  let user = await prisma.user.findFirst({
    where: { [providerField]: profile.id, deletedAt: null },
  });

  if (!user) {
    // Try by email
    user = await prisma.user.findFirst({
      where: { email: profile.email, deletedAt: null },
    });

    if (user) {
      // Link account
      await prisma.user.update({
        where: { id: user.id },
        data: { [providerField]: profile.id },
      });
    } else {
      // Create new user
      const username = await generateUniqueUsername(profile.email);
      user = await prisma.user.create({
        data: {
          email: profile.email,
          username,
          displayName: profile.displayName || username,
          avatarUrl: profile.avatarUrl,
          [providerField]: profile.id,
          isEmailVerified: true,
          subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
        },
      });
      logger.info(`New OAuth user: ${user.email} via ${profile.provider}`);
    }
  }

  return user;
}

async function generateUniqueUsername(email: string): Promise<string> {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  let username = base;
  let suffix = 1;

  while (true) {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (!exists) return username;
    username = `${base}${suffix++}`;
  }
}

export function sanitizeUser(user: any) {
  const { passwordHash, emailVerifyToken, resetPasswordToken, resetPasswordExpiry, ...safe } = user;
  return safe;
}
