import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

/**
 * Validate a Laravel Sanctum personal-access token.
 * Token format: "{id}|{plaintext}"
 * The DB stores SHA-256(plaintext) in personal_access_tokens.token.
 * Returns the tokenable_id (user id) on success, null on failure.
 */
const validateSanctumToken = async (rawToken) => {
  const pipeIdx = rawToken.indexOf('|');
  if (pipeIdx === -1) return null;

  const tokenId = rawToken.substring(0, pipeIdx);
  const plaintext = rawToken.substring(pipeIdx + 1);

  if (!tokenId || !plaintext) return null;

  const hash = crypto.createHash('sha256').update(plaintext).digest('hex');

  if (!/^\d+$/.test(tokenId)) return null;

  // Mirror Sanctum: only User tokens, and honour expires_at.
  const { rows } = await pool.query(
    `SELECT tokenable_id FROM personal_access_tokens
     WHERE id = $1 AND token = $2
       AND tokenable_type = 'App\\Models\\User'
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [tokenId, hash]
  );

  return rows[0]?.tokenable_id ?? null;
};

/**
 * Resolve a Bearer token to a userId.
 * Tries JWT first; if the token contains "|" falls back to Sanctum validation.
 */
const resolveToken = async (token) => {
  // Sanctum tokens always contain a pipe separator
  if (token.includes('|')) {
    const userId = await validateSanctumToken(token);
    return userId ? { sub: userId } : null;
  }

  // Otherwise treat as JWT
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;            // { sub, email, role, iat, exp, … }
  } catch {
    return null;
  }
};

/**
 * Verifies the Bearer token (JWT or Sanctum) on every protected request.
 * Attaches `req.user` (token payload) and `req.dbUser` (DB user record).
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await resolveToken(token);

    if (!decoded || !decoded.sub) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    // Load user from DB to ensure account still exists
    const { rows } = await pool.query(
      'SELECT id, email, role, name, phone, is_active FROM users WHERE id = $1 LIMIT 1',
      [decoded.sub]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
    }

    req.user = decoded;
    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional auth — attaches user if token present, but does not require it.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = await resolveToken(token);

    if (decoded?.sub) {
      const { rows } = await pool.query(
        'SELECT id, email, role, name FROM users WHERE id = $1 LIMIT 1',
        [decoded.sub]
      );

      if (rows[0]) {
        req.user = decoded;
        req.dbUser = rows[0];
      }
    }
  } catch {
    // Silently ignore invalid tokens for optional auth
  }

  next();
};

/**
 * Resolve a raw bearer token to a DB user (or null). Used by socket.io auth.
 */
const resolveUserFromToken = async (token) => {
  if (!token) return null;
  const decoded = await resolveToken(token);
  if (!decoded?.sub) return null;
  const { rows } = await pool.query(
    'SELECT id, email, role, name, is_active FROM users WHERE id = $1 LIMIT 1',
    [decoded.sub]
  );
  const user = rows[0];
  return user && user.is_active !== false ? user : null;
};

export { authenticate, optionalAuth, resolveUserFromToken };
