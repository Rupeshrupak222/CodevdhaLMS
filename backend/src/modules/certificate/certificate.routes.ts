import { Router } from 'express';
import { certificateController } from './certificate.controller';
import { authenticate } from '../../middlewares/authenticate';
import { adminOrTeacher } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import {
  generateCertificateSchema,
  certificateListQuerySchema,
} from './certificate.validator';

const router = Router();

// Verification endpoint is public! (doesn't require authentication, so anyone can verify a certificate by verifyId)
router.get('/verify/:verifyId', certificateController.verifyCertificate);

// All other endpoints require authentication
router.use(authenticate);

router.get('/', validate(certificateListQuerySchema, 'query'), certificateController.listCertificates);

// Admin/Teacher operations
router.post('/', adminOrTeacher, validate(generateCertificateSchema), certificateController.generateCertificate);
router.delete('/:id', adminOrTeacher, certificateController.deleteCertificate);

export default router;
