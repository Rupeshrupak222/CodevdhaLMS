import { Request, Response } from 'express';
import { liveClassService } from './live-class.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';

const param = (req: Request, key: string): string => req.params[key] as string;

export const liveClassController = {
  listLiveClasses: asyncHandler(async (req: Request, res: Response) => {
    const result = await liveClassService.listLiveClasses(req.query as any, req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: result.classes, meta: result.meta });
  }),

  getLiveClass: asyncHandler(async (req: Request, res: Response) => {
    const liveClass = await liveClassService.getLiveClass(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: liveClass });
  }),

  createLiveClass: asyncHandler(async (req: Request, res: Response) => {
    const liveClass = await liveClassService.createLiveClass(req.body, req.user!.userId, req.user!.role);
    return sendCreated(res, { message: 'Live class created successfully', data: liveClass });
  }),

  updateLiveClass: asyncHandler(async (req: Request, res: Response) => {
    const liveClass = await liveClassService.updateLiveClass(param(req, 'id'), req.body, req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: 'Live class updated successfully', data: liveClass });
  }),

  deleteLiveClass: asyncHandler(async (req: Request, res: Response) => {
    const result = await liveClassService.deleteLiveClass(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: result.message });
  }),
};
