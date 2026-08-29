import { Request, Response } from 'express';
import { courseService } from './course.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';

// Helper to safely get route param
const param = (req: Request, key: string): string => req.params[key] as string;

export const courseController = {
  // GET /api/courses/categories
  listCategories: asyncHandler(async (req: Request, res: Response) => {
    const categories = await courseService.listCategories();
    return sendSuccess(res, { data: categories });
  }),

  // POST /api/courses/categories
  createCategory: asyncHandler(async (req: Request, res: Response) => {
    const category = await courseService.createCategory(req.body);
    return sendCreated(res, { message: 'Category created', data: category });
  }),

  // GET /api/courses
  listCourses: asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.listCourses(
      req.query as any,
      req.user!.userId,
      req.user!.role
    );
    return sendSuccess(res, { data: result.courses, meta: result.meta });
  }),

  // GET /api/courses/:id
  getCourse: asyncHandler(async (req: Request, res: Response) => {
    const course = await courseService.getCourse(
      param(req, 'id'),
      req.user!.userId,
      req.user!.role
    );
    return sendSuccess(res, { data: course });
  }),

  // POST /api/courses (Admin only)
  createCourse: asyncHandler(async (req: Request, res: Response) => {
    const course = await courseService.createCourse(req.body, req.user!.userId);
    return sendCreated(res, { message: 'Course created successfully', data: course });
  }),

  // PUT /api/courses/:id (Admin or assigned Teacher)
  updateCourse: asyncHandler(async (req: Request, res: Response) => {
    const course = await courseService.updateCourse(
      param(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role
    );
    return sendSuccess(res, { message: 'Course updated', data: course });
  }),

  // DELETE /api/courses/:id (Admin only)
  deleteCourse: asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.deleteCourse(param(req, 'id'));
    return sendSuccess(res, { message: result.message });
  }),

  // ── Student Progress ──────────────────────────────────────────────────────

  // PUT /api/courses/:id/progress (Student only)
  updateProgress: asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.updateEnrollmentProgress(
      param(req, 'id'),
      req.user!.userId,
      req.body.progress
    );
    return sendSuccess(res, { message: 'Progress updated', data: result });
  }),

  // ── Teacher Assignment ─────────────────────────────────────────────────────

  // POST /api/courses/:id/teachers
  assignTeachers: asyncHandler(async (req: Request, res: Response) => {
    const teachers = await courseService.assignTeachers(param(req, 'id'), req.body);
    return sendSuccess(res, { message: 'Teachers assigned', data: teachers });
  }),

  // DELETE /api/courses/:id/teachers/:teacherId
  removeTeacher: asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.removeTeacher(param(req, 'id'), param(req, 'teacherId'));
    return sendSuccess(res, { message: result.message });
  }),

  // GET /api/courses/:id/teachers
  getCourseTeachers: asyncHandler(async (req: Request, res: Response) => {
    const teachers = await courseService.getCourseTeachers(param(req, 'id'));
    return sendSuccess(res, { data: teachers });
  }),

  // ── Student Enrollment ────────────────────────────────────────────────────

  // POST /api/courses/:id/students (Admin assigns students)
  enrollStudents: asyncHandler(async (req: Request, res: Response) => {
    const students = await courseService.enrollStudents(
      param(req, 'id'),
      req.body,
      req.user!.role
    );
    return sendSuccess(res, { message: 'Students enrolled', data: students });
  }),

  // POST /api/courses/:id/enroll (Student self-enrolls)
  selfEnroll: asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.selfEnroll(param(req, 'id'), req.user!.userId);
    return sendCreated(res, { message: result.message });
  }),

  // DELETE /api/courses/:id/students/:studentId
  unenrollStudent: asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.unenrollStudent(param(req, 'id'), param(req, 'studentId'));
    return sendSuccess(res, { message: result.message });
  }),

  // GET /api/courses/:id/students
  getCourseStudents: asyncHandler(async (req: Request, res: Response) => {
    const students = await courseService.getCourseStudents(param(req, 'id'), req.query.batchId as string);
    return sendSuccess(res, { data: students });
  }),

  // ── Lessons ───────────────────────────────────────────────────────────────

  // GET /api/courses/:id/lessons
  getCourseLessons: asyncHandler(async (req: Request, res: Response) => {
    const lessons = await courseService.getCourseLessons(param(req, 'id'), req.query.durationDays as any);
    return sendSuccess(res, { data: lessons });
  }),

  // POST /api/courses/:id/lessons
  createLesson: asyncHandler(async (req: Request, res: Response) => {
    const lesson = await courseService.createLesson(
      param(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role
    );
    return sendCreated(res, { message: 'Lesson created', data: lesson });
  }),

  // PUT /api/courses/:id/lessons (bulk update syllabus)
  bulkUpdateLessons: asyncHandler(async (req: Request, res: Response) => {
    const lessons = await courseService.bulkUpdateLessons(
      param(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      req.query.durationDays as any
    );
    return sendSuccess(res, { message: 'Lessons updated', data: lessons });
  }),

  // PATCH /api/courses/:id/lessons/:lessonId (edit single lesson)
  updateLesson: asyncHandler(async (req: Request, res: Response) => {
    const lesson = await courseService.updateLesson(
      param(req, 'id'),
      param(req, 'lessonId'),
      req.body,
      req.user!.userId,
      req.user!.role
    );
    return sendSuccess(res, { message: 'Lesson updated', data: lesson });
  }),
};
