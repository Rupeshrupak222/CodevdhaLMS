import { userRepository } from './user.repository';
import { hashPassword } from '../../utils/password';
import { AppError } from '../../utils/apiError';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateUserInput, UpdateUserInput, UserListQuery } from './user.validator';
import { Role } from '@prisma/client';
import { resolveS3Url, deleteFromS3 } from '../../utils/s3';
import { sendWelcomeEmail } from '../../utils/email';

export const userService = {
  // ── List all users (Admin) ──────────────────────────────────────────────────
  listUsers: async (query: UserListQuery) => {
    const { page, limit, skip } = parsePaginationParams(query);
    const isActive =
      query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const [users, total] = await userRepository.findAll({
      role: query.role as Role | undefined,
      search: query.search,
      isActive,
      skip,
      take: limit,
    });

    const resolvedUsers = await Promise.all(
      users.map(async (u) => ({
        ...u,
        avatar: await resolveS3Url(u.avatar),
      }))
    );

    return {
      users: resolvedUsers,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  },

  // ── Get single user ─────────────────────────────────────────────────────────
  getUserById: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return {
      ...user,
      avatar: await resolveS3Url(user.avatar),
    };
  },

  // ── Admin creates a user (admin / teacher / student) ────────────────────────
  createUser: async (input: CreateUserInput) => {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('A user with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const created = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role as Role,
      avatar: input.avatar,
    });

    // Fire off welcome email asynchronously without awaiting/blocking
    sendWelcomeEmail(created.email, created.name, input.password, created.role).catch(err => {
      console.error(`Failed to send welcome email in background for ${created.email}`, err);
    });

    return {
      ...created,
      avatar: await resolveS3Url(created.avatar),
    };
  },

  // ── Update user ─────────────────────────────────────────────────────────────
  updateUser: async (id: string, input: UpdateUserInput, requesterId: string, requesterRole: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('User not found');

    // Only admin can update other users
    if (requesterRole !== 'ADMIN' && requesterId !== id) {
      throw AppError.forbidden('You can only update your own profile');
    }

    // Privilege guard: a non-admin editing their own profile must not be able to
    // set account-state or enrollment fields (isActive, courseIds, enrollments,
    // email). These are admin-only. Strip them for non-admin self-updates so a
    // student cannot activate/deactivate themselves or self-enroll into arbitrary
    // courses via this endpoint. Admins retain full control.
    const sanitizedInput: any = { ...input };
    if (requesterRole !== 'ADMIN') {
      delete sanitizedInput.isActive;
      delete sanitizedInput.courseIds;
      delete sanitizedInput.enrollments;
      delete sanitizedInput.email;
    }

    const { password, courseIds, enrollments, ...updateData } = sanitizedInput;
    const finalData: any = { ...updateData };

    if (password) {
      finalData.passwordHash = await hashPassword(password);
    }

    const oldAvatar = user.avatar;
    const newAvatar = finalData.avatar;

    const updated = await userRepository.update(id, finalData);

    if (user.role === 'STUDENT') {
      if (enrollments !== undefined) {
        await userRepository.syncEnrollmentsWithSettings(id, enrollments);
      } else if (courseIds !== undefined) {
        await userRepository.syncEnrollments(id, courseIds);
      }
    }

    // Delete old avatar from S3 if updated successfully and was an S3 asset
    if (newAvatar !== oldAvatar && oldAvatar && oldAvatar.includes('amazonaws.com')) {
      try {
        const url = new URL(oldAvatar);
        const key = decodeURIComponent(url.pathname.substring(1));
        await deleteFromS3(key);
      } catch (err) {
        console.error('Failed to delete old avatar from S3:', err);
      }
    }

    return {
      ...updated,
      avatar: await resolveS3Url(updated.avatar),
    };
  },

  // ── Delete user (Admin only) ─────────────────────────────────────────────────
  deleteUser: async (id: string, requesterId: string) => {
    if (id === requesterId) {
      throw AppError.badRequest('You cannot delete your own account');
    }
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return userRepository.delete(id);
  },

  // ── Toggle user active/inactive (Admin only) ──────────────────────────────────
  toggleUserActive: async (id: string, adminId: string) => {
    if (id === adminId) {
      throw AppError.badRequest('You cannot deactivate your own account');
    }
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('User not found');

    const updated = await userRepository.update(id, { isActive: !user.isActive });
    return {
      ...updated,
      avatar: await resolveS3Url(updated.avatar),
    };
  },

  // ── Get teachers (for course assignment) ─────────────────────────────────────
  getTeachers: async (query: { search?: string }) => {
    const [teachers] = await userRepository.findAll({
      role: 'TEACHER',
      search: query.search,
      skip: 0,
      take: 100,
    });
    return Promise.all(
      teachers.map(async (t) => ({
        ...t,
        avatar: await resolveS3Url(t.avatar),
      }))
    );
  },

  // ── Get students (for course assignment) ─────────────────────────────────────
  getStudents: async (query: { search?: string }) => {
    const [students] = await userRepository.findAll({
      role: 'STUDENT',
      search: query.search,
      skip: 0,
      take: 200,
    });
    return Promise.all(
      students.map(async (s) => ({
        ...s,
        avatar: await resolveS3Url(s.avatar),
      }))
    );
  },
};
