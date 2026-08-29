import { Router } from 'express';
import { taskController } from './task.controller';
import { authenticate } from '../../middlewares/authenticate';
import { roleLimiter } from '../../middlewares/rateLimiter';
import { authorize, adminOrTeacher } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  submitTaskSchema,
  gradeTaskSchema,
  taskListQuerySchema,
} from './task.validator';

const router = Router();

router.use(authenticate);
router.use(roleLimiter);

router.get('/', validate(taskListQuerySchema, 'query'), taskController.listTasks);
router.get('/:id', taskController.getTask);

// Admin / Teacher
router.post('/', adminOrTeacher, validate(createTaskSchema), taskController.createTask);
router.put('/:id', adminOrTeacher, validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', adminOrTeacher, taskController.deleteTask);
router.put('/:id/submissions/:studentId/grade', adminOrTeacher, validate(gradeTaskSchema), taskController.gradeSubmission);

// Student
router.post('/:id/submissions', authorize('STUDENT'), validate(submitTaskSchema), taskController.submitTask);

export default router;
