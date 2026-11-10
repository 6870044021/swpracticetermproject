const User = require('../models/User');
const { HttpError, pick } = require('../utils/errors');
const { isStrongPassword, parseDate } = require('../utils/booking');
const { withBookingTransaction } = require('../services/bookingTransaction');

const emailValue = value => {
  if (typeof value !== 'string') throw new HttpError(400, 'email must be a string');
  return value.trim().toLowerCase();
};
const sendTokenResponse = (user, status, res) => {
  const token = user.getSignedJwtToken();
  const cookieDays = Number(process.env.JWT_COOKIE_EXPIRE) || 1;
  res.status(status).cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: cookieDays * 86400000 }).json({
    success: true, _id: user._id, name: user.name, email: user.email, role: user.role, token, user: user.toJSON()
  });
};
exports.register = async (req, res) => {
  const data = pick(req.body, ['name', 'email', 'password', 'tel', 'passwordHint', 'role']);
  if (data.role && data.role !== 'user') throw new HttpError(403, 'Administrator accounts must be provisioned by an administrator');
  if (['name', 'tel', 'password'].some(key => typeof data[key] !== 'string')) throw new HttpError(400, 'name, tel and password must be strings');
  if (data.passwordHint !== undefined && typeof data.passwordHint !== 'string') throw new HttpError(400, 'passwordHint must be a string');
  data.email = emailValue(data.email);
  if (!isStrongPassword(data.password)) throw new HttpError(400, 'Password must have at least 8 characters, a lowercase letter, an uppercase letter and a number, with at most 72 UTF-8 bytes');
  const user = await User.create({ ...data, role: 'user' });
  sendTokenResponse(user, 201, res);
};
exports.login = async (req, res) => {
  const { email, password } = pick(req.body, ['email', 'password']);
  if (typeof password !== 'string' || !password) throw new HttpError(400, 'Please provide email and password');
  const user = await User.findOne({ email: emailValue(email) }).select('+password +tokenVersion');
  if (!user || !(await user.matchPassword(password))) throw new HttpError(401, 'Invalid credentials');
  sendTokenResponse(user, 200, res);
};
exports.getMe = async (req, res) => res.status(200).json({ success: true, data: req.user.toJSON() });
exports.logout = async (req, res) => {
  // Invalidate bearer tokens too, rather than only removing a browser cookie.
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }).status(200).json({ success: true, data: {} });
};
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = pick(req.body, ['oldPassword', 'newPassword']);
  if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') throw new HttpError(400, 'oldPassword and newPassword must be strings');
  if (!isStrongPassword(newPassword)) throw new HttpError(400, 'New password must have at least 8 characters, a lowercase letter, an uppercase letter and a number, with at most 72 UTF-8 bytes');
  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.matchPassword(oldPassword))) throw new HttpError(401, 'Incorrect old password');
  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  sendTokenResponse(user, 200, res);
};
exports.getPasswordHint = async (req, res) => {
  const email = emailValue(req.query.email || req.body?.email);
  const user = await User.findOne({ email }).select('+passwordHint');
  res.status(200).json({ success: true, data: { passwordHint: user?.passwordHint || '' } });
};
exports.setPasswordHint = async (req, res) => {
  const { passwordHint } = pick(req.body, ['passwordHint']);
  if (typeof passwordHint !== 'string') throw new HttpError(400, 'passwordHint must be a string');
  const user = await User.findByIdAndUpdate(req.user._id, { passwordHint }, { new: true, runValidators: true }).select('+passwordHint');
  res.status(200).json({ success: true, data: { passwordHint: user.passwordHint } });
};
exports.suspendUser = async (req, res) => {
  const { id, banType, banTime, banUntil } = pick(req.body, ['id', 'banType', 'banTime', 'banUntil']);
  if (!['active', 'temporaryBan', 'permanentBan'].includes(banType)) throw new HttpError(400, 'banType must be active, temporaryBan or permanentBan');
  let until = null;
  if (banType === 'temporaryBan') {
    if (banUntil) until = parseDate(banUntil, 'banUntil');
    else {
      const days = banTime === undefined ? 1 : banTime;
      if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0 || days > 36500) throw new HttpError(400, 'banTime must be a positive number of days, at most 36500');
      until = new Date(Date.now() + days * 86400000);
    }
    if (until <= new Date()) throw new HttpError(400, 'banUntil must be in the future');
  }
  if (!require('mongoose').isValidObjectId(id)) throw new HttpError(400, 'Invalid user identifier');
  const user = await withBookingTransaction([`user:${id}`], async session => {
    const target = await User.findByIdAndUpdate(id, { userStatus: banType, banUntil: until }, { new: true, runValidators: true, session });
    if (!target) throw new HttpError(404, 'User not found');
    return target;
  });
  res.status(200).json({ success: true, data: user, message: banType === 'active' ? 'Suspension lifted' : 'Account suspended' });
};
