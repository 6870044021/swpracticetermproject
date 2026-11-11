const mongoose = require('mongoose');
const { isValidOpenCloseTimes, OPEN_CLOSE_FORMAT_MESSAGE } = require('../utils/time');

// A co-working space (room). FR3: name, address, telephone number and open-close time.
const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        trim: true,
        maxlength: [100, 'Name can not be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Please add an address'],
        trim: true
    },
    tel: {
        type: String,
        required: [true, 'Please add a telephone number'],
        trim: true
    },
    // e.g. "08:00-20:00" (local time). A4 uses it to accept bookings only inside opening hours.
    openCloseTimes: {
        type: String,
        required: [true, 'Please add open-close times'],
        trim: true,
        validate: {
            validator: isValidOpenCloseTimes,
            message: OPEN_CLOSE_FORMAT_MESSAGE
        }
    }
}, {
    //แทรก virtual
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

//Reverse populate with virtuals
//แทรกข้อมูล reservations / reviews / notes ของ room เข้าไป (populate เฉพาะตอนที่ต้องการ)
RoomSchema.virtual('reservations', {
    ref: 'Reservation',
    localField: '_id',
    foreignField: 'room',
    justOne: false
});

RoomSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'room',
    justOne: false
});

// A8: notes are private, so public room endpoints never populate this virtual.
RoomSchema.virtual('notes', {
    ref: 'Note',
    localField: '_id',
    foreignField: 'room',
    justOne: false
});

module.exports = mongoose.model('Room', RoomSchema);
