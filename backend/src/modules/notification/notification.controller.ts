import { Request, Response } from 'express';
import prisma from '../../config/database';
import { AppError } from '../../utils/apiError';
import { asyncHandler } from '../../utils/asyncHandler';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw AppError.unauthorized();
  }

  // Get user role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  const userRole = user?.role || 'STUDENT';

  const personalNotifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [
        { targetRole: 'ALL' },
        { targetRole: userRole }
      ],
      NOT: {
        reads: {
          some: {
            userId,
            isDeleted: true
          }
        }
      }
    },
    include: {
      reads: {
        where: { userId }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const mappedAnnouncements = announcements.map((a: any) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type,
    isRead: a.reads.length > 0,
    createdAt: a.createdAt,
    isGlobal: true
  }));

  const combined = [...personalNotifications, ...mappedAnnouncements]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  res.json({
    success: true,
    data: combined
  });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.userId;

  if (!userId) {
    throw AppError.unauthorized();
  }

  const notification = await prisma.notification.findUnique({
    where: { id }
  });

  if (notification) {
    if (notification.userId !== userId) {
      throw AppError.forbidden('Unauthorized access to this notification');
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    return res.json({ success: true, data: updated });
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id }
  });

  if (announcement) {
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId
        }
      },
      create: {
        announcementId: id,
        userId
      },
      update: {}
    });
    return res.json({ success: true, data: { ...announcement, isRead: true } });
  }

  throw AppError.notFound('Notification not found');
});

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, targetAudience, type = 'INFO' } = req.body;
  const adminId = req.user?.userId;

  if (!adminId) {
    throw AppError.unauthorized();
  }

  if (!title || !description || !targetAudience) {
    throw AppError.badRequest('Title, description and target audience are required');
  }

  let targetRole = 'ALL';
  if (targetAudience === 'all_students') targetRole = 'STUDENT';
  if (targetAudience === 'all_teachers') targetRole = 'TEACHER';

  await prisma.announcement.create({
    data: {
      title,
      description,
      type,
      targetRole
    }
  });

  res.status(201).json({
    success: true,
    message: 'Announcement successfully created for ' + targetAudience
  });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.userId;

  if (!userId) {
    throw AppError.unauthorized();
  }

  // Try to find if it's a personal notification
  const notification = await prisma.notification.findUnique({
    where: { id }
  });

  if (notification) {
    if (notification.userId !== userId) {
      throw AppError.forbidden('Unauthorized access');
    }
    await prisma.notification.delete({
      where: { id }
    });
    return res.json({ success: true, message: 'Notification deleted' });
  }

  // If not personal, it might be an announcement
  const announcement = await prisma.announcement.findUnique({
    where: { id }
  });

  if (announcement) {
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId
        }
      },
      create: {
        announcementId: id,
        userId,
        isDeleted: true
      },
      update: {
        isDeleted: true
      }
    });
    return res.json({ success: true, message: 'Announcement deleted' });
  }

  throw AppError.notFound('Notification not found');
});
