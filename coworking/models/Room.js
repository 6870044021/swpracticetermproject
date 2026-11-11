const mongoose = require('mongoose');
const { parseOpeningHours } = require('../utils/booking');
const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 2000 },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  tel: { type: String, required: true, trim: true, maxlength: 30 },
  openCloseTimes: { type: String, required: true, validate: { validator: value => { try { parseOpeningHours(value); return true; } catch { return false; } }, message: 'openCloseTimes must contain valid HH:mm-HH:mm hours' } },
  district: String, province: String, postalcode: String, region: String
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
module.exports = mongoose.model('Room', RoomSchema);
