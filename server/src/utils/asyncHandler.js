// Express 4 does not catch rejected promises thrown inside async route
// handlers — without this, a thrown error in any `async function` controller
// either hangs the request forever or crashes the process, and never reaches
// the centralized error handler in index.js. Every route in this app is
// wrapped in this so errors are handled consistently and never leak raw
// stack traces to the client (see the error handler in index.js).
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
