const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, HttpError } = require('../utils/errors');
const { isSuspended } = require('../utils/booking');

exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token = typeof header === 'string' && /^Bearer\s+\S+$/i.test(header) ? header.split(/\s+/)[1] : req.cookies?.token;
  if (!token || token === 'null') throw new HttpError(401, 'Please log in to access this resource');
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw new HttpError(401, 'Invalid or expired authentication token'); }
  const user = await User.findById(decoded.id).select('+tokenVersion');
  if (!user || (decoded.tv || 0) !== (user.tokenVersion || 0)) throw new HttpError(401, 'Authentication token has been revoked');
  req.user = user;
  next();
});
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Your role cannot access this resource'));
  next();
};
exports.checkStatus = (req, res, next) => {
  if (isSuspended(req.user)) return next(new HttpError(403, req.user.userStatus === 'temporaryBan' ? `Account suspended until ${req.user.banUntil?.toISOString() || 'further notice'}` : 'Account suspended indefinitely'));
  next();
};
