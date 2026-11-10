const Note = require('../models/Note');
const Room = require('../models/Room');
const { HttpError, pick } = require('../utils/errors');
const { withBookingTransaction } = require('../services/bookingTransaction');
const loadOwn = async (req) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
  if (!note || (req.params.roomId && String(note.room) !== req.params.roomId)) throw new HttpError(404, 'Note not found');
  return note;
};
exports.getNotes = async (req, res) => {
  const filter = { user: req.user._id };
  if (req.params.roomId) {
    if (!(await Room.exists({ _id: req.params.roomId }))) throw new HttpError(404, 'Room not found');
    filter.room = req.params.roomId;
  }
  const data = await Note.find(filter).populate('room', 'name address tel openCloseTimes').sort('-createdAt');
  res.status(200).json({ success: true, count: data.length, data });
};
exports.getNote = async (req, res) => res.status(200).json({ success: true, data: await loadOwn(req) });
exports.addNote = async (req, res) => {
  const data = pick(req.body, ['noteData']);
  if (!req.params.roomId) throw new HttpError(400, 'Choose a room with /rooms/:roomId/notes');
  const note = await withBookingTransaction([`room:${req.params.roomId}`], async session => {
    if (!(await Room.exists({ _id: req.params.roomId }).session(session))) throw new HttpError(404, 'Room not found');
    const [created] = await Note.create([{ ...data, user: req.user._id, room: req.params.roomId }], { session });
    return created;
  });
  res.status(201).json({ success: true, data: note });
};
exports.updateNote = async (req, res) => {
  const note = await loadOwn(req);
  note.set(pick(req.body, ['noteData']));
  await note.save();
  res.status(200).json({ success: true, data: note });
};
exports.deleteNote = async (req, res) => {
  const note = await loadOwn(req);
  await note.deleteOne();
  res.status(200).json({ success: true, data: {} });
};
