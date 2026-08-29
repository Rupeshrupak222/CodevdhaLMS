import { Router } from 'express';
import { batchController } from './batch.controller';
import { authenticate } from '../../middlewares/authenticate';
import { adminOnly, adminOrTeacher } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import {
  createBatchSchema,
  updateBatchSchema,
  batchListQuerySchema,
  assignStudentsToBatchSchema,
} from './batch.validator';

const router = Router();

router.use(authenticate);

// ── Batch CRUD ────────────────────────────────────────────────────────────────
router.get('/', validate(batchListQuerySchema, 'query'), batchController.listBatches);
router.post('/', adminOnly, validate(createBatchSchema), batchController.createBatch);
router.get('/:id', batchController.getBatch);
router.put('/:id', adminOnly, validate(updateBatchSchema), batchController.updateBatch);
router.patch('/:id/toggle', adminOnly, batchController.toggleBatchActive);
router.delete('/:id', adminOnly, batchController.deleteBatch);

// ── Batch Student Management ──────────────────────────────────────────────────
router.get('/:id/students', adminOrTeacher, batchController.getBatchStudents);
router.post('/:id/students', adminOnly, validate(assignStudentsToBatchSchema), batchController.assignStudentsToBatch);
router.delete('/:id/students/:studentId', adminOnly, batchController.removeStudentFromBatch);

export default router;
