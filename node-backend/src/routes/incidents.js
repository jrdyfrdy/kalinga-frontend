import { Router } from 'express';
import incidentsController from '../controllers/incidentsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = Router();

// GET    /api/incidents            — paginated + filterable
router.get('/', authenticate, incidentsController.getAll);

// GET    /api/incidents/:id
router.get('/:id', authenticate, incidentsController.getById);

// POST   /api/incidents
router.post('/', authenticate, incidentsController.create);

// PUT    /api/incidents/:id
router.put('/:id', authenticate, incidentsController.update);

// DELETE /api/incidents/:id        — admin only
router.delete('/:id', authenticate, requireRole(['admin']), incidentsController.remove);

export default router;
