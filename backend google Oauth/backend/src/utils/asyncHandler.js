// Wrap every async controller with this. If the controller throws (or a
// promise rejects), it's forwarded to next(err) automatically — which sends
// it to errorHandler.js. Without this, every controller would need its own
// try/catch, which gets repetitive and easy to forget.
//
// Usage:  router.post('/items', asyncHandler(itemsController.create));
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
