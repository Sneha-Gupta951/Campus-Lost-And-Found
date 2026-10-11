const ApiError = require('../utils/apiError');
const env = require('../config/env');

// This MUST be the last app.use() in app.js. Express recognizes it as an
// error handler because it takes 4 arguments (err, req, res, next).
function errorHandler(err, req, res, next) {
  // Known, expected errors (we threw them on purpose)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: err.errors,
      },
    });
  }

  // A unique-constraint violation from Postgres (e.g. duplicate email,
  // or the "one_approved_claim_per_item" index you built in the schema)
  if (err.code === '23505') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'This action conflicts with existing data' },
    });
  }

  // Anything unexpected — log the full error for yourself, but never leak
  // stack traces or internals to the client.
  console.error(err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.nodeEnv === 'development' ? err.message : 'Something went wrong',
    },
  });
}

module.exports = errorHandler;
