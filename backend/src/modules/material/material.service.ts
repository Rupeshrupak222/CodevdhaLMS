import { materialRepository } from './material.repository';
import { courseRepository } from '../course/course.repository';
import { AppError } from '../../utils/apiError';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateMaterialInput, UpdateMaterialInput, MaterialListQuery } from './material.validator';
import { MaterialType } from '@prisma/client';
import { resolveS3Url, deleteFromS3 } from '../../utils/s3';
import prisma from '../../config/database';

export const materialService = {
  listMaterials: async (query: MaterialListQuery, requesterId: string, requesterRole: string) => {
    const { page, limit, skip } = parsePaginationParams(query);

    const where: any = {};
    if (query.courseId) where.courseId = query.courseId;
    if (query.type) where.type = query.type as MaterialType;

    // Student role: Restrict materials to their assigned batch
    if (requesterRole === 'STUDENT') {
      if (!query.courseId) throw AppError.badRequest('Course ID is required');
      const enrollment = await courseRepository.isStudentEnrolled(query.courseId, requesterId);
      if (!enrollment) throw AppError.forbidden('You are not enrolled in this course');
      
      // Filter strictly by the student's batchId (show only batch-specific materials)
      where.batchId = enrollment.batchId;
    } else {
      // Admin/Teacher role: Filter by batchId if queried
      if (query.batchId !== undefined) {
        where.batchId = query.batchId === 'null' || query.batchId === '' ? null : query.batchId;
      }
    }

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { id: true, title: true } },
          uploadedBy: { select: { id: true, name: true, role: true } },
        }
      }),
      prisma.material.count({ where }),
    ]);

    const resolvedMaterials = await Promise.all(
      materials.map(async (m: any) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        courseId: m.courseId,
        batchId: m.batchId,
        description: m.description,
        url: await resolveS3Url(m.url),
        createdAt: m.createdAt,
        size: m.size,
        course: m.course,
        uploadedBy: m.uploadedBy,
      }))
    );

    return { materials: resolvedMaterials, meta: buildPaginationMeta({ page, limit, total }) };
  },

  getMaterial: async (id: string, requesterId: string, requesterRole: string) => {
    const m = await prisma.material.findUnique({
      where: { id },
      include: {
        course: true,
        uploadedBy: { select: { id: true, name: true, role: true } }
      }
    });
    if (!m) throw AppError.notFound('Material not found');

    if (requesterRole === 'STUDENT') {
      const enrollment = await courseRepository.isStudentEnrolled(m.courseId, requesterId);
      if (!enrollment || enrollment.batchId !== m.batchId) {
        throw AppError.forbidden('You do not have access to this material');
      }
    }

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(m.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('You do not have access to this material');
    }

    return {
      id: m.id,
      title: m.title,
      type: m.type,
      courseId: m.courseId,
      batchId: m.batchId,
      description: m.description,
      url: await resolveS3Url(m.url),
      createdAt: m.createdAt,
      size: m.size,
      course: m.course,
      uploadedBy: m.uploadedBy,
    };
  },

  createMaterial: async (input: CreateMaterialInput & { batchId?: string | null }, requesterId: string, requesterRole: string) => {
    const course = await courseRepository.findById(input.courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(input.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('You can only upload materials for your assigned courses');
    }

    const created = await prisma.material.create({
      data: {
        title: input.title,
        type: input.type as MaterialType,
        courseId: input.courseId,
        batchId: input.batchId || null,
        url: input.url,
        description: input.description,
        size: input.size,
        uploadedById: requesterId,
      },
      include: {
        course: { select: { id: true, title: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
      }
    });

    return {
      id: created.id,
      title: created.title,
      type: created.type,
      courseId: created.courseId,
      batchId: created.batchId,
      description: created.description,
      url: created.url,
      size: created.size,
    };
  },

  updateMaterial: async (id: string, input: UpdateMaterialInput, requesterId: string, requesterRole: string) => {
    const m = await prisma.material.findUnique({ where: { id } });
    if (!m) throw AppError.notFound('Material not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(m.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('You can only update materials for your assigned courses');
    }

    const updateData: any = {};
    if (input.title) updateData.title = input.title;
    if (input.type) updateData.type = input.type as MaterialType;
    if (input.description) updateData.description = input.description;

    const updated = await prisma.material.update({ where: { id }, data: updateData });
    return { id: updated.id, title: updated.title, type: updated.type };
  },

  deleteMaterial: async (id: string, requesterId: string, requesterRole: string) => {
    const m = await prisma.material.findUnique({ where: { id } });
    if (!m) throw AppError.notFound('Material not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(m.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('You can only delete materials for your assigned courses');
    }

    await prisma.material.delete({ where: { id } });
    return { message: 'Material deleted successfully' };
  },
};
