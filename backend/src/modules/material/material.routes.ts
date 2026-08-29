import { Router } from 'express';
import { materialController } from './material.controller';
import { authenticate } from '../../middlewares/authenticate';
import { roleLimiter } from '../../middlewares/rateLimiter';
import { authorize, adminOnly, adminOrTeacher } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { createMaterialSchema, updateMaterialSchema, materialListQuerySchema } from './material.validator';

const router = Router();

router.use(authenticate);
router.use(roleLimiter);

router.get('/', validate(materialListQuerySchema, 'query'), materialController.listMaterials);
router.get('/:id', materialController.getMaterial);
router.post('/', adminOrTeacher, validate(createMaterialSchema), materialController.createMaterial);
router.put('/:id', adminOnly, validate(updateMaterialSchema), materialController.updateMaterial);
router.delete('/:id', adminOnly, materialController.deleteMaterial);

export default router;
