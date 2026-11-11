const mongoose = require('mongoose');
const { DEFAULT_RESERVATION_DURATION_MS } = require('../utils/time');

//สร้าง ReservationSchema โดยใช้ Schema ของ mongoose
const ReservationSchema = new mongoose.Schema({
    // Start of the booked time slot (FR3: the date of the reservation)
    reservationDate: {
        type: Date,
        required: [true, 'Please add a reservation date-time']
    },
    // End of the booked time slot (A4). Defaults to 1 hour after reservationDate.
    endDate: {
        type: Date,
        validate: {
            validator: function (value) {
                return !value || !this.reservationDate || value.getTime() > this.reservationDate.getTime();
            },
            message: 'endDate must be later than reservationDate'
        }
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    room: {
        type: mongoose.Schema.ObjectId,
        ref: 'Room',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ReservationSchema.pre('validate', function () {
    if (this.reservationDate && !this.endDate) {
        this.endDate = new Date(this.reservationDate.getTime() + DEFAULT_RESERVATION_DURATION_MS);
    }
});

// Fast lookups for availability checks (A4) and "my reservations" (FR4).
ReservationSchema.index({ room: 1, reservationDate: 1 });
ReservationSchema.index({ user: 1, reservationDate: 1 });

module.exports = mongoose.model('Reservation', ReservationSchema);
