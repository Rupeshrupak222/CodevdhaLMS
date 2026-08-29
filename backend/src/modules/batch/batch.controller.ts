import { Request, Response, NextFunction } from 'express';
import { batchService } from './batch.service';
import { sendSuccess } from '../../utils/response';
import {
  CreateBatchInput,
  UpdateBatchInput,
  BatchListQuery,
  AssignStudentsToBatchInput,
} from './batch.validator';

export const batchController = {
  listBatches: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await batchService.listBatches(req.query as BatchListQuery);
      sendSuccess(res, { data: result.batches, meta: result.meta });
    } catch (err) { next(err); }
  },

  createBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await batchService.createBatch(req.body as CreateBatchInput);
      sendSuccess(res, { data: batch, message: 'Batch created successfully', statusCode: 201 });
    } catch (err) { next(err); }
  },

  getBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await batchService.getBatch(req.params.id as string);
      sendSuccess(res, { data: batch });
    } catch (err) { next(err); }
  },

  updateBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await batchService.updateBatch(req.params.id as string, req.body as UpdateBatchInput);
      sendSuccess(res, { data: batch, message: 'Batch updated successfully' });
    } catch (err) { next(err); }
  },

  toggleBatchActive: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await batchService.toggleBatchActive(req.params.id as string);
      sendSuccess(res, { data: batch, message: `Batch ${batch.isActive ? 'activated' : 'deactivated'} successfully` });
    } catch (err) { next(err); }
  },

  deleteBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await batchService.deleteBatch(req.params.id as string);
      sendSuccess(res, { data: result });
    } catch (err) { next(err); }
  },

  getBatchStudents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const students = await batchService.getBatchStudents(req.params.id as string);
      sendSuccess(res, { data: students });
    } catch (err) { next(err); }
  },

  assignStudentsToBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const students = await batchService.assignStudentsToBatch(
        req.params.id as string,
        req.body as AssignStudentsToBatchInput,
      );
      sendSuccess(res, { data: students, message: 'Students assigned to batch successfully' });
    } catch (err) { next(err); }
  },

  removeStudentFromBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await batchService.removeStudentFromBatch(
        req.params.id as string,
        req.params.studentId as string,
      );
      sendSuccess(res, { data: result });
    } catch (err) { next(err); }
  },
};
