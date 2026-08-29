import { quizRepository } from './quiz.repository';
import { courseRepository } from '../course/course.repository';
import { AppError } from '../../utils/apiError';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateQuizInput, UpdateQuizInput, SubmitQuizAttemptInput, QuizListQuery } from './quiz.validator';
import prisma from '../../config/database';

export const quizService = {
  listQuizzes: async (query: QuizListQuery, requesterId: string, requesterRole: string) => {
    const { page, limit, skip } = parsePaginationParams(query);

    const filters: any = { skip, take: limit, courseId: query.courseId };

    if (requesterRole === 'STUDENT') {
      filters.isPublished = true;
      if (query.courseId) {
        const enrollment = await courseRepository.isStudentEnrolled(query.courseId, requesterId);
        if (!enrollment) throw AppError.forbidden('Not enrolled in this course');
        // Show both course-wide quizzes (batchId=null) AND student's batch quizzes
        filters.batchIds = enrollment.batchId ? [enrollment.batchId, null] : [null];
      } else {
        const enrollments = await prisma.enrollment.findMany({
          where: { studentId: requesterId },
          select: { courseId: true, batchId: true },
        });
        filters.courseIds = enrollments.map((e) => e.courseId);
        // Build per-course batch filter: for each enrollment, allow quizzes from
        // the student's batch + course-wide quizzes (batchId=null)
        const courseBatchPairs: Array<{ courseId: string; batchId: string | null }> = [];
        for (const e of enrollments) {
          courseBatchPairs.push({ courseId: e.courseId, batchId: null }); // course-wide quizzes
          if (e.batchId) {
            courseBatchPairs.push({ courseId: e.courseId, batchId: e.batchId }); // batch-specific quizzes
          }
        }
        filters.courseBatchPairs = courseBatchPairs;
      }
    } else if (requesterRole === 'TEACHER') {
      if (query.courseId) {
        const isAssigned = await courseRepository.isTeacherAssigned(query.courseId, requesterId);
        if (!isAssigned) throw AppError.forbidden('Not assigned to this course');
      } else {
        const assignments = await prisma.courseTeacher.findMany({
          where: { teacherId: requesterId },
          select: { courseId: true },
        });
        filters.courseIds = assignments.map((a) => a.courseId);
      }
    }

    if (requesterRole !== 'STUDENT') {
      if (query.batchId !== undefined) {
        filters.batchId = query.batchId === 'null' || query.batchId === '' ? null : query.batchId;
      }
    }

    const [quizzes, total] = await quizRepository.findAll(filters);
    return { quizzes, meta: buildPaginationMeta({ page, limit, total }) };
  },

  getQuiz: async (id: string, requesterId: string, requesterRole: string) => {
    // Teachers/Admins see answers, Students do not
    const includeAnswers = requesterRole !== 'STUDENT';
    const quiz = await quizRepository.findById(id, includeAnswers);

    if (!quiz) throw AppError.notFound('Quiz not found');

    if (requesterRole === 'STUDENT') {
      if (!quiz.isPublished) throw AppError.forbidden('Quiz is not published');
      const enrollment = await courseRepository.isStudentEnrolled(quiz.course.id, requesterId);
      if (!enrollment) throw AppError.forbidden('Not enrolled in this course');
      // If quiz is batch-specific, verify student belongs to that batch
      if (quiz.batchId && enrollment.batchId !== quiz.batchId) {
        throw AppError.forbidden('This quiz is not available for your batch');
      }
    } else if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(quiz.course.id, requesterId);
      if (!isAssigned) throw AppError.forbidden('Not assigned to this course');
    }

    return quiz;
  },

  createQuiz: async (input: CreateQuizInput, requesterId: string, requesterRole: string) => {
    const course = await courseRepository.findById(input.courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(input.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('Can only create quizzes for assigned courses');
    }

    return quizRepository.create(input, requesterId);
  },

  updateQuiz: async (id: string, input: UpdateQuizInput, requesterId: string, requesterRole: string) => {
    const quiz = await quizRepository.findById(id, false);
    if (!quiz) throw AppError.notFound('Quiz not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(quiz.course.id, requesterId);
      if (!isAssigned) throw AppError.forbidden('Can only update quizzes for assigned courses');
    }

    return quizRepository.update(id, input);
  },

  deleteQuiz: async (id: string, requesterId: string, requesterRole: string) => {
    const quiz = await quizRepository.findById(id, false);
    if (!quiz) throw AppError.notFound('Quiz not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(quiz.course.id, requesterId);
      if (!isAssigned) throw AppError.forbidden('Can only delete quizzes for assigned courses');
    }

    await quizRepository.delete(id);
    return { message: 'Quiz deleted successfully' };
  },

  // ── Attempts ───────────────────────────────────────────────────────────────

  submitAttempt: async (quizId: string, input: SubmitQuizAttemptInput, studentId: string) => {
    // Get quiz with answers for grading
    const quiz = await quizRepository.findById(quizId, true);
    if (!quiz) throw AppError.notFound('Quiz not found');
    if (!quiz.isPublished) throw AppError.forbidden('Quiz is not published');

    const enrollment = await courseRepository.isStudentEnrolled(quiz.course.id, studentId);
    if (!enrollment) throw AppError.forbidden('Not enrolled in this course');
    // If quiz is batch-specific, verify student belongs to that batch
    if (quiz.batchId && enrollment.batchId !== quiz.batchId) {
      throw AppError.forbidden('This quiz is not available for your batch');
    }

    const existing = await quizRepository.findAttempt(quizId, studentId);
    if (existing) throw AppError.conflict('You have already attempted this quiz');

    // Auto-grading logic (case-insensitive comparison)
    let score = 0;
    const total = quiz.questions.length;

    for (const question of quiz.questions) {
      const studentAnswer = input.answers[question.id];
      if (studentAnswer && studentAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()) {
        score += 1;
      }
    }

    const percentage = total > 0 ? (score / total) * 100 : 0;

    const attempt = await quizRepository.createAttempt({
      quizId,
      studentId,
      score,
      total,
      percentage,
      answers: input.answers,
    });

    // Save to WeeklyScore for analytics
    await prisma.weeklyScore.create({
      data: {
        studentId,
        courseId: quiz.course.id,
        weekLabel: `Quiz: ${quiz.title}`,
        score: Math.round(percentage),
      }
    });

    return attempt;
  },

  getMyAttempt: async (quizId: string, studentId: string) => {
    const attempt = await quizRepository.findAttempt(quizId, studentId);
    if (!attempt) throw AppError.notFound('No attempt found for this quiz');
    return attempt;
  },

  getQuizAttempts: async (quizId: string, requesterId: string, requesterRole: string) => {
    const quiz = await quizRepository.findById(quizId, false);
    if (!quiz) throw AppError.notFound('Quiz not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(quiz.course.id, requesterId);
      if (!isAssigned) throw AppError.forbidden('Not assigned to this course');
    }

    return quizRepository.findAttemptsForQuiz(quizId);
  },
};
