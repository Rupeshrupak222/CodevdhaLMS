import { Request, Response } from 'express';
import { certificateService } from './certificate.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';

const param = (req: Request, key: string): string => req.params[key] as string;

export const certificateController = {
  listCertificates: asyncHandler(async (req: Request, res: Response) => {
    const result = await certificateService.listCertificates(req.query as any, req.user!.userId, req.user!.role);
    return sendSuccess(res, { data: result.certificates, meta: result.meta });
  }),

  verifyCertificate: asyncHandler(async (req: Request, res: Response) => {
    const certificate = await certificateService.verifyCertificate(param(req, 'verifyId'));
    return sendSuccess(res, { data: certificate });
  }),

  generateCertificate: asyncHandler(async (req: Request, res: Response) => {
    const result = await certificateService.generateCertificate(req.body, req.user!.userId, req.user!.role);
    return sendCreated(res, { message: result.message, data: { issued: result.issued, skipped: result.skipped } });
  }),

  deleteCertificate: asyncHandler(async (req: Request, res: Response) => {
    const result = await certificateService.deleteCertificate(param(req, 'id'), req.user!.userId, req.user!.role);
    return sendSuccess(res, { message: result.message });
  }),
};
