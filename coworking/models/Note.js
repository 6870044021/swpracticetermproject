const mongoose = require('mongoose');
<<<<<<< Updated upstream
const NoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, immutable: true },
  noteData: { type: String, required: true, trim: true, maxlength: 5000 }, createdAt: { type: Date, default: Date.now }
});
NoteSchema.index({ user: 1, room: 1 });
=======

//สร้าง NoteSchema โดยใช้ Schema ของ mongoose
// A8: a personal note that a user assigns to a room. Only its owner can see it.
const NoteSchema = new mongoose.Schema({
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
    noteData: {
        type: String,
        required: [true, 'Please add the note text (noteData)'],
        trim: true,
        maxlength: [1000, 'A note can not be more than 1000 characters']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// One personal note per user per room; the user edits it instead of creating another one.
NoteSchema.index({ user: 1, room: 1 }, { unique: true });

>>>>>>> Stashed changes
module.exports = mongoose.model('Note', NoteSchema);
