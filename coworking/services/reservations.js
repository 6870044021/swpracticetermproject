const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const User = require('../models/User');
const { withBookingTransaction } = require('./bookingTransaction');
const { HttpError, pick } = require('../utils/errors');
const { reservationInterval, validateOpeningHours, enforceLeadTime, isSuspended, HOUR } = require('../utils/booking');

const endExpression = { $ifNull: ['$endTime', { $add: ['$reservationDate', HOUR] }] };
const ownOrAdmin = (reservation, user) => {
  if (String(reservation.user) !== String(user._id) && user.role !== 'admin') throw new HttpError(403, 'You cannot access another user\'s reservation');
};
const assertActive = async (userId, session) => {
  const user = await User.findById(userId).session(session);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  if (isSuspended(user)) throw new HttpError(403, 'Suspended accounts cannot make or reschedule reservations');
  return user;
};
const assertAvailable = async (roomId, interval, excludeId, session) => {
  const room = await Room.findById(roomId).session(session);
  if (!room) throw new HttpError(404, 'Room not found');
  validateOpeningHours(interval.reservationDate, interval.endTime, room.openCloseTimes);
  const conflict = { room: roomId, reservationDate: { $lt: interval.endTime }, $expr: { $gt: [endExpression, interval.reservationDate] } };
  if (excludeId) conflict._id = { $ne: excludeId };
  if (await Reservation.exists(conflict).session(session)) throw new HttpError(409, 'Room is already reserved during this time');
};
exports.createReservation = async (user, roomId, payload) => {
  const data = pick(payload, ['reservationDate', 'startTime', 'endTime']);
  if (!roomId) throw new HttpError(400, 'Choose a room with /rooms/:roomId/reservations');
  return withBookingTransaction([`room:${roomId}`, `user:${user._id}`], async session => {
    const currentUser = await assertActive(user._id, session);
    const interval = reservationInterval(data);
    await assertAvailable(roomId, interval, null, session);
    const count = await Reservation.countDocuments({ user: user._id, $expr: { $gt: [endExpression, new Date()] } }).session(session);
    if (currentUser.role !== 'admin' && count >= 3) throw new HttpError(400, 'A user can have at most 3 active reservations');
    const [reservation] = await Reservation.create([{ ...interval, user: user._id, room: roomId }], { session });
    return reservation;
  });
};
exports.updateReservation = async (user, id, payload) => {
  const data = pick(payload, ['reservationDate', 'startTime', 'endTime', 'room']);
  const previous = await Reservation.findById(id);
  if (!previous) throw new HttpError(404, 'Reservation not found');
  ownOrAdmin(previous, user);
  enforceLeadTime(previous.reservationDate);
  const targetRoom = data.room || previous.room;
  return withBookingTransaction([`room:${previous.room}`, `room:${targetRoom}`, `user:${previous.user}`], async session => {
    const reservation = await Reservation.findById(id).session(session);
    if (!reservation) throw new HttpError(404, 'Reservation not found');
    if (String(reservation.room) !== String(previous.room)) throw new HttpError(409, 'Reservation changed concurrently; reload it and retry');
    ownOrAdmin(reservation, user);
    enforceLeadTime(reservation.reservationDate);
    await assertActive(user._id, session);
    const interval = reservationInterval(data, reservation);
    enforceLeadTime(interval.reservationDate);
    await assertAvailable(targetRoom, interval, id, session);
    reservation.set({ ...interval, room: targetRoom });
    await reservation.save({ session });
    return reservation;
  });
};
exports.deleteReservation = async (user, id) => {
  const previous = await Reservation.findById(id);
  if (!previous) throw new HttpError(404, 'Reservation not found');
  ownOrAdmin(previous, user);
  enforceLeadTime(previous.reservationDate);
  return withBookingTransaction([`room:${previous.room}`, `user:${previous.user}`], async session => {
    const reservation = await Reservation.findById(id).session(session);
    if (!reservation) throw new HttpError(404, 'Reservation not found');
    ownOrAdmin(reservation, user);
    enforceLeadTime(reservation.reservationDate);
    await reservation.deleteOne({ session });
  });
};
exports.ownOrAdmin = ownOrAdmin;
exports.endExpression = endExpression;
