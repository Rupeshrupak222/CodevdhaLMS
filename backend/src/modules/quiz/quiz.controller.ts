import { Request, Response } from 'express';
import { quizService } from './quiz.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';

const param = (req: Request, key: string): string => req.params[key] as string;

export const quizController = {
  listQuizzes: asyncHandler(async (req: Request, res: Response) => {
    const result = await quizService.listQuizzes(req.query as any, req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: result.quizzes, meta: result.meta });
  }),

  getQuiz: asyncHandler(async (req: Request, res: Response) => {
    const quiz = await quizService.getQuiz(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: quiz });
  }),

  createQuiz: asyncHandler(async (req: Request, res: Response) => {
    const quiz = await quizService.createQuiz(req.body, req.user!.userId, req.user!.role);
    return sendCreated(res, { message: 'Quiz created successfully', data: quiz });
  }),

  updateQuiz: asyncHandler(async (req: Request, res: Response) => {
    const quiz = await quizService.updateQuiz(param(req, 'id'), req.body, req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: 'Quiz updated', data: quiz });
  }),

  deleteQuiz: asyncHandler(async (req: Request, res: Response) => {
    const result = await quizService.deleteQuiz(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: result.message });
  }),

  // ── Attempts ───────────────────────────────────────────────────────────────

  submitAttempt: asyncHandler(async (req: Request, res: Response) => {
    const attempt = await quizService.submitAttempt(param(req, 'id'), req.body, req.user!.userId);
    return sendCreated(res, { message: 'Quiz submitted successfully', data: attempt });
  }),

  getMyAttempt: asyncHandler(async (req: Request, res: Response) => {
    const attempt = await quizService.getMyAttempt(param(req, 'id'), req.user!.userId);
    return sendSuccess(res, { data: attempt });
  }),

  getQuizAttempts: asyncHandler(async (req: Request, res: Response) => {
    const attempts = await quizService.getQuizAttempts(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: attempts });
  }),
};
