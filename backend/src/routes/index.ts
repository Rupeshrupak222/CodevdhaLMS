import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/user/user.routes';
import courseRoutes from '../modules/course/course.routes';
import materialRoutes from '../modules/material/material.routes';
import quizRoutes from '../modules/quiz/quiz.routes';
import taskRoutes from '../modules/task/task.routes';
import attendanceRoutes from '../modules/attendance/attendance.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import liveClassRoutes from '../modules/live-class/live-class.routes';
import certificateRoutes from '../modules/certificate/certificate.routes';
import uploadRoutes from './upload.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import batchRoutes from '../modules/batch/batch.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'CodVedha LMS API is running' });
});

// ── Public routes (no role-based limiting — handled by IP-based auth limiter) ──
router.use('/auth', authRoutes);

// ── Protected routes (role-based per-user rate limiting) ─────────────────────
// The roleLimiter runs AFTER authenticate (inside each module), applying:
//   Students:  200 req / 15 min per user
//   Teachers:  500 req / 15 min per user
//   Admins:    800 req / 15 min per user
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/materials', materialRoutes);
router.use('/quizzes', quizRoutes);
router.use('/tasks', taskRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/live-classes', liveClassRoutes);
router.use('/certificates', certificateRoutes);
router.use('/upload', uploadRoutes);
router.use('/notifications', notificationRoutes);
router.use('/batches', batchRoutes);

export default router;
