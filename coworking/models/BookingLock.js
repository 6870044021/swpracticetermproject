const mongoose = require('mongoose');
module.exports = mongoose.model('BookingLock', new mongoose.Schema({ _id: String, revision: { type: Number, default: 0 } }, { versionKey: false }));
