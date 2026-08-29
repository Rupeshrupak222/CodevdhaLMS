import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize, adminOrTeacher } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { markAttendanceSchema, editAttendanceSchema, attendanceQuerySchema, attendanceHistoryQuerySchema } from './attendance.validator';

const router = Router();

router.use(authenticate);

// View attendance (Students see own, Teachers/Admins see all)
router.get('/', validate(attendanceQuerySchema, 'query'), attendanceController.getAttendance);

// View attendance history (Admin/Teacher only) with pagination
router.get('/history', adminOrTeacher, validate(attendanceHistoryQuerySchema, 'query'), attendanceController.getAttendanceHistory);

// Mark attendance (Teacher/Admin only)
router.post('/', adminOrTeacher, validate(markAttendanceSchema), attendanceController.markAttendance);

// Edit attendance (Teacher/Admin only)
router.put('/', adminOrTeacher, validate(editAttendanceSchema), attendanceController.editAttendance);

export default router;
