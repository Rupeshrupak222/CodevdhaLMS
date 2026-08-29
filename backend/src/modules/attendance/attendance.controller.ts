import { Request, Response } from 'express';
import { attendanceService } from './attendance.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

export const attendanceController = {
  getAttendance: asyncHandler(async (req: Request, res: Response) => {
    const records = await attendanceService.getAttendance(req.query as any, req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: records });
  }),

  getAttendanceHistory: asyncHandler(async (req: Request, res: Response) => {
    const result = await attendanceService.getAttendanceHistory(req.query as any, req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: result.records, meta: result.meta });
  }),

  markAttendance: asyncHandler(async (req: Request, res: Response) => {
    const result = await attendanceService.markAttendance(req.body, req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: 'Attendance marked successfully', data: result });
  }),

  editAttendance: asyncHandler(async (req: Request, res: Response) => {
    const result = await attendanceService.editAttendance(req.body, req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: 'Attendance updated successfully', data: result });
  }),
};
