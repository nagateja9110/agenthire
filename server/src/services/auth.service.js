const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { ApiError } = require('../utils/errors');
const { ROLES } = require('../constants');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

async function signup({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, role: ROLES.RECRUITER });
  return { user: user.toSafeJSON(), token: signToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) throw new ApiError(401, 'Invalid email or password');

  return { user: user.toSafeJSON(), token: signToken(user) };
}

module.exports = { signup, login, signToken };
