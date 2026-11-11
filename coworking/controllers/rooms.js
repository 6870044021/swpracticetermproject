const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');
const Note = require('../models/Note');
<<<<<<< Updated upstream
const Review = require('../models/Review');
const { withBookingTransaction } = require('../services/bookingTransaction');
const { endExpression } = require('../services/reservations');
const { HttpError, pick } = require('../utils/errors');
const roomFields = ['name', 'description', 'address', 'tel', 'openCloseTimes', 'district', 'province', 'postalcode', 'region'];
function roomFilter(query) {
  const filter = {};
  const accepted = [...roomFields, '_id'];
  for (const key of Object.keys(query)) {
    if (!accepted.includes(key) && !['select', 'sort', 'page', 'limit'].includes(key)) throw new HttpError(400, `Invalid room filter: ${key}`);
  }
  for (const key of accepted) {
    const value = query[key];
    if (value === undefined) continue;
    if (typeof value === 'string') filter[key] = value;
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      filter[key] = {};
      for (const [operator, operand] of Object.entries(value)) {
        if (!['gt', 'gte', 'lt', 'lte', 'in'].includes(operator) || typeof operand !== 'string') throw new HttpError(400, 'Invalid room filter');
        filter[key][`$${operator}`] = operator === 'in' ? operand.split(',') : operand;
      }
    } else throw new HttpError(400, 'Invalid room filter');
  }
  return filter;
}
const fieldList = (value, allowDescending = false) => {
  if (typeof value !== 'string') throw new HttpError(400, 'select and sort must be strings');
  const fields = value.split(',');
  if (!fields.length || fields.some(field => ![...roomFields, '_id', 'createdAt', 'updatedAt'].includes(allowDescending ? field.replace(/^-/, '') : field))) throw new HttpError(400, 'Invalid field selection');
  return fields.join(' ');
};
exports.getRooms = async (req, res) => {
  const filter = roomFilter(req.query);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'page must be positive and limit must be between 1 and 100');
  let query = Room.find(filter).sort(req.query.sort ? fieldList(req.query.sort, true) : '-createdAt').skip((page - 1) * limit).limit(limit);
  if (req.query.select) query = query.select(fieldList(req.query.select, true));
  const [data, total] = await Promise.all([query, Room.countDocuments(filter)]);
  const pagination = {};
  if (page * limit < total) pagination.next = { page: page + 1, limit };
  if (page > 1) pagination.prev = { page: page - 1, limit };
  // Public catalogue never populates private reservations, notes or review author IDs.
  res.status(200).json({ success: true, count: data.length, total, pagination, data });
};
exports.getRoom = async (req, res) => {
  const data = await Room.findById(req.params.id);
  if (!data) throw new HttpError(404, 'Room not found');
  res.status(200).json({ success: true, data });
};
exports.createRoom = async (req, res) => res.status(201).json({ success: true, data: await Room.create(pick(req.body, roomFields)) });
exports.updateRoom = async (req, res) => {
  const input = pick(req.body, roomFields);
  const data = await withBookingTransaction([`room:${req.params.id}`], async session => {
    const room = await Room.findById(req.params.id).session(session);
    if (!room) throw new HttpError(404, 'Room not found');
    if (input.openCloseTimes && input.openCloseTimes !== room.openCloseTimes) {
      const { validateOpeningHours } = require('../utils/booking');
      const reservations = await Reservation.find({ room: room._id, $expr: { $gt: [endExpression, new Date()] } }).session(session);
      for (const reservation of reservations) validateOpeningHours(reservation.reservationDate, reservation.endTime || new Date(reservation.reservationDate.getTime() + 3600000), input.openCloseTimes);
    }
    room.set(input);
    await room.save({ session });
    return room;
  });
  res.status(200).json({ success: true, data });
};
exports.deleteRoom = async (req, res) => {
  await withBookingTransaction([`room:${req.params.id}`], async session => {
    const room = await Room.findById(req.params.id).session(session);
    if (!room) throw new HttpError(404, 'Room not found');
    // Remove every dependent resource atomically, including reviews missed by the old code.
    await Reservation.deleteMany({ room: room._id }, { session });
    await Note.deleteMany({ room: room._id }, { session });
    await Review.deleteMany({ room: room._id }, { session });
    await room.deleteOne({ session });
  });
  res.status(200).json({ success: true, data: {} });
=======
const { getDaySchedule } = require('../utils/availability');
const { isDateKey, todayKey } = require('../utils/time');
const { sendError } = require('../utils/errors');

// Fields that users may filter, select and sort on (Assignment 7 query rules).
const ALLOWED_FIELDS = new Set(['_id', 'name', 'description', 'address', 'tel', 'openCloseTimes']);
const ALLOWED_OPERATORS = new Set(['gt', 'gte', 'lt', 'lte', 'in']);

// Public room data shows when a room is booked (A4) but never who booked it,
// and never the private notes of users (A8).
const BOOKED_SLOTS = { path: 'reservations', select: 'reservationDate endDate room -_id' };

const parseFieldList = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    const fields = value.split(',').map((s) => s.trim()).filter(Boolean);
    if (!fields.length || fields.some((f) => !ALLOWED_FIELDS.has(f.replace(/^-/, '')))) {
        return null;
    }
    return fields.join(' ');
};

