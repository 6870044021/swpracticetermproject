const mongoose = require('mongoose');
<<<<<<< Updated upstream
const ReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, immutable: true },
  reviewData: { type: String, required: true, trim: true, maxlength: 5000 },
  anonymousReview: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }, updatedAt: { type: Date, default: Date.now }
});
ReviewSchema.index({ user: 1, room: 1 }, { unique: true });
=======

//สร้าง ReviewSchema โดยใช้ Schema ของ mongoose (A5)
const ReviewSchema = new mongoose.Schema({
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
    reviewData: {
        type: String,
        required: [true, 'Please add the review text (reviewData)'],
        trim: true,
        maxlength: [1000, 'A review can not be more than 1000 characters']
    },
    // A12: anonymous reviews are opt-in, so the default is a named review.
    anonymousReview: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// A10: only 1 review per user per room (also checked in the controller with a friendly message).
ReviewSchema.index({ user: 1, room: 1 }, { unique: true });

>>>>>>> Stashed changes
module.exports = mongoose.model('Review', ReviewSchema);
