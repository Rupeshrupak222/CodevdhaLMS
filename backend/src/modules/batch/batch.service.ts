import { batchRepository, computeEndDate } from './batch.repository';
import { courseRepository } from '../course/course.repository';
import { userRepository } from '../user/user.repository';
import { AppError } from '../../utils/apiError';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateBatchInput, UpdateBatchInput, BatchListQuery, AssignStudentsToBatchInput } from './batch.validator';

export const batchService = {
  // ── Create Batch ─────────────────────────────────────────────────────────────
  createBatch: async (input: CreateBatchInput) => {
    const course = await courseRepository.findById(input.courseId);
    if (!course) throw AppError.notFound('Course not found');

    const startDate = new Date(input.startDate);
    if (isNaN(startDate.getTime())) throw AppError.badRequest('Invalid start date');

    const durationDays = input.durationDays || 'DAYS_90';
    const endDate = computeEndDate(startDate, durationDays);

    return batchRepository.create({
      courseId: input.courseId,
      name: input.name,
      durationDays,
      startDate,
      endDate,
    });
  },

  // ── List Batches ─────────────────────────────────────────────────────────────
  listBatches: async (query: BatchListQuery) => {
    const { page, limit, skip } = parsePaginationParams(query);
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const [batches, total] = await batchRepository.findAll({
      courseId: query.courseId,
      isActive,
      search: query.search,
      skip,
      take: limit,
    });

    return { batches, meta: buildPaginationMeta({ page, limit, total }) };
  },

  // ── Get Batch ────────────────────────────────────────────────────────────────
  getBatch: async (id: string) => {
    const batch = await batchRepository.findById(id);
    if (!batch) throw AppError.notFound('Batch not found');
    return batch;
  },

  // ── Update Batch ─────────────────────────────────────────────────────────────
  updateBatch: async (id: string, input: UpdateBatchInput) => {
    const batch = await batchRepository.findById(id);
    if (!batch) throw AppError.notFound('Batch not found');

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.durationDays !== undefined) updateData.durationDays = input.durationDays;

    if (input.startDate !== undefined || input.durationDays !== undefined) {
      const activeStartDate = input.startDate ? new Date(input.startDate) : new Date(batch.startDate);
      if (isNaN(activeStartDate.getTime())) throw AppError.badRequest('Invalid start date');
      const activeDurationDays = input.durationDays || batch.durationDays;
      updateData.startDate = activeStartDate;
      updateData.endDate = computeEndDate(activeStartDate, activeDurationDays);
    }

    return batchRepository.update(id, updateData);
  },

  // ── Toggle Active ────────────────────────────────────────────────────────────
  toggleBatchActive: async (id: string) => {
    const batch = await batchRepository.findById(id);
    if (!batch) throw AppError.notFound('Batch not found');
    return batchRepository.update(id, { isActive: !batch.isActive });
  },

  // ── Delete Batch ─────────────────────────────────────────────────────────────
  deleteBatch: async (id: string) => {
    const batch = await batchRepository.findById(id);
    if (!batch) throw AppError.notFound('Batch not found');
    await batchRepository.delete(id);
    return { message: `Batch "${batch.name}" deleted successfully. Enrolled students remain in the course.` };
  },

  // ── Assign Students to Batch ─────────────────────────────────────────────────
  assignStudentsToBatch: async (batchId: string, input: AssignStudentsToBatchInput) => {
    const batch = await batchRepository.findById(batchId);
    if (!batch) throw AppError.notFound('Batch not found');

    const courseId = batch.courseId;

    // Validate all provided IDs are students enrolled in the course
    for (const sid of input.studentIds) {
      const user = await userRepository.findById(sid);
      if (!user || user.role !== 'STUDENT') {
        throw AppError.badRequest(`User ${sid} is not a student`);
      }
      const enrollment = await courseRepository.isStudentEnrolled(courseId, sid);
      if (!enrollment) {
        throw AppError.badRequest(`Student ${user.name} is not enrolled in this course`);
      }
    }

    await batchRepository.assignStudentsToBatch(batchId, courseId, input.studentIds, batch.durationDays);
    return batchRepository.getBatchStudents(batchId);
  },

  // ── Remove Student from Batch ────────────────────────────────────────────────
  removeStudentFromBatch: async (batchId: string, studentId: string) => {
    const batch = await batchRepository.findById(batchId);
    if (!batch) throw AppError.notFound('Batch not found');
    await batchRepository.removeStudentFromBatch(batchId, studentId);
    return { message: 'Student removed from batch. They remain enrolled in the course.' };
  },

  // ── Get Batch Students ───────────────────────────────────────────────────────
  getBatchStudents: async (batchId: string) => {
    const batch = await batchRepository.findById(batchId);
    if (!batch) throw AppError.notFound('Batch not found');
    return batchRepository.getBatchStudents(batchId);
  },
};
