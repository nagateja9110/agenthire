function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function fail(res, statusCode, message, details = undefined) {
  return res.status(statusCode).json({ success: false, error: { message, details } });
}

module.exports = { ok, fail };
