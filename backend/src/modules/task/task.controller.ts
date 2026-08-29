import { Request, Response } from 'express';
import { taskService } from './task.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';

const param = (req: Request, key: string): string => req.params[key] as string;

export const taskController = {
  listTasks: asyncHandler(async (req: Request, res: Response) => {
    const result = await taskService.listTasks(req.query as any, req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: result.tasks, meta: result.meta });
  }),

  getTask: asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.getTask(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: task });
  }),

  createTask: asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.createTask(req.body, req.user!.userId, req.user!.role);
    return sendCreated(res, { message: 'Task created successfully', data: task });
  }),

  updateTask: asyncHandler(async (req: Request, res: Response) => {
    const task = await taskService.updateTask(param(req, 'id'), req.body, req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: 'Task updated', data: task });
  }),

  deleteTask: asyncHandler(async (req: Request, res: Response) => {
    const result = await taskService.deleteTask(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: result.message });
  }),

  // ── Submissions ────────────────────────────────────────────────────────────

  submitTask: asyncHandler(async (req: Request, res: Response) => {
    const submission = await taskService.submitTask(param(req, 'id'), req.body, req.user!.userId);
    return sendCreated(res, { message: 'Task submitted successfully', data: submission });
  }),

  gradeSubmission: asyncHandler(async (req: Request, res: Response) => {
    const result = await taskService.gradeSubmission(
      param(req, 'id'),
      param(req, 'studentId'),
      req.body,
      req.user!.userId,
      req.user!.role
    );
    return sendSuccess(res, { message: 'Grade submitted', data: result });
  }),
};
