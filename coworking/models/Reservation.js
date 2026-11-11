const mongoose = require('mongoose');
const ReservationSchema = new mongoose.Schema({
  reservationDate: { type: Date, required: true },
  endTime: { type: Date, required: true, default: function () { return this.reservationDate && new Date(this.reservationDate.getTime() + 3600000); } },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  createdAt: { type: Date, default: Date.now }
});
ReservationSchema.index({ room: 1, reservationDate: 1, endTime: 1 });
ReservationSchema.index({ user: 1, endTime: 1 });
module.exports = mongoose.model('Reservation', ReservationSchema);
