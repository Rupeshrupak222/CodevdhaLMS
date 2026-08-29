import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize, adminOnly, selfOrAdmin, adminOrTeacher, selfOrAdminOrTeacher } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
} from './user.validator';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Admin-only: List all users
router.get('/', adminOnly, validate(userListQuerySchema, 'query'), userController.listUsers);

// Admin-only: Get teachers / students (for dropdowns)
router.get('/teachers', adminOnly, userController.getTeachers);
router.get('/students', adminOrTeacher, userController.getStudents);

// Admin-only: Create a user (admin/teacher/student)
router.post('/', adminOnly, validate(createUserSchema), userController.createUser);

// Get specific user (admin or self or teacher)
router.get('/:id', selfOrAdminOrTeacher(), userController.getUser);

// Update user (admin or self)
router.put('/:id', selfOrAdmin(), validate(updateUserSchema), userController.updateUser);

// Delete user (admin only)
router.delete('/:id', adminOnly, userController.deleteUser);

// Toggle user active/inactive (admin only)
router.patch('/:id/toggle-active', adminOnly, userController.toggleUserActive);

export default router;
