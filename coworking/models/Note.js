const mongoose = require('mongoose');
const NoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, immutable: true },
  noteData: { type: String, required: true, trim: true, maxlength: 5000 }, createdAt: { type: Date, default: Date.now }
});
NoteSchema.index({ user: 1, room: 1 });
module.exports = mongoose.model('Note', NoteSchema);
