const Review = require('../models/Review');
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const mongoose = require('mongoose');
const { HttpError, pick } = require('../utils/errors');
const { endExpression } = require('../services/reservations');
const { withBookingTransaction } = require('../services/bookingTransaction');
const { isSuspended } = require('../utils/booking');
const User = require('../models/User');

const validateReview = body => {
  const data = pick(body, ['reviewData', 'anonymousReview']);
  if (data.reviewData !== undefined && typeof data.reviewData !== 'string') throw new HttpError(400, 'reviewData must be a string');
  if (data.anonymousReview !== undefined && typeof data.anonymousReview !== 'boolean') throw new HttpError(400, 'anonymousReview must be a boolean');
  return data;
};
async function serializeReviews(reviews, viewer) {
  const userIds = [...new Set(reviews.map(review => String(review.user?._id || review.user)))].filter(id => mongoose.isValidObjectId(id));
  const counts = await Reservation.aggregate([
    { $match: { user: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) }, $expr: { $lte: [endExpression, new Date()] } } },
    { $group: { _id: '$user', count: { $sum: 1 } } }
  ]);
  const byUser = new Map(counts.map(row => [String(row._id), row.count]));
  return reviews.map(review => {
    const data = review.toObject ? review.toObject() : { ...review };
    const authorId = String(data.user?._id || data.user);
    data.pastBookings = byUser.get(authorId) || 0;
    data.canEdit = authorId === String(viewer._id) || viewer.role === 'admin';
    if (data.anonymousReview) delete data.user;
    return data;
  });
}
const load = async req => {
  const review = await Review.findById(req.params.id);
  if (!review || (req.params.roomId && String(review.room) !== req.params.roomId)) throw new HttpError(404, 'Review not found');
  return review;
};
const assertOwner = (review, user) => {
  if (String(review.user) !== String(user._id) && user.role !== 'admin') throw new HttpError(403, 'You cannot change another user\'s review');
};
exports.getReviews = async (req, res) => {
  const filter = {};
  if (req.params.roomId) {
    if (!(await Room.exists({ _id: req.params.roomId }))) throw new HttpError(404, 'Room not found');
    filter.room = req.params.roomId;
  }
  if (req.query.includeAnonymous !== undefined) {
    if (!['true', 'false'].includes(req.query.includeAnonymous)) throw new HttpError(400, 'includeAnonymous must be true or false');
    if (req.query.includeAnonymous === 'false') filter.anonymousReview = { $ne: true };
  }
  const reviews = await Review.find(filter).populate('room', 'name address tel openCloseTimes').populate('user', 'name').sort('-createdAt');
  const data = await serializeReviews(reviews, req.user);
  res.status(200).json({ success: true, count: data.length, data });
};
exports.getReview = async (req, res) => {
  const review = await load(req);
  await review.populate([{ path: 'room', select: 'name address tel openCloseTimes' }, { path: 'user', select: 'name' }]);
  res.status(200).json({ success: true, data: (await serializeReviews([review], req.user))[0] });
};
exports.addReview = async (req, res) => {
  const input = validateReview(req.body);
  if (!req.params.roomId) throw new HttpError(400, 'Choose a room with /rooms/:roomId/reviews');
  const review = await withBookingTransaction([`room:${req.params.roomId}`, `user:${req.user._id}`], async session => {
    const user = await User.findById(req.user._id).session(session);
    if (!user || isSuspended(user)) throw new HttpError(403, 'Suspended accounts cannot leave reviews');
    if (!(await Room.exists({ _id: req.params.roomId }).session(session))) throw new HttpError(404, 'Room not found');
    const [created] = await Review.create([{ ...input, user: req.user._id, room: req.params.roomId }], { session });
    return created;
  });
  await review.populate('user', 'name');
  res.status(201).json({ success: true, data: (await serializeReviews([review], req.user))[0] });
};
exports.updateReview = async (req, res) => {
  const previous = await load(req);
  assertOwner(previous, req.user);
  const input = validateReview(req.body);
  const review = await withBookingTransaction([`room:${previous.room}`, `user:${req.user._id}`], async session => {
    const user = await User.findById(req.user._id).session(session);
    if (!user || isSuspended(user)) throw new HttpError(403, 'Suspended accounts cannot leave reviews');
    const current = await Review.findById(req.params.id).session(session);
    if (!current) throw new HttpError(404, 'Review not found');
    assertOwner(current, req.user);
    current.set({ ...input, updatedAt: new Date() });
    await current.save({ session });
    return current;
  });
  await review.populate('user', 'name');
  res.status(200).json({ success: true, data: (await serializeReviews([review], req.user))[0] });
};
exports.deleteReview = async (req, res) => {
  const review = await load(req);
  assertOwner(review, req.user);
  await review.deleteOne();
  res.status(200).json({ success: true, data: {} });
};
