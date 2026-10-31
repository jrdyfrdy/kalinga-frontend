import { Router } from 'express';
import accountController from '../controllers/accountController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = Router();

router.use(authenticate);

// GET /api/account/status
router.get('/status', accountController.getStatus);

// PUT /api/account/verify      — admin/hospital_admin/dispatcher
router.put('/verify', requireRole(['admin', 'hospital_admin', 'dispatcher']), accountController.verify);

// PUT /api/account/deactivate  — admin or self
router.put('/deactivate', accountController.deactivate);

export default router;
