import { User, RefreshToken, PasswordReset } from '@prisma/client';
import prisma from '../../config/database';

export const authRepository = {
  // ── User ──────────────────────────────────────────────────────────────────

  findUserByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        avatar: true,
        isEmailVerified: true,
        isActive: true,
        isFaceRegistered: true,
        faceEmbedding: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          include: {
            course: true,
          },
        },
      },
    }),

  findUserById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        avatar: true,
        isEmailVerified: true,
        isActive: true,
        isFaceRegistered: true,
        faceEmbedding: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          include: {
            course: true,
          },
        },
      },
    }),

  createUser: (data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: 'ADMIN' | 'TEACHER' | 'STUDENT';
  }) =>
    prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        settings: { create: {} }, // create default settings
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isEmailVerified: true,
        createdAt: true,
      },
    }),

  updateUserPassword: (userId: string, passwordHash: string) =>
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),

  updateUserFace: async (id: string, faceEmbedding: number[], isFaceRegistered: boolean) => {
    return prisma.user.update({
      where: { id },
      data: {
        faceEmbedding,
        isFaceRegistered,
      },
    });
  },

  updateUserFaceAndAvatar: async (id: string, faceEmbedding: number[], isFaceRegistered: boolean, avatar: string | null) => {
    return prisma.user.update({
      where: { id },
      data: {
        faceEmbedding,
        isFaceRegistered,
        ...(avatar && { avatar }),
      },
    });
  },

  // ── Refresh Tokens ─────────────────────────────────────────────────────────

  createRefreshToken: (data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) =>
    prisma.refreshToken.create({ data }),

  findRefreshToken: (tokenHash: string) =>
    prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    }),

  deleteRefreshToken: (tokenHash: string) =>
    prisma.refreshToken.delete({ where: { tokenHash } }),

  deleteAllRefreshTokensForUser: (userId: string) =>
    prisma.refreshToken.deleteMany({ where: { userId } }),

  countRefreshTokensForUser: (userId: string) =>
    prisma.refreshToken.count({ where: { userId } }),

  deleteOldestRefreshTokensForUser: async (userId: string, count: number) => {
    const oldest = await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: count,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { id: { in: oldest.map(t => t.id) } },
      });
    }
  },

  // ── Password Reset ─────────────────────────────────────────────────────────

  createPasswordReset: (data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) =>
    prisma.passwordReset.create({ data }),

  findPasswordReset: (tokenHash: string) =>
    prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    }),

  markPasswordResetUsed: (id: string) =>
    prisma.passwordReset.update({ where: { id }, data: { used: true } }),

  deletePasswordResetsForUser: (userId: string) =>
    prisma.passwordReset.deleteMany({ where: { userId } }),
};