//@desc     Get all co-working spaces, with filters, select, sort and pagination (FR3: the list is provided to users)
//@route    GET /api/v1/rooms?name=...&openCloseTimes[lt]=...&select=name,tel&sort=name&page=1&limit=25
//@access   Public
exports.getRooms = async (req, res, next) => {
    try {
        //Query options are not MongoDB document fields.
        const { select, sort, page, limit, ...filters } = req.query;

        //Map allowed comparisons (gt, gte, lt, lte, in) into MongoDB operators, e.g. name[gt]=A -> { name: { $gt: 'A' } }
        const mongoFilters = {};
        for (const [field, raw] of Object.entries(filters)) {
            if (!ALLOWED_FIELDS.has(field)) {
                return res.status(400).json({ success: false, message: `Invalid filter: ${field}` });
            }
            if (typeof raw === 'string') {
                mongoFilters[field] = raw;
            } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                const clauses = {};
                for (const [operator, value] of Object.entries(raw)) {
                    if (!ALLOWED_OPERATORS.has(operator) || typeof value !== 'string') {
                        return res.status(400).json({ success: false, message: 'Invalid comparison filter' });
                    }
                    clauses[`$${operator}`] = operator === 'in' ? value.split(',') : value;
                }
                mongoFilters[field] = clauses;
            } else {
                return res.status(400).json({ success: false, message: 'Invalid filter value' });
            }
        }

        //Pagination: ถ้าไม่มีกำหนดก็ page = 1, limit = 25
        const parsedPage = page === undefined ? 1 : Number(page);
        const parsedLimit = limit === undefined ? 25 : Number(limit);
        if (!Number.isSafeInteger(parsedPage) || parsedPage < 1 ||
            !Number.isSafeInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
            return res.status(400).json({ success: false, message: 'Invalid page or limit' });
        }

        let query = Room.find(mongoFilters);

        //Select fields (comma -> space ให้ตรงกับ syntax ของ Mongoose)
        if (select !== undefined) {
            const fields = parseFieldList(select);
            if (!fields) {
                return res.status(400).json({ success: false, message: 'Invalid selected field' });
            }
            query = query.select(fields);
        }

        //Sort (default: newest first)
        if (sort !== undefined) {
            const fields = parseFieldList(sort);
            if (!fields) {
                return res.status(400).json({ success: false, message: 'Invalid sort field' });
            }
            query = query.sort(fields);
        } else {
            query = query.sort('-_id');
        }

        const startIndex = (parsedPage - 1) * parsedLimit;
        //นับเฉพาะ room ที่ตรงกับ filter เพื่อให้ pagination ถูกต้อง
        const total = await Room.countDocuments(mongoFilters);
        const rooms = await query.skip(startIndex).limit(parsedLimit).populate(BOOKED_SLOTS);

        //Pagination result: ดูว่าจากข้อมูลปัจจุบัน ถ้าไปหน้า prev/next คือหน้าอะไร
        const pagination = {};
        if (startIndex + parsedLimit < total) {
            pagination.next = { page: parsedPage + 1, limit: parsedLimit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: parsedPage - 1, limit: parsedLimit };
        }

        res.status(200).json({ success: true, count: rooms.length, total, pagination, data: rooms });
    } catch (err) {
        return sendError(res, err, 'Invalid room query');
    }
};

//@desc     Get one co-working space
//@route    GET /api/v1/rooms/:id
//@access   Public
exports.getRoom = async (req, res, next) => {
    try {
        const room = await Room.findById(req.params.id).populate(BOOKED_SLOTS);
        if (!room) {
            return res.status(404).json({ success: false, message: `Room not found with id of ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: room });
    } catch (err) {
        return sendError(res, err, 'Cannot get room');
    }
};

//@desc     Booked and free time slots of a co-working space on one day (A4)
//@route    GET /api/v1/rooms/:id/availability?date=YYYY-MM-DD
//@access   Public
exports.getRoomAvailability = async (req, res, next) => {
    try {
        const date = req.query.date === undefined ? todayKey() : req.query.date;
        if (!isDateKey(date)) {
            return res.status(400).json({ success: false, message: 'Please provide date in YYYY-MM-DD format' });
        }

        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ success: false, message: `Room not found with id of ${req.params.id}` });
        }

        const schedule = await getDaySchedule(room, date);
        res.status(200).json({ success: true, data: { room: room._id, name: room.name, ...schedule } });
    } catch (err) {
        return sendError(res, err, 'Cannot get room availability');
    }
};

//@desc     Create a co-working space
//@route    POST /api/v1/rooms
//@access   Private (admin)
exports.createRoom = async (req, res, next) => {
    try {
        const room = await Room.create(req.body);
        res.status(201).json({ success: true, data: room });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(400).json({ success: false, message: 'A room with this name already exists' });
        }
        return sendError(res, err, 'Cannot create room');
    }
};

//@desc     Update a co-working space
//@route    PUT /api/v1/rooms/:id
//@access   Private (admin)
exports.updateRoom = async (req, res, next) => {
    try {
        const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
            returnDocument: 'after',
            runValidators: true
        });
        if (!room) {
            return res.status(404).json({ success: false, message: `Room not found with id of ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: room });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(400).json({ success: false, message: 'A room with this name already exists' });
        }
        return sendError(res, err, 'Cannot update room');
    }
};

//@desc     Delete a co-working space and everything that belongs to it (cascade delete)
//@route    DELETE /api/v1/rooms/:id
//@access   Private (admin)
exports.deleteRoom = async (req, res, next) => {
    try {
        //เพิ่ม cascade delete เปลี่ยนให้ดึง room id มาก่อน (อย่าเพิ่งลบ)
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ success: false, message: `Room not found with id of ${req.params.id}` });
        }

        //ลบ reservations, reviews และ notes ที่เป็นของ room นั้นก่อนแล้วค่อยลบ room
        await Reservation.deleteMany({ room: req.params.id });
        await Review.deleteMany({ room: req.params.id });
        await Note.deleteMany({ room: req.params.id });
        await Room.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        return sendError(res, err, 'Cannot delete room');
    }
>>>>>>> Stashed changes
};
