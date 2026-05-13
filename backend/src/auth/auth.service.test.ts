import { register, login, refreshTokens } from '../auth/auth.service';
import { prisma } from '../shared/utils/prisma';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../shared/utils/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    subscription: { create: jest.fn() },
  },
}));

jest.mock('../shared/utils/email', () => ({
  queueVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.access.token'),
  verify: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('creates a new user and returns tokens', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'USER',
        displayName: 'Test User',
        isEmailVerified: false,
      });
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({ token: 'refresh-token' });

      const result = await register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mock.access.token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('throws if email already exists', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        email: 'test@example.com',
        username: 'other',
      });

      await expect(register({
        email: 'test@example.com',
        username: 'newuser',
        password: 'Password123!',
      })).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('Password123!', 12);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'USER',
        passwordHash: hash,
        deletedAt: null,
      });
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({ token: 'refresh' });

      const result = await login('test@example.com', 'Password123!');
      expect(result.accessToken).toBeTruthy();
    });

    it('throws on wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1', email: 'test@example.com', username: 'testuser',
        role: 'USER', passwordHash: hash, deletedAt: null,
      });

      await expect(login('test@example.com', 'wrong-password'))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws when user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(login('nobody@example.com', 'password'))
        .rejects.toMatchObject({ statusCode: 401 });
    });
  });
});
