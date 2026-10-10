import respondersService from '../services/respondersService.js';
import response from '../utils/response.js';

const getAll = async (req, res, next) => {
  try {
    const result = await respondersService.getAll(req.query);
    return response.paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

const getActive = async (req, res, next) => {
  try {
    const result = await respondersService.getActive();
    return response.success(res, result);
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try {
    const data = await respondersService.getStats();
    return response.success(res, data);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await respondersService.getById(req.params.id);
    if (!data) return response.notFound(res, 'Responder not found');
    return response.success(res, data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await respondersService.create(req.body, req.dbUser.id);
    return response.created(res, data);
  } catch (err) { next(err); }
};

const MANAGER_ROLES = ['admin', 'dispatcher', 'hospital_admin'];

const update = async (req, res, next) => {
  try {
    if (!MANAGER_ROLES.includes(req.dbUser.role)) {
      const responder = await respondersService.getById(req.params.id);
      if (String(responder.user_id) !== String(req.dbUser.id)) {
        return response.forbidden(res, 'You can only update your own responder profile.');
      }
    }
    const data = await respondersService.update(req.params.id, req.body);
    return response.success(res, data, 'Responder updated');
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return response.error(res, 'Status is required', 400);
    // :id is a user id here — responders change their own duty status.
    if (String(req.params.id) !== String(req.dbUser.id) && !MANAGER_ROLES.includes(req.dbUser.role)) {
      return response.forbidden(res, 'You can only change your own duty status.');
    }
    const data = await respondersService.updateStatusByUserId(req.params.id, status);
    return response.success(res, data, 'Duty status updated');
  } catch (err) { next(err); }
};

export default { getAll, getActive, getStats, getById, create, update, updateStatus };
