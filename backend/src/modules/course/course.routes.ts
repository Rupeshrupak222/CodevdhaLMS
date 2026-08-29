import { Router } from 'express';
import { courseController } from './course.controller';
import { authenticate } from '../../middlewares/authenticate';
import { roleLimiter } from '../../middlewares/rateLimiter';
import { authorize, adminOnly, adminOrTeacher } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import {
  createCourseSchema,
  updateCourseSchema,
  assignTeachersSchema,
  enrollStudentsSchema,
  courseListQuerySchema,
  createLessonSchema,
  updateLessonSchema,
  bulkLessonsSchema,
  createCategorySchema,
} from './course.validator';

const router = Router();

// All routes require auth + role-based rate limiting
router.use(authenticate);
router.use(roleLimiter);

// ── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', courseController.listCategories);
router.post('/categories', adminOnly, validate(createCategorySchema), courseController.createCategory);

// ── Courses ──────────────────────────────────────────────────────────────────
router.get('/', validate(courseListQuerySchema, 'query'), courseController.listCourses);

// Admin creates course (can include teacherIds + studentIds in body)
router.post('/', adminOnly, validate(createCourseSchema), courseController.createCourse);

router.get('/:id', courseController.getCourse);
router.put('/:id', adminOrTeacher, validate(updateCourseSchema), courseController.updateCourse);
router.delete('/:id', adminOnly, courseController.deleteCourse);

// ── Teacher assignment (Admin only) ───────────────────────────────────────────
router.get('/:id/teachers', adminOrTeacher, courseController.getCourseTeachers);
router.post('/:id/teachers', adminOnly, validate(assignTeachersSchema), courseController.assignTeachers);
router.delete('/:id/teachers/:teacherId', adminOnly, courseController.removeTeacher);

// ── Student enrollment ────────────────────────────────────────────────────────
router.get('/:id/students', adminOrTeacher, courseController.getCourseStudents);
// Admin bulk-enrolls students
router.post('/:id/students', adminOnly, validate(enrollStudentsSchema), courseController.enrollStudents);
// Admin removes a student
router.delete('/:id/students/:studentId', adminOnly, courseController.unenrollStudent);
// Student self-enrolls
router.post('/:id/enroll', authorize('STUDENT'), courseController.selfEnroll);
// Student updates their progress
router.put('/:id/progress', authorize('STUDENT'), courseController.updateProgress);

// ── Lessons ───────────────────────────────────────────────────────────────────
router.get('/:id/lessons', courseController.getCourseLessons);
router.post('/:id/lessons', adminOrTeacher, validate(createLessonSchema), courseController.createLesson);
router.put('/:id/lessons', adminOrTeacher, validate(bulkLessonsSchema), courseController.bulkUpdateLessons);
router.patch('/:id/lessons/:lessonId', adminOnly, validate(updateLessonSchema), courseController.updateLesson);

export default router;
