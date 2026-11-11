const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const Note = require('../models/Note');
const Review = require('../models/Review');
const { withBookingTransaction } = require('../services/bookingTransaction');
const { endExpression } = require('../services/reservations');
const { HttpError, pick } = require('../utils/errors');
const roomFields = ['name', 'description', 'address', 'tel', 'openCloseTimes', 'district', 'province', 'postalcode', 'region'];
function roomFilter(query) {
  const filter = {};
  const accepted = [...roomFields, '_id'];
  for (const key of Object.keys(query)) {
    if (!accepted.includes(key) && !['select', 'sort', 'page', 'limit'].includes(key)) throw new HttpError(400, `Invalid room filter: ${key}`);
  }
  for (const key of accepted) {
    const value = query[key];
    if (value === undefined) continue;
    if (typeof value === 'string') filter[key] = value;
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      filter[key] = {};
      for (const [operator, operand] of Object.entries(value)) {
        if (!['gt', 'gte', 'lt', 'lte', 'in'].includes(operator) || typeof operand !== 'string') throw new HttpError(400, 'Invalid room filter');
        filter[key][`$${operator}`] = operator === 'in' ? operand.split(',') : operand;
      }
    } else throw new HttpError(400, 'Invalid room filter');
  }
  return filter;
}
const fieldList = (value, allowDescending = false) => {
  if (typeof value !== 'string') throw new HttpError(400, 'select and sort must be strings');
  const fields = value.split(',');
  if (!fields.length || fields.some(field => ![...roomFields, '_id', 'createdAt', 'updatedAt'].includes(allowDescending ? field.replace(/^-/, '') : field))) throw new HttpError(400, 'Invalid field selection');
  return fields.join(' ');
};
exports.getRooms = async (req, res) => {
  const filter = roomFilter(req.query);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'page must be positive and limit must be between 1 and 100');
  let query = Room.find(filter).sort(req.query.sort ? fieldList(req.query.sort, true) : '-createdAt').skip((page - 1) * limit).limit(limit);
  if (req.query.select) query = query.select(fieldList(req.query.select, true));
  const [data, total] = await Promise.all([query, Room.countDocuments(filter)]);
  const pagination = {};
  if (page * limit < total) pagination.next = { page: page + 1, limit };
  if (page > 1) pagination.prev = { page: page - 1, limit };
  // Public catalogue never populates private reservations, notes or review author IDs.
  res.status(200).json({ success: true, count: data.length, total, pagination, data });
};
exports.getRoom = async (req, res) => {
  const data = await Room.findById(req.params.id);
  if (!data) throw new HttpError(404, 'Room not found');
  res.status(200).json({ success: true, data });
};
exports.createRoom = async (req, res) => res.status(201).json({ success: true, data: await Room.create(pick(req.body, roomFields)) });
exports.updateRoom = async (req, res) => {
  const input = pick(req.body, roomFields);
  const data = await withBookingTransaction([`room:${req.params.id}`], async session => {
    const room = await Room.findById(req.params.id).session(session);
    if (!room) throw new HttpError(404, 'Room not found');
    if (input.openCloseTimes && input.openCloseTimes !== room.openCloseTimes) {
      const { validateOpeningHours } = require('../utils/booking');
      const reservations = await Reservation.find({ room: room._id, $expr: { $gt: [endExpression, new Date()] } }).session(session);
      for (const reservation of reservations) validateOpeningHours(reservation.reservationDate, reservation.endTime || new Date(reservation.reservationDate.getTime() + 3600000), input.openCloseTimes);
    }
    room.set(input);
    await room.save({ session });
    return room;
  });
  res.status(200).json({ success: true, data });
};
exports.deleteRoom = async (req, res) => {
  await withBookingTransaction([`room:${req.params.id}`], async session => {
    const room = await Room.findById(req.params.id).session(session);
    if (!room) throw new HttpError(404, 'Room not found');
    // Remove every dependent resource atomically, including reviews missed by the old code.
    await Reservation.deleteMany({ room: room._id }, { session });
    await Note.deleteMany({ room: room._id }, { session });
    await Review.deleteMany({ room: room._id }, { session });
    await room.deleteOne({ session });
  });
  res.status(200).json({ success: true, data: {} });
};
