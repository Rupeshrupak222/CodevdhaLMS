import { Request, Response } from 'express';
import { materialService } from './material.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';

const param = (req: Request, key: string): string => req.params[key] as string;

export const materialController = {
  listMaterials: asyncHandler(async (req: Request, res: Response) => {
    const result = await materialService.listMaterials(req.query as any, req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: result.materials, meta: result.meta });
  }),

  getMaterial: asyncHandler(async (req: Request, res: Response) => {
    const material = await materialService.getMaterial(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: material });
  }),

  createMaterial: asyncHandler(async (req: Request, res: Response) => {
    const material = await materialService.createMaterial(req.body, req.user!.userId, req.user!.role);
    return sendCreated(res, { message: 'Material uploaded successfully', data: material });
  }),

  updateMaterial: asyncHandler(async (req: Request, res: Response) => {
    const material = await materialService.updateMaterial(param(req, 'id'), req.body, req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: 'Material updated', data: material });
  }),

  deleteMaterial: asyncHandler(async (req: Request, res: Response) => {
    const result = await materialService.deleteMaterial(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: result.message });
  }),
};
