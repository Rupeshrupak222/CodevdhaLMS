import { Router } from 'express';
import { liveClassController } from './live-class.controller';
import { authenticate } from '../../middlewares/authenticate';
import { adminOrTeacher } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import {
  createLiveClassSchema,
  updateLiveClassSchema,
  liveClassListQuerySchema,
} from './live-class.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(liveClassListQuerySchema, 'query'), liveClassController.listLiveClasses);
router.get('/:id', liveClassController.getLiveClass);

// Admin / Teacher operations
router.post('/', adminOrTeacher, validate(createLiveClassSchema), liveClassController.createLiveClass);
router.put('/:id', adminOrTeacher, validate(updateLiveClassSchema), liveClassController.updateLiveClass);
router.delete('/:id', adminOrTeacher, liveClassController.deleteLiveClass);

export default router;
