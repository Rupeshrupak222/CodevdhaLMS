import { taskRepository } from './task.repository';
import { courseRepository } from '../course/course.repository';
import { AppError } from '../../utils/apiError';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateTaskInput, UpdateTaskInput, SubmitTaskInput, GradeTaskInput, TaskListQuery } from './task.validator';
import { TaskStatus } from '@prisma/client';
import { resolveS3Url } from '../../utils/s3';
import prisma from '../../config/database';

export const taskService = {
  listTasks: async (query: TaskListQuery, requesterId: string, requesterRole: string) => {
    const { page, limit, skip } = parsePaginationParams(query);

    const filters: any = { skip, take: limit, courseId: query.courseId, status: query.status as TaskStatus };

    if (requesterRole === 'STUDENT') {
      filters.studentId = requesterId;

      // For students: determine visibility by enrollment (course + batch), not TaskAssignment.
      // This ensures new students added to a batch can see all existing batch tasks.
      if (query.courseId) {
        // Single course: show tasks for student's batch + course-wide tasks
        const enrollment = await courseRepository.isStudentEnrolled(query.courseId, requesterId);
        if (enrollment && enrollment.batchId) {
          filters.studentBatchFilter = [{ courseId: query.courseId, batchId: enrollment.batchId }];
        }
        // If no batchId on enrollment, all course tasks are visible (no extra filter needed)
      } else {
        // "All courses" view: get all enrollments and build course+batch filter
        const enrollments = await prisma.enrollment.findMany({
          where: { studentId: requesterId },
          select: { courseId: true, batchId: true },
        });
        if (enrollments.length > 0) {
          filters.studentBatchFilter = enrollments.map(e => ({
            courseId: e.courseId,
            batchId: e.batchId,
          }));
        }
      }
    } else if (requesterRole === 'TEACHER') {
      filters.teacherId = requesterId;
    }

    if (requesterRole !== 'STUDENT') {
      if (query.batchId !== undefined) {
        filters.batchId = query.batchId === 'null' || query.batchId === '' ? null : query.batchId;
      }
    }

    const [tasks, total] = await taskRepository.findAll(filters);
    const resolvedTasks = await Promise.all(
      tasks.map(async (task: any) => ({
        ...task,
        attachmentUrl: await resolveS3Url(task.attachmentUrl),
      }))
    );
    return { tasks: resolvedTasks, meta: buildPaginationMeta({ page, limit, total }) };
  },

  getTask: async (id: string, requesterId: string, requesterRole: string) => {
    // Teachers and Admins get to see all submissions
    const includeSubmissions = requesterRole !== 'STUDENT';
    const task = await taskRepository.findById(id, includeSubmissions);
    if (!task) throw AppError.notFound('Task not found');

    if (requesterRole === 'STUDENT') {
      // Verify student has access: check enrollment in the task's course
      const isEnrolled = await courseRepository.isStudentEnrolled(task.course.id, requesterId);
      if (!isEnrolled) throw AppError.forbidden('Not enrolled in this course');

      // Append student's own submission
      const submission = await taskRepository.findSubmission(id, requesterId);
      if (submission) {
        submission.fileUrl = await resolveS3Url(submission.fileUrl);
      }
      (task as any).mySubmission = submission;
    } else if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(task.course.id, requesterId);
      if (!isAssigned) throw AppError.forbidden('Not assigned to this course');
    }

    // Resolve submissions for teacher/admin view
    if (task.submissions && task.submissions.length > 0) {
      task.submissions = await Promise.all(
        task.submissions.map(async (sub: any) => ({
          ...sub,
          fileUrl: await resolveS3Url(sub.fileUrl),
        }))
      ) as any;
    }

    // For admin/teacher: also return enrolled students for the task's course/batch
    // so the frontend can show who has NOT submitted
    if (requesterRole !== 'STUDENT') {
      const enrolledStudents = await courseRepository.getCourseStudents(
        task.course.id,
        task.batchId || undefined
      );
      (task as any).enrolledStudents = enrolledStudents.map((e: any) => ({
        id: e.student.id,
        name: e.student.name,
        avatar: e.student.avatar,
      }));
    }

    (task as any).attachmentUrl = await resolveS3Url(task.attachmentUrl);

    return task;
  },

  createTask: async (input: CreateTaskInput, requesterId: string, requesterRole: string) => {
    const course = await courseRepository.findById(input.courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(input.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('Can only create tasks for assigned courses');
    }

    // If no specific students provided, assign to enrolled students (batch-filtered if batchId given)
    let studentIds = input.studentIds;
    if (!studentIds || studentIds.length === 0) {
      const enrolled = await courseRepository.getCourseStudents(input.courseId, input.batchId ?? undefined);
      studentIds = enrolled.map(e => e.student.id);
    }

    return taskRepository.create({
      title: input.title,
      description: input.description,
      courseId: input.courseId,
      batchId: input.batchId ?? null,
      dueDate: new Date(input.dueDate),
      attachmentUrl: input.attachmentUrl,
      createdById: requesterId,
      studentIds,
    });
  },

  updateTask: async (id: string, input: UpdateTaskInput, requesterId: string, requesterRole: string) => {
    const task = await taskRepository.findById(id);
    if (!task) throw AppError.notFound('Task not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(task.course.id, requesterId);
      if (!isAssigned) throw AppError.forbidden('Can only update tasks for assigned courses');
    }

    const data: any = { ...input };
    if (input.dueDate) data.dueDate = new Date(input.dueDate);

    return taskRepository.update(id, data);
  },

  deleteTask: async (id: string, requesterId: string, requesterRole: string) => {
    const task = await taskRepository.findById(id);
    if (!task) throw AppError.notFound('Task not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(task.course.id, requesterId);
      if (!isAssigned) throw AppError.forbidden('Can only delete tasks for assigned courses');
    }

    await taskRepository.delete(id);
    return { message: 'Task deleted' };
  },

  // ── Submissions ────────────────────────────────────────────────────────────

  submitTask: async (taskId: string, input: SubmitTaskInput, studentId: string) => {
    const task = await taskRepository.findById(taskId);
    if (!task) throw AppError.notFound('Task not found');

    const isEnrolled = await courseRepository.isStudentEnrolled(task.course.id, studentId);
    if (!isEnrolled) throw AppError.forbidden('Not enrolled in this course');

    const isLate = new Date() > task.dueDate;

    return taskRepository.upsertSubmission({
      taskId,
      studentId,
      isLate,
      ...input,
    });
  },

  gradeSubmission: async (taskId: string, studentId: string, input: GradeTaskInput, teacherId: string, role: string) => {
    const task = await taskRepository.findById(taskId);
    if (!task) throw AppError.notFound('Task not found');

    if (role === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(task.course.id, teacherId);
      if (!isAssigned) throw AppError.forbidden('Can only grade tasks for assigned courses');
    }

    const submission = await taskRepository.findSubmission(taskId, studentId);
    if (!submission) throw AppError.notFound('Submission not found');

    return taskRepository.gradeSubmission(submission.id, input);
  },
};
