class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let message = err.message;
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map(error => error.message).join('; ');
  } else if (err.name === 'CastError' || err.type === 'entity.parse.failed') {
    status = 400; message = 'Invalid identifier or JSON body';
  } else if (err.code === 11000) { status = 409; message = 'This record already exists'; }
  if (status >= 500) {
    console.error(err.name, err.message);
    message = status === 503 ? message : 'An unexpected server error occurred';
  }
  res.status(status).json({ success: false, message });
};
const pick = (body, allowed) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'A JSON object is required');
  const unknown = Object.keys(body).filter(key => !allowed.includes(key));
  if (unknown.length) throw new HttpError(400, `Unsupported fields: ${unknown.join(', ')}`);
  return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
};
module.exports = { HttpError, asyncHandler, errorHandler, pick };
