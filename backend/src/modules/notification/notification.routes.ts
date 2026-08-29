import { Router } from 'express';
import { getNotifications, createNotification, markAsRead, deleteNotification } from './notification.controller';
import { authenticate } from '../../middlewares/authenticate';
import { adminOnly } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.post('/', adminOnly, createNotification);

export default router;
