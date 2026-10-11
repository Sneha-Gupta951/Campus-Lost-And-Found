const ApiError = require('../utils/apiError');

// Checks "is this person ALLOWED to do this?" — must run AFTER authenticate.
// This is the permission table from step 3, turned into code.
//
// Usage:  router.patch('/claims/:id', authenticate, authorize(['security','admin']), ctrl.review)
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      // Programmer error: authorize used without authenticate before it
      throw new ApiError(401, 'NOT_AUTHENTICATED', 'Login required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to do this');
    }

    next();
  };
}

module.exports = authorize;
