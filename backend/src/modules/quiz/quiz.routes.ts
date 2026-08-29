import { Router } from 'express';
import { quizController } from './quiz.controller';
import { authenticate } from '../../middlewares/authenticate';
import { roleLimiter } from '../../middlewares/rateLimiter';
import { authorize, adminOrTeacher, adminOnly } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import {
  createQuizSchema,
  updateQuizSchema,
  submitQuizAttemptSchema,
  quizListQuerySchema,
} from './quiz.validator';

const router = Router();

router.use(authenticate);
router.use(roleLimiter);

router.get('/', validate(quizListQuerySchema, 'query'), quizController.listQuizzes);
router.get('/:id', quizController.getQuiz);

// Admin / Teacher specific routes
router.post('/', adminOrTeacher, validate(createQuizSchema), quizController.createQuiz);
router.put('/:id', adminOrTeacher, validate(updateQuizSchema), quizController.updateQuiz);
router.delete('/:id', adminOrTeacher, quizController.deleteQuiz);
router.get('/:id/attempts', adminOrTeacher, quizController.getQuizAttempts);

// Student specific routes
router.post('/:id/attempts', authorize('STUDENT'), validate(submitQuizAttemptSchema), quizController.submitAttempt);
router.get('/:id/my-attempt', authorize('STUDENT'), quizController.getMyAttempt);

export default router;
