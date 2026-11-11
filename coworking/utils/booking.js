const { HttpError } = require('./errors');
const HOUR = 60 * 60 * 1000;
const TIME_ZONE = 'Asia/Bangkok';
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/s;
const isStrongPassword = value => typeof value === 'string' && PASSWORD_PATTERN.test(value) && Buffer.byteLength(value, 'utf8') <= 72;
function parseDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new HttpError(400, `${field} must be an ISO 8601 date-time with Z or an explicit offset`);
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw new HttpError(400, `Invalid ${field}`);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new HttpError(400, `Invalid ${field}`);
  return result;
}
function parseOpeningHours(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'openCloseTimes must be HH:mm-HH:mm');
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)\s*(?:-|–|ถึง|to)\s*(\d{1,2}):([0-5]\d)$/i);
  if (!match) throw new HttpError(400, 'openCloseTimes must be HH:mm-HH:mm');
  const open = Number(match[1]) * 60 + Number(match[2]);
  const close = Number(match[3]) * 60 + Number(match[4]);
  if (Number(match[1]) > 23 || Number(match[3]) > 24 || close > 1440 || open === close) throw new HttpError(400, 'Invalid opening hours. Use 00:00-24:00 for an all-day room');
  return { open, close };
}
const localParts = value => {
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(value).map(part => [part.type, part.value]));
  return { day: `${fields.year}-${fields.month}-${fields.day}`, minute: Number(fields.hour) * 60 + Number(fields.minute) + Number(fields.second) / 60 + value.getMilliseconds() / 60000 };
};
function validateOpeningHours(start, end, value) {
  const { open, close } = parseOpeningHours(value);
  if (open === 0 && close === 1440) return;
  const first = localParts(start);
  const last = localParts(new Date(end.getTime() - 1));
  if (close > open) {
    if (first.day !== last.day || first.minute < open || last.minute >= close) throw new HttpError(409, 'Reservation is outside the room opening hours (Asia/Bangkok)');
  } else {
    const anchor = date => {
      const p = localParts(date);
      if (p.minute >= open) return p.day;
      if (p.minute < close) return localParts(new Date(date.getTime() - 24 * HOUR)).day;
      return null;
    };
    const firstAnchor = anchor(start);
    if (!firstAnchor || firstAnchor !== anchor(new Date(end.getTime() - 1))) throw new HttpError(409, 'Reservation is outside the room opening hours (Asia/Bangkok)');
  }
}
function reservationInterval(payload, existing = null, now = new Date()) {
  if (payload.startTime && payload.reservationDate && payload.startTime !== payload.reservationDate) throw new HttpError(400, 'Specify only one reservation start time');
  const rawStart = payload.reservationDate || payload.startTime;
  const start = rawStart ? parseDate(rawStart, 'reservationDate') : existing?.reservationDate;
  if (!start) throw new HttpError(400, 'reservationDate is required');
  let end;
  if (payload.endTime) end = parseDate(payload.endTime, 'endTime');
  else if (existing && !rawStart) end = existing.endTime || new Date(start.getTime() + HOUR);
  else if (existing) end = new Date(start.getTime() + ((existing.endTime?.getTime() || existing.reservationDate.getTime() + HOUR) - existing.reservationDate.getTime()));
  else end = new Date(start.getTime() + HOUR);
  if (start <= now) throw new HttpError(400, 'Reservation must begin in the future');
  if (end <= start) throw new HttpError(400, 'endTime must be after reservationDate');
  if (end - start > 24 * HOUR) throw new HttpError(400, 'A reservation cannot exceed 24 hours');
  return { reservationDate: start, endTime: end };
}
function enforceLeadTime(start, now = new Date()) {
  if (start.getTime() - now.getTime() < HOUR) throw new HttpError(409, 'Reservations can only be changed or deleted at least 1 hour before they begin');
}
const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB;
const isSuspended = (user, now = new Date()) => user.userStatus === 'permanentBan' || user.userStatus === 'inactive' || (user.userStatus === 'temporaryBan' && (!user.banUntil || new Date(user.banUntil) > now));
module.exports = { HOUR, TIME_ZONE, PASSWORD_PATTERN, isStrongPassword, parseDate, parseOpeningHours, validateOpeningHours, reservationInterval, enforceLeadTime, overlaps, isSuspended };
