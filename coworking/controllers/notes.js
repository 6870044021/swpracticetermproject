const Note = require('../models/Note');
const Room = require('../models/Room');
const { sendError } = require('../utils/errors');

const ROOM_FIELDS = { path: 'room', select: 'name description address tel openCloseTimes' };

// A8: notes are personal. Everyone, admins included, can only see and change their own notes.
const isOwner = (note, req) => note.user.toString() === req.user.id;

//@desc     Get my notes (optionally of one room)
//@route    GET /api/v1/notes
//@route    GET /api/v1/rooms/:roomId/notes
//@access   Private (own notes only)
exports.getNotes = async (req, res, next) => {
    try {
        const filter = { user: req.user.id };
        if (req.params.roomId) {
            const room = await Room.findById(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: `No room with the id of ${req.params.roomId}` });
            }
            filter.room = room._id;
        }

        const notes = await Note.find(filter).populate(ROOM_FIELDS).sort('-createdAt');
        res.status(200).json({ success: true, count: notes.length, data: notes });
    } catch (err) {
        return sendError(res, err, 'Cannot find notes');
    }
};

//@desc     Get single note
//@route    GET /api/v1/notes/:id
//@access   Private (owner only)
exports.getNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id).populate(ROOM_FIELDS);
        if (!note) {
            return res.status(404).json({ success: false, message: `No note with the id of ${req.params.id}` });
        }
        //User cannot get other user's notes even if they send the correct note id.
        if (!isOwner(note, req)) {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to get this note` });
        }
        res.status(200).json({ success: true, data: note });
    } catch (err) {
        return sendError(res, err, 'Cannot find note');
    }
};

//@desc     Assign a personal note to a room (one note per room)
//@route    POST /api/v1/rooms/:roomId/notes   body: { noteData }
//@access   Private
exports.addNote = async (req, res, next) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: `No room with the id of ${req.params.roomId}` });
        }

        const existedNote = await Note.findOne({ user: req.user.id, room: room._id });
        if (existedNote) {
            return res.status(400).json({
                success: false,
                message: `You already have a note for room ${room._id}. Please update note ${existedNote._id} instead.`
            });
        }

        //The user always comes from the token and the room from the URL
        const note = await Note.create({ noteData: req.body.noteData, user: req.user.id, room: room._id });
        res.status(201).json({ success: true, data: note });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(400).json({ success: false, message: 'You already have a note for this room. Please update it instead.' });
        }
        return sendError(res, err, 'Cannot create note');
    }
};

//@desc     Update my note (only noteData can change)
//@route    PUT /api/v1/notes/:id
//@access   Private (owner only)
exports.updateNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ success: false, message: `No note with the id of ${req.params.id}` });
        }
        if (!isOwner(note, req)) {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this note` });
        }
        if (req.body.noteData === undefined) {
            return res.status(400).json({ success: false, message: 'Nothing to update. You can change noteData' });
        }

        note.noteData = req.body.noteData;
        await note.save({ validateModifiedOnly: true });
        await note.populate(ROOM_FIELDS);

        res.status(200).json({ success: true, data: note });
    } catch (err) {
        return sendError(res, err, 'Cannot update note');
    }
};

//@desc     Delete my note
//@route    DELETE /api/v1/notes/:id
//@access   Private (owner only)
exports.deleteNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ success: false, message: `No note with the id of ${req.params.id}` });
        }
        if (!isOwner(note, req)) {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to delete this note` });
        }

        await note.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        return sendError(res, err, 'Cannot delete note');
    }
};
