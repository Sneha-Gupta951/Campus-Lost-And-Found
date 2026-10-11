const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

// Checks "is this person logged in?" — reads the token, verifies it, and
// attaches the decoded user info to req.user so every controller downstream
// can trust req.user.id and req.user.role without re-checking anything.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization; // "Bearer <token>"

  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'NOT_AUTHENTICATED', 'Login required');
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Session expired, please log in again');
  }
});

module.exports = authenticate;
