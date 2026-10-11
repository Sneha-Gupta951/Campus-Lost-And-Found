// Throw `new ApiError(404, 'ITEM_NOT_FOUND', 'Item not found')` anywhere in a
// controller or service. The errorHandler middleware catches it and turns it
// into the standard error JSON shape.
class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; // machine-readable, e.g. 'ITEM_NOT_FOUND'
  }
}

module.exports = ApiError;
