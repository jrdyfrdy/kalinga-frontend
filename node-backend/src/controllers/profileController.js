import profileService from '../services/profileService.js';
import response from '../utils/response.js';
import { parseDeviceName, normalizeIp } from './authController.js';

// Identify "this device" the same way /auth/record-device stores it.
const currentDeviceKey = (req) => ({
  deviceName: parseDeviceName(req.headers['user-agent']),
  ipAddress: normalizeIp(req.ip),
});

const getProfile = async (req, res, next) => {
  try {
    const data = await profileService.getProfile(req.dbUser.id);
    return response.success(res, data);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = await profileService.updateProfile(req.dbUser.id, req.body);
    return response.success(res, data, 'Profile updated');
  } catch (err) { next(err); }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return response.error(res, 'No file uploaded', 400);
    }

    // The file is stored on this server (multer disk storage) and served from
    // /uploads; previously a Supabase Storage URL was saved without ever
    // uploading the file there.
    const base = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const avatarUrl = `${base}/uploads/avatars/${req.file.filename}`;

    const data = await profileService.updateAvatar(req.dbUser.id, avatarUrl);
    return response.success(res, data, 'Avatar uploaded');
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    await profileService.changePassword(req.dbUser.id, current_password, new_password);
    return response.success(res, null, 'Password changed successfully');
  } catch (err) { next(err); }
};

const getDevices = async (req, res, next) => {
  try {
    const data = await profileService.getDevices(req.dbUser.id, currentDeviceKey(req));
    return response.success(res, data);
  } catch (err) { next(err); }
};

const removeDevice = async (req, res, next) => {
  try {
    await profileService.removeDevice(req.dbUser.id, req.params.deviceId, currentDeviceKey(req));
    return response.success(res, null, 'Device logged out');
  } catch (err) { next(err); }
};

export default { getProfile, updateProfile, uploadAvatar, changePassword, getDevices, removeDevice };
