const multer = require('multer');
const { ApiError } = require('../utils/errors');
const { fail } = require('../utils/response');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return fail(res, err.statusCode, err.message, err.details);
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Resume exceeds the 5 MB size limit' : err.message;
    return fail(res, 400, message);
  }
  if (err && err.code === 11000) {
    return fail(res, 409, 'Duplicate record');
  }
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return fail(res, 500, message);
}

function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

module.exports = { errorHandler, notFound };
