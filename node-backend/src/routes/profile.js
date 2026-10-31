import { Router } from 'express';
import profileController from '../controllers/profileController.js';
import { authenticate } from '../middleware/auth.js';
import activityLogger from '../middleware/activityLogger.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = Router();

// Restrict avatar uploads to image MIME types only (prevents script/executable uploads)
const avatarFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(Object.assign(new Error('Only image files are allowed'), { statusCode: 400 }), false);
};
export const AVATAR_DIR = path.resolve('uploads/avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

// Keep a real image extension so the file is served with the right Content-Type.
const storage = multer.diskStorage({
  destination: AVATAR_DIR,
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '.png').toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${req.dbUser?.id ?? 'user'}-${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: avatarFilter,
});

router.use(authenticate);

// GET  /api/profile
router.get('/', activityLogger('profile_view', 'profile'), profileController.getProfile);

// PUT  /api/profile
router.put('/', activityLogger('profile_update', 'profile'), profileController.updateProfile);

// POST /api/profile/avatar      — multipart file upload
router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);

// PUT  /api/profile/password
router.put('/password', profileController.changePassword);

// GET  /api/profile/devices
router.get('/devices', profileController.getDevices);

// DELETE /api/profile/devices/:deviceId
router.delete('/devices/:deviceId', profileController.removeDevice);

export default router;
