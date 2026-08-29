import { Request, Response } from 'express';
import { userService } from './user.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response';

const param = (req: Request, key: string): string => req.params[key] as string;

export const userController = {
  // GET /api/users
  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.listUsers(req.query as any);
    return sendSuccess(res, { data: result.users, meta: result.meta });
  }),

  // GET /api/users/:id
  getUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(param(req, 'id'));
    return sendSuccess(res, { data: user });
  }),

  // POST /api/users (Admin creates user)
  createUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);
    return sendCreated(res, {
      message: `${req.body.role} account created successfully`,
      data: user,
    });
  }),

  // PUT /api/users/:id
  updateUser: asyncHandler(async (req: Request, res: Response) => {
    console.log('[USER PUT BODY]', req.params.id, req.body);
    const user = await userService.updateUser(
      param(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role
    );
    return sendSuccess(res, { message: 'User updated', data: user });
  }),

  // DELETE /api/users/:id (Admin only)
  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.deleteUser(param(req, 'id'), req.user!.userId);
    return sendSuccess(res, { message: 'User deleted', data: user });
  }),

  // GET /api/users/teachers (for course assignment dropdown)
  getTeachers: asyncHandler(async (req: Request, res: Response) => {
    const teachers = await userService.getTeachers(req.query as any);
    return sendSuccess(res, { data: teachers });
  }),

  // GET /api/users/students (for course assignment dropdown)
  getStudents: asyncHandler(async (req: Request, res: Response) => {
    const students = await userService.getStudents(req.query as any);
    return sendSuccess(res, { data: students });
  }),
  // PATCH /api/users/:id/toggle-active (Admin only)
  toggleUserActive: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.toggleUserActive(param(req, 'id'), req.user!.userId);
    return sendSuccess(res, { message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, data: user });
  }),
};
