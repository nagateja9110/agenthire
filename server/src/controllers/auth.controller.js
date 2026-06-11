const authService = require('../services/auth.service');
const { ok } = require('../utils/response');

async function signup(req, res) {
  const result = await authService.signup(req.body);
  return ok(res, result, 201);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  return ok(res, result);
}

async function me(req, res) {
  return ok(res, { user: req.user.toSafeJSON() });
}

module.exports = { signup, login, me };
