import incidentsService from '../services/incidentsService.js';
import response from '../utils/response.js';

const getAll = async (req, res, next) => {
  try {
    const result = await incidentsService.getAll(req.query, req.dbUser);
    return response.paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await incidentsService.getById(req.params.id);
    if (!data) return response.notFound(res, 'Incident not found');
    if (req.dbUser.role === 'patient' && String(data.user_id) !== String(req.dbUser.id)) {
      return response.forbidden(res, 'You can only view incidents you reported.');
    }
    return response.success(res, data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await incidentsService.create(req.body, req.dbUser.id);
    return response.created(res, data, 'Incident created');
  } catch (err) { next(err); }
};

const STAFF_ROLES = ['admin', 'dispatcher', 'hospital_admin'];

const update = async (req, res, next) => {
  try {
    const { dbUser } = req;
    const incident = await incidentsService.getById(req.params.id);
    const isStaff = STAFF_ROLES.includes(dbUser.role);
    const isAssigned = String(incident.assigned_responder_id) === String(dbUser.id);
    const isReporter = String(incident.user_id) === String(dbUser.id);

    if (!isStaff && !isAssigned && !isReporter) {
      return response.forbidden(res, 'You are not allowed to modify this incident.');
    }

    let payload = req.body || {};
    if (!isStaff) {
      // Reporters may correct details; only the assigned responder may move status.
      // Reassignment is a dispatcher/admin action.
      const allowed = isAssigned ? ['status', 'description'] : ['description', 'location', 'latlng'];
      payload = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));
    }

    const data = await incidentsService.update(req.params.id, payload);
    return response.success(res, data, 'Incident updated');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await incidentsService.remove(req.params.id);
    return response.success(res, null, 'Incident deleted');
  } catch (err) { next(err); }
};

export default { getAll, getById, create, update, remove };
