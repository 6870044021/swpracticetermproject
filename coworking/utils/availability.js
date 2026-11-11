// A4: a booking can only be made if the co-working space is available at the requested times.
const Reservation = require('../models/Reservation');
const {
    ONE_DAY_MS,
    DEFAULT_RESERVATION_DURATION_MS,
    checkOpeningHours,
    parseOpenCloseTimes,
    localDayStart,
    toLocalISOString,
    effectiveEndDate
} = require('./time');

// Reservations of `roomId` whose slot overlaps [start, end).
// Reservations created before endDate existed have endDate = null and count as 1-hour slots.
const overlapFilter = (roomId, start, end, excludeId) => {
    const filter = {
        room: roomId,
        reservationDate: { $lt: end },
        $or: [
            { endDate: { $gt: start } },
            { endDate: null, reservationDate: { $gt: new Date(start.getTime() - DEFAULT_RESERVATION_DURATION_MS) } }
        ]
    };
    if (excludeId) {
        filter._id = { $ne: excludeId };
    }
    return filter;
};

// FR3: reservations of a user that have not ended yet (upcoming or in progress).
// Past bookings do not count, because A7 does not allow deleting a reservation that has already begun.
const activeReservationFilter = (userId, now = new Date()) => ({
    user: userId,
    $or: [
        { endDate: { $gt: now } },
        { endDate: null, reservationDate: { $gt: new Date(now.getTime() - DEFAULT_RESERVATION_DURATION_MS) } }
    ]
});

const toSlot = (reservation) => ({
    reservationDate: toLocalISOString(new Date(reservation.reservationDate)),
    endDate: toLocalISOString(effectiveEndDate(reservation))
});

// Returns { ok: true } or { ok: false, status, message, conflicts }.
const checkRoomAvailability = async (room, start, end, excludeId) => {
    const hoursError = checkOpeningHours(room.openCloseTimes, start, end);
    if (hoursError) {
        return { ok: false, status: 400, message: hoursError };
    }

    const conflicts = await Reservation.find(overlapFilter(room._id, start, end, excludeId))
        .select('reservationDate endDate')
        .sort('reservationDate')
        .lean();

    if (conflicts.length > 0) {
        return {
            ok: false,
            status: 409,
            message: `Room "${room.name}" is already booked at the requested time. Please choose another time slot.`,
            conflicts: conflicts.map(toSlot)
        };
    }
    return { ok: true };
};

// Booked and free slots of a room on one local day (YYYY-MM-DD).
const getDaySchedule = async (room, dateKey) => {
    const dayStart = localDayStart(dateKey);
    const dayEnd = new Date(dayStart.getTime() + ONE_DAY_MS);
    const hours = parseOpenCloseTimes(room.openCloseTimes);
    const openFrom = hours ? new Date(dayStart.getTime() + hours.open * 60 * 1000) : dayStart;
    const openUntil = hours ? new Date(dayStart.getTime() + hours.close * 60 * 1000) : dayEnd;

    const booked = await Reservation.find(overlapFilter(room._id, dayStart, dayEnd))
        .select('reservationDate endDate')
        .sort('reservationDate')
        .lean();

    const freeSlots = [];
    let cursor = openFrom;
    for (const reservation of booked) {
        const busyFrom = new Date(Math.max(new Date(reservation.reservationDate).getTime(), openFrom.getTime()));
        const busyUntil = new Date(Math.min(effectiveEndDate(reservation).getTime(), openUntil.getTime()));
        if (busyFrom > cursor) {
            freeSlots.push({ reservationDate: toLocalISOString(cursor), endDate: toLocalISOString(busyFrom) });
        }
        if (busyUntil > cursor) {
            cursor = busyUntil;
        }
    }
    if (cursor < openUntil) {
        freeSlots.push({ reservationDate: toLocalISOString(cursor), endDate: toLocalISOString(openUntil) });
    }

    return {
        date: dateKey,
        openCloseTimes: room.openCloseTimes,
        openingHoursKnown: Boolean(hours),
        bookedSlots: booked.map(toSlot),
        freeSlots
    };
};

module.exports = {
    overlapFilter,
    activeReservationFilter,
    checkRoomAvailability,
    getDaySchedule
};
