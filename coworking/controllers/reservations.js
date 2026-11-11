//require model ของ Reservation มาด้วย
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const { checkRoomAvailability, activeReservationFilter } = require('../utils/availability');
const {
    MAX_ACTIVE_RESERVATIONS,
    MIN_NOTICE_TO_CHANGE_MS,
    buildSlot,
    effectiveEndDate
} = require('../utils/time');
const { sendError } = require('../utils/errors');

//ให้ populate room โดยเลือก fields: name, description, address, tel, openCloseTimes
const ROOM_FIELDS = { path: 'room', select: 'name description address tel openCloseTimes' };
const USER_FIELDS = { path: 'user', select: 'name email tel' };

const isAdmin = (req) => req.user.role === 'admin';
const isOwner = (reservation, req) => reservation.user.toString() === req.user.id;

// A6 / A7: users must change or cancel a reservation at least 1 hour before it begins (admins are exempt).
const startsTooSoon = (reservation) =>
    reservation.reservationDate.getTime() - Date.now() < MIN_NOTICE_TO_CHANGE_MS;

const sendAvailabilityError = (res, availability) =>
    res.status(availability.status).json({
        success: false,
        message: availability.message,
        ...(availability.conflicts ? { conflicts: availability.conflicts } : {})
    });

//@desc     Get reservations (FR4: own reservations; FR7: admin sees all)
//@route    GET /api/v1/reservations
//@route    GET /api/v1/rooms/:roomId/reservations
//@access   Private
exports.getReservations = async (req, res, next) => {
    try {
        const filter = {};
        //General users can see only their own reservations
        if (!isAdmin(req)) {
            filter.user = req.user.id;
        }
        //When mounted below /rooms/:roomId/reservations, narrow the result to that room as well
        if (req.params.roomId) {
            filter.room = req.params.roomId;
        }

        let query = Reservation.find(filter).populate(ROOM_FIELDS).sort('reservationDate');
        if (isAdmin(req)) {
            query = query.populate(USER_FIELDS);
        }
        const reservations = await query;

        res.status(200).json({ success: true, count: reservations.length, data: reservations });
    } catch (err) {
        return sendError(res, err, 'Cannot find reservations');
    }
};

//@desc     Get single reservation
//@route    GET /api/v1/reservations/:id
//@access   Private (owner or admin)
exports.getReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate(ROOM_FIELDS);
        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        //Keep the reservation private to its owner, except for admins
        if (!isOwner(reservation, req) && !isAdmin(req)) {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to view this reservation`
            });
        }

        res.status(200).json({ success: true, data: reservation });
    } catch (err) {
        return sendError(res, err, 'Cannot find reservation');
    }
};

//@desc     Add reservation (FR3 up to 3 active reservations, A4 room must be available, A11 via checkStatus)
//@route    POST /api/v1/rooms/:roomId/reservations   body: { reservationDate, endDate }
//@access   Private
exports.addReservation = async (req, res, next) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: `No room with the id of ${req.params.roomId}` });
        }

        const slot = buildSlot(req.body.reservationDate, req.body.endDate);
        if (slot.error) {
            return res.status(400).json({ success: false, message: slot.error });
        }
        if (slot.start.getTime() <= Date.now()) {
            return res.status(400).json({ success: false, message: 'A reservation must start in the future' });
        }

        //If the user is not an admin, they can only hold 3 reservations that have not ended yet
        if (!isAdmin(req)) {
            const activeCount = await Reservation.countDocuments(activeReservationFilter(req.user.id));
            if (activeCount >= MAX_ACTIVE_RESERVATIONS) {
                return res.status(400).json({
                    success: false,
                    message: `The user with ID ${req.user.id} has already made ${MAX_ACTIVE_RESERVATIONS} reservations`
                });
            }
        }

        //A4: within opening hours and no overlapping reservation of the same room
        const availability = await checkRoomAvailability(room, slot.start, slot.end);
        if (!availability.ok) {
            return sendAvailabilityError(res, availability);
        }

        //Reservation ownership: the user always comes from the token and the room from the URL
        const reservation = await Reservation.create({
            reservationDate: slot.start,
            endDate: slot.end,
            user: req.user.id,
            room: room._id
        });

        res.status(201).json({ success: true, data: reservation });
    } catch (err) {
        return sendError(res, err, 'Cannot create reservation');
    }
};

//@desc     Update reservation (FR5 own, FR8 admin any, A6 at least 1 hour before it begins, A4 availability)
//@route    PUT /api/v1/reservations/:id   body: { reservationDate, endDate, room }
//@access   Private (owner or admin)
exports.updateReservation = async (req, res, next) => {
    try {
        //ดูก่อนว่าที่จะ update อยู่ในฐานข้อมูลมั้ย?
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        //Ownership: make sure user is the reservation owner or admin
        if (!isOwner(reservation, req) && !isAdmin(req)) {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to update this reservation`
            });
        }

        if (!isAdmin(req) && startsTooSoon(reservation)) {
            return res.status(403).json({
                success: false,
                message: 'A reservation can only be edited at least 1 hour before it begins'
            });
        }

        const { reservationDate, endDate, room: roomId } = req.body;
        if (reservationDate === undefined && endDate === undefined && roomId === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Nothing to update. You can change reservationDate, endDate and room'
            });
        }

        //Do not allow ownership to be transferred through the request body: only these fields can change
        const room = await Room.findById(roomId === undefined ? reservation.room : roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: `No room with the id of ${roomId || reservation.room}` });
        }

        //Moving only the start keeps the original duration
        const currentStart = reservation.reservationDate;
        const currentEnd = effectiveEndDate(reservation);
        const slot = buildSlot(
            reservationDate === undefined ? currentStart : reservationDate,
            endDate === undefined ? (reservationDate === undefined ? currentEnd : undefined) : endDate,
            currentEnd.getTime() - currentStart.getTime()
        );
        if (slot.error) {
            return res.status(400).json({ success: false, message: slot.error });
        }
        if (!isAdmin(req) && slot.start.getTime() <= Date.now()) {
            return res.status(400).json({ success: false, message: 'A reservation must start in the future' });
        }

        const availability = await checkRoomAvailability(room, slot.start, slot.end, reservation._id);
        if (!availability.ok) {
            return sendAvailabilityError(res, availability);
        }

        reservation.set({ reservationDate: slot.start, endDate: slot.end, room: room._id });
        await reservation.save();
        await reservation.populate(ROOM_FIELDS);

        res.status(200).json({ success: true, data: reservation });
    } catch (err) {
        return sendError(res, err, 'Cannot update reservation');
    }
};

//@desc     Delete reservation (FR6 own, FR9 admin any, A7 at least 1 hour before it begins)
//@route    DELETE /api/v1/reservations/:id
//@access   Private (owner or admin)
exports.deleteReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        //Ownership: make sure user is the reservation owner or admin
        if (!isOwner(reservation, req) && !isAdmin(req)) {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to delete this reservation`
            });
        }

        if (!isAdmin(req) && startsTooSoon(reservation)) {
            return res.status(403).json({
                success: false,
                message: 'A reservation can only be deleted at least 1 hour before it begins'
            });
        }

        await reservation.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        return sendError(res, err, 'Cannot delete reservation');
    }
};
