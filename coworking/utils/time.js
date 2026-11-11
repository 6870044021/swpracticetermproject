// Time rules and helpers for reservations (FR3, A4, A6, A7).
// Kept free of model imports so models can use these constants without circular requires.

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const MINUTES_PER_DAY = 24 * 60;

// FR3: a non-admin user may hold up to 3 reservations that have not ended yet.
const MAX_ACTIVE_RESERVATIONS = 3;

// A reservation without an endDate is a 1-hour slot (also used for data created before endDate existed).
const DEFAULT_RESERVATION_DURATION_MS = ONE_HOUR_MS;

// A6 / A7: users may edit or delete a reservation only if it begins at least 1 hour from now.
const MIN_NOTICE_TO_CHANGE_MS = ONE_HOUR_MS;

const MAX_RESERVATION_DURATION_MS = ONE_DAY_MS;

// Opening hours such as "08:00-20:00" (also accepts "8.00 - 20.00"); "00:00-24:00" means open 24 hours.
const OPEN_CLOSE_REGEX = /^\s*([01]?\d|2[0-3])[:.]([0-5]\d)\s*-\s*([01]?\d|2[0-4])[:.]([0-5]\d)\s*$/;
const OPEN_CLOSE_FORMAT_MESSAGE =
    'Please add open-close times in HH:mm-HH:mm format with the close time later than the open time, e.g. 08:00-20:00 (use 00:00-24:00 for 24 hours)';

// Co-working spaces are in Thailand (UTC+07:00, no daylight saving). Override with TZ_OFFSET, e.g. TZ_OFFSET=+07:00
const getOffsetMinutes = () => {
    const match = /^([+-])(\d{2}):?(\d{2})$/.exec(String(process.env.TZ_OFFSET || '+07:00').trim());
    if (!match) {
        return 7 * 60;
    }
    const minutes = Number(match[2]) * 60 + Number(match[3]);
    return match[1] === '-' ? -minutes : minutes;
};

const pad = (n) => String(n).padStart(2, '0');

const formatOffset = () => {
    const offset = getOffsetMinutes();
    const sign = offset < 0 ? '-' : '+';
    const abs = Math.abs(offset);
    return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

const formatMinutes = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// Wall-clock date (YYYY-MM-DD) and minutes since local midnight of a Date.
const toLocalParts = (date) => {
    const shifted = date.getTime() + getOffsetMinutes() * ONE_MINUTE_MS;
    const msOfDay = ((shifted % ONE_DAY_MS) + ONE_DAY_MS) % ONE_DAY_MS;
    return {
        dateKey: new Date(shifted).toISOString().slice(0, 10),
        minutes: msOfDay / ONE_MINUTE_MS
    };
};

// "2026-11-20T09:00:00+07:00" style string in the co-working space's time zone.
const toLocalISOString = (date) => {
    const shifted = new Date(date.getTime() + getOffsetMinutes() * ONE_MINUTE_MS);
    return shifted.toISOString().slice(0, 19) + formatOffset();
};

const todayKey = () => toLocalParts(new Date()).dateKey;

const isDateKey = (value) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

// Local midnight of a YYYY-MM-DD date as an absolute Date.
const localDayStart = (dateKey) =>
    new Date(Date.parse(`${dateKey}T00:00:00.000Z`) - getOffsetMinutes() * ONE_MINUTE_MS);

// Returns { open, close, is24Hours } in minutes since midnight, or null if the value cannot be used.
const parseOpenCloseTimes = (value) => {
    const match = OPEN_CLOSE_REGEX.exec(typeof value === 'string' ? value : '');
    if (!match) {
        return null;
    }
    const open = Number(match[1]) * 60 + Number(match[2]);
    const close = Number(match[3]) * 60 + Number(match[4]);
    if (close > MINUTES_PER_DAY || close <= open) {
        return null;
    }
    return { open, close, is24Hours: open === 0 && close === MINUTES_PER_DAY };
};

const isValidOpenCloseTimes = (value) => parseOpenCloseTimes(value) !== null;

// A4: null when [start, end) fits inside the opening hours, otherwise an error message.
const checkOpeningHours = (openCloseTimes, start, end) => {
    const hours = parseOpenCloseTimes(openCloseTimes);
    // Unknown format (legacy data) or a 24-hour space: there is no opening-hours restriction to enforce.
    if (!hours || hours.is24Hours) {
        return null;
    }
    const startMinutes = toLocalParts(start).minutes;
    const endMinutes = startMinutes + (end.getTime() - start.getTime()) / ONE_MINUTE_MS;
    if (startMinutes < hours.open || endMinutes > hours.close) {
        return `This co-working space is open ${formatMinutes(hours.open)}-${formatMinutes(hours.close)} (UTC${formatOffset()}). ` +
            'Please choose a start and end time within the opening hours of the same day.';
    }
    return null;
};

const parseDateInput = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
        return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

// Turns request values into a time slot. Returns { start, end } or { error }.
const buildSlot = (startValue, endValue, fallbackDurationMs = DEFAULT_RESERVATION_DURATION_MS) => {
    const start = parseDateInput(startValue);
    if (!start) {
        return { error: 'Please provide a valid reservationDate (start date-time), e.g. 2026-11-20T09:00:00+07:00' };
    }
    let end;
    if (endValue === undefined || endValue === null || endValue === '') {
        end = new Date(start.getTime() + fallbackDurationMs);
    } else {
        end = parseDateInput(endValue);
        if (!end) {
            return { error: 'Please provide a valid endDate (end date-time), e.g. 2026-11-20T11:00:00+07:00' };
        }
    }
    if (end.getTime() <= start.getTime()) {
        return { error: 'endDate must be later than reservationDate' };
    }
    if (end.getTime() - start.getTime() > MAX_RESERVATION_DURATION_MS) {
        return { error: 'A reservation cannot be longer than 24 hours' };
    }
    return { start, end };
};

// Legacy reservations without endDate are treated as 1-hour slots.
const effectiveEndDate = (reservation) =>
    reservation.endDate || new Date(new Date(reservation.reservationDate).getTime() + DEFAULT_RESERVATION_DURATION_MS);

module.exports = {
    ONE_MINUTE_MS,
    ONE_HOUR_MS,
    ONE_DAY_MS,
    MAX_ACTIVE_RESERVATIONS,
    DEFAULT_RESERVATION_DURATION_MS,
    MIN_NOTICE_TO_CHANGE_MS,
    OPEN_CLOSE_REGEX,
    OPEN_CLOSE_FORMAT_MESSAGE,
    formatOffset,
    formatMinutes,
    toLocalParts,
    toLocalISOString,
    todayKey,
    isDateKey,
    localDayStart,
    parseOpenCloseTimes,
    isValidOpenCloseTimes,
    checkOpeningHours,
    buildSlot,
    effectiveEndDate
};
