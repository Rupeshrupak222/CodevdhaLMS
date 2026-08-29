import { certificateRepository } from './certificate.repository';
import { courseRepository } from '../course/course.repository';
import { AppError } from '../../utils/apiError';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { GenerateCertificateInput, CertificateListQuery } from './certificate.validator';
import prisma from '../../config/database';

export const certificateService = {
  listCertificates: async (query: CertificateListQuery, requesterId: string, requesterRole: string) => {
    const { page, limit, skip } = parsePaginationParams(query);

    const filters: any = { skip, take: limit, courseId: query.courseId };

    if (requesterRole === 'STUDENT') {
      filters.studentId = requesterId;
    } else {
      filters.studentId = query.studentId;
    }

    const [certificates, total] = await certificateRepository.findAll(filters);
    return { certificates, meta: buildPaginationMeta({ page, limit, total }) };
  },

  verifyCertificate: async (verifyId: string) => {
    const certificate = await certificateRepository.findByVerifyId(verifyId);
    if (!certificate) throw AppError.notFound('Certificate verification failed: Invalid verify ID');
    if (certificate.isRevoked) throw AppError.forbidden('This certificate has been revoked');
    return certificate;
  },

  generateCertificate: async (input: GenerateCertificateInput, issuedById: string, requesterRole: string) => {
    // Verify student is enrolled in the course
    const isEnrolled = await courseRepository.isStudentEnrolled(input.courseId, input.studentId);
    if (!isEnrolled) throw AppError.badRequest('Student is not enrolled in this course');

    // Teachers can only issue certificates for courses they are assigned to
    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(input.courseId, issuedById);
      if (!isAssigned) throw AppError.forbidden('You can only issue certificates for your assigned courses');
    }

    // Normalize type to always be an array
    const types = Array.isArray(input.type) ? input.type : [input.type];

    const results: any[] = [];
    const skipped: string[] = [];

    for (const type of types) {
      // Check if certificate already exists for this type, student, and course
      const existing = await prisma.certificate.findUnique({
        where: {
          studentId_courseId_type: {
            studentId: input.studentId,
            courseId: input.courseId,
            type: type as any,
          },
        },
      });

      if (existing) {
        skipped.push(type);
        continue;
      }

      const cert = await certificateRepository.create(
        { ...input, type: type as any },
        issuedById
      );
      results.push(cert);
    }

    if (results.length === 0 && skipped.length > 0) {
      throw AppError.badRequest(`Certificates already exist for: ${skipped.join(', ')}`);
    }

    return {
      issued: results,
      skipped,
      message: skipped.length > 0
        ? `Issued ${results.length} certificate(s). Skipped ${skipped.length} already existing: ${skipped.join(', ')}`
        : `Successfully issued ${results.length} certificate(s)`,
    };
  },

  deleteCertificate: async (id: string, requesterId: string, requesterRole: string) => {
    const cert = await certificateRepository.findById(id);
    if (!cert) throw AppError.notFound('Certificate not found');

    // Teachers can only delete certificates for courses they are assigned to
    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(cert.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('You can only delete certificates for your assigned courses');
    }

    await certificateRepository.delete(id);
    return { message: 'Certificate deleted successfully' };
  },
};
