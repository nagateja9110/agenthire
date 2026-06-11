const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { fail } = require('../utils/response');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, 401, 'Authentication required');

    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return fail(res, 401, 'User no longer exists');

    req.user = user;
    return next();
  } catch (err) {
    return fail(res, 401, 'Invalid or expired token');
  }
}

// Attaches req.user when a valid token is present; never blocks the request.
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (user) req.user = user;
    }
  } catch (err) {
    // Invalid token on a public route is ignored.
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, 'Insufficient permissions');
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, optionalAuth };
