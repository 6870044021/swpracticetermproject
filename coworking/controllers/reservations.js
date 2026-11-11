const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const service = require('../services/reservations');
const { HttpError } = require('../utils/errors');
const roomFields = 'name description address tel openCloseTimes';
exports.getReservations = async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
  if (req.params.roomId) {
    if (!(await Room.exists({ _id: req.params.roomId }))) throw new HttpError(404, 'Room not found');
    filter.room = req.params.roomId;
  }
  const data = await Reservation.find(filter).populate('room', roomFields).sort('reservationDate');
  res.status(200).json({ success: true, count: data.length, data });
};
exports.getReservation = async (req, res) => {
  const data = await Reservation.findById(req.params.id).populate('room', roomFields);
  if (!data) throw new HttpError(404, 'Reservation not found');
  service.ownOrAdmin(data, req.user);
  if (req.params.roomId && String(data.room?._id) !== req.params.roomId) throw new HttpError(404, 'Reservation not found in this room');
  res.status(200).json({ success: true, data });
};
exports.addReservation = async (req, res) => res.status(201).json({ success: true, data: await service.createReservation(req.user, req.params.roomId, req.body) });
exports.updateReservation = async (req, res) => {
  if (req.params.roomId && !(await Reservation.exists({ _id: req.params.id, room: req.params.roomId }))) throw new HttpError(404, 'Reservation not found in this room');
  res.status(200).json({ success: true, data: await service.updateReservation(req.user, req.params.id, req.body) });
};
exports.deleteReservation = async (req, res) => {
  if (req.params.roomId && !(await Reservation.exists({ _id: req.params.id, room: req.params.roomId }))) throw new HttpError(404, 'Reservation not found in this room');
  await service.deleteReservation(req.user, req.params.id);
  res.status(200).json({ success: true, data: {} });
};
