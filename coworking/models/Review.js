const mongoose = require('mongoose');
const ReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, immutable: true },
  reviewData: { type: String, required: true, trim: true, maxlength: 5000 },
  anonymousReview: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }, updatedAt: { type: Date, default: Date.now }
});
ReviewSchema.index({ user: 1, room: 1 }, { unique: true });
module.exports = mongoose.model('Review', ReviewSchema);
