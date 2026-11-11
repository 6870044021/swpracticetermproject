'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isStrongPassword, parseDate, parseOpeningHours, validateOpeningHours,
  reservationInterval, enforceLeadTime, overlaps, isSuspended, HOUR,
} = require('../utils/booking');

test('A1 strong passwords need eight characters, lowercase, uppercase and number', () => {
  for (const password of ['PuPass12', 'A1bcdefg', 'Password9!']) assert.equal(isStrongPassword(password), true);
  for (const password of ['', 'Aa1', 'password1', 'PASSWORD1', 'Password', '12345678', null, 12345678, {}]) {
    assert.equal(isStrongPassword(password), false, JSON.stringify(password));
  }
});

test('dates require an unambiguous ISO time with a timezone offset', () => {
  assert.equal(parseDate('2030-01-01T10:00:00+07:00', 'start').toISOString(), '2030-01-01T03:00:00.000Z');
  assert.equal(parseDate('2030-01-01T03:00:00.000Z', 'start').toISOString(), '2030-01-01T03:00:00.000Z');
  for (const invalid of ['not a date', '2030-01-01T10:00:00', null, {}, '2030-02-30T03:00:00Z']) {
    assert.throws(() => parseDate(invalid, 'start'), undefined, JSON.stringify(invalid));
  }
});

test('A4 intervals enforce future start, end after start and a maximum 24h duration', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  const valid = { reservationDate: '2030-01-02T03:00:00Z', endTime: '2030-01-02T04:00:00Z' };
  const parsed = reservationInterval(valid, null, now);
  assert.equal(parsed.reservationDate.toISOString(), valid.reservationDate.replace('Z', '.000Z'));
  assert.equal(+parsed.endTime - +parsed.reservationDate, HOUR);
  const legacy = reservationInterval({ reservationDate: '2030-01-02T03:00:00Z' }, null, now);
  assert.equal(+legacy.endTime - +legacy.reservationDate, HOUR);
  for (const body of [
    {},
    { reservationDate: '2030-01-02' },
    { reservationDate: '2029-12-31T03:00:00Z', endTime: '2029-12-31T04:00:00Z' },
    { ...valid, endTime: valid.reservationDate },
    { ...valid, endTime: '2030-01-02T02:00:00Z' },
    { ...valid, endTime: '2030-01-03T04:00:00Z' },
  ]) assert.throws(() => reservationInterval(body, null, now));
});

test('A4 overlapping intervals use half-open [start,end) boundaries', () => {
  const d = (time) => new Date(`2030-01-01T${time}:00Z`);
  const original = [d('02:00'), d('03:00')];
  for (const [start, end] of [['02:00', '03:00'], ['01:30', '02:30'], ['02:30', '03:30'], ['01:00', '04:00'], ['02:15', '02:45']]) {
    assert.equal(overlaps(...original, d(start), d(end)), true, `${start}-${end}`);
  }
  for (const [start, end] of [['01:00', '02:00'], ['03:00', '04:00'], ['04:00', '05:00']]) {
    assert.equal(overlaps(...original, d(start), d(end)), false, `${start}-${end}`);
  }
});

test('A4 Bangkok opening hours include exact opening and closing boundaries', () => {
  assert.deepEqual(parseOpeningHours('08:00-20:00'), { open: 480, close: 1200 });
  assert.doesNotThrow(() => validateOpeningHours(new Date('2030-01-02T01:00:00Z'), new Date('2030-01-02T13:00:00Z'), '08:00-20:00'));
  assert.throws(() => validateOpeningHours(new Date('2030-01-02T00:59:59Z'), new Date('2030-01-02T02:00:00Z'), '08:00-20:00'));
  assert.throws(() => validateOpeningHours(new Date('2030-01-02T12:00:00Z'), new Date('2030-01-02T13:00:01Z'), '08:00-20:00'));
  for (const invalid of ['8-20', '25:00-26:00', '08:61-20:00', '', null]) assert.throws(() => parseOpeningHours(invalid));
});

test('A4 overnight business hours handle midnight in Asia/Bangkok', () => {
  assert.doesNotThrow(() => validateOpeningHours(new Date('2030-01-02T16:00:00Z'), new Date('2030-01-02T18:00:00Z'), '22:00-02:00'));
  assert.throws(() => validateOpeningHours(new Date('2030-01-02T16:00:00Z'), new Date('2030-01-02T20:00:00Z'), '22:00-02:00'));
});

test('A4 an all-day room stays available across local midnight', () => {
  assert.doesNotThrow(() => validateOpeningHours(new Date('2030-01-02T16:30:00Z'), new Date('2030-01-02T18:30:00Z'), '00:00-24:00'));
});

test('A6/A7 one hour is inclusive, one millisecond less is rejected', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  assert.doesNotThrow(() => enforceLeadTime(new Date(+now + HOUR), now));
  assert.doesNotThrow(() => enforceLeadTime(new Date(+now + 2 * HOUR), now));
  for (const start of [new Date(+now + HOUR - 1), now, new Date(+now - HOUR)]) assert.throws(() => enforceLeadTime(start, now));
});

test('A9/A11 temporary suspension expires at its exact end, permanent does not', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  assert.equal(isSuspended({ userStatus: 'active' }, now), false);
  assert.equal(isSuspended({ userStatus: 'permanentBan' }, now), true);
  assert.equal(isSuspended({ userStatus: 'temporaryBan', banUntil: new Date(+now + 1) }, now), true);
  assert.equal(isSuspended({ userStatus: 'temporaryBan', banUntil: now }, now), false);
  assert.equal(isSuspended({ userStatus: 'temporaryBan', banUntil: new Date(+now - 1) }, now), false);
});
