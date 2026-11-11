'use strict';

// Real HTTP + MongoDB replica-set tests. No production database is selected:
// this suite creates and drops only its own uniquely named vacq_test_* database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGO_URI;

test('FR1-9 and A1-A13 through HTTP and real MongoDB', { skip: !uri, timeout: 180000 }, async (t) => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-only-secret-never-use-outside-tests-123456789';
  process.env.JWT_EXPIRE = '1d';
  process.env.JWT_COOKIE_EXPIRE = '1';
  const databaseName = `vacq_test_${Date.now()}_${process.pid}`;
  assert.match(databaseName, /^vacq_test_\d+_\d+$/);
  await mongoose.connect(uri, { dbName: databaseName, serverSelectionTimeoutMS: 10000 });
  const User = require('../models/User');
  const Room = require('../models/Room');
  const Reservation = require('../models/Reservation');
  const Review = require('../models/Review');
  const Note = require('../models/Note');
  await Promise.all([User.init(), Room.init(), Reservation.init(), Review.init(), Note.init()]);
  const app = require('../app');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    // databaseName is generated above, never read from the caller's URI.
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  async function request(method, route, token, body) {
    const response = await fetch(base + route, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json = await response.json();
    return { status: response.status, json, headers: response.headers };
  }
  function status(response, expected) {
    assert.equal(response.status, expected, JSON.stringify(response.json));
    if (expected < 400) assert.equal(response.json.success, true);
    return response.json;
  }
  const password = 'PuTesting123';
  const admin = await User.create({ name: 'Test admin', email: 'admin@example.test', tel: '020000000', password, role: 'admin' });
  let adminToken = status(await request('POST', '/auth/login', null, { email: admin.email, password }), 200).token;
  let userToken; let userId; let otherToken; let otherId; let roomId; let otherRoomId;
  const day = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  function interval(hour, minutes = 60) {
    const start = new Date(`${day}T${String(hour).padStart(2, '0')}:00:00.000Z`);
    return { reservationDate: start.toISOString(), endTime: new Date(+start + minutes * 60000).toISOString() };
  }

  await t.test('FR1/A1 reject weak passwords and public admin escalation; register/login users', async () => {
    for (const weak of ['Short1', 'lowercase1', 'UPPERCASE1', 'NoNumbers', '12345678']) {
      status(await request('POST', '/auth/register', null, { name: 'Weak', email: `weak${weak}@example.test`, tel: '0811111111', password: weak }), 400);
    }
    const escalated = await request('POST', '/auth/register', null, { name: 'Escalate', email: 'escalate@example.test', tel: '0811111111', password, role: 'admin' });
    assert.ok([201, 403].includes(escalated.status), JSON.stringify(escalated.json));
    if (escalated.status === 201) assert.notEqual(status(await request('GET', '/auth/me', escalated.json.token), 200).data.role, 'admin');
    const registered = status(await request('POST', '/auth/register', null, { name: 'Pu', email: 'pu@example.test', tel: '0811111111', password, passwordHint: 'A test hint' }), 201);
    userToken = registered.token; userId = registered._id || registered.data?._id;
    assert.ok(userToken); assert.ok(userId);
    const other = status(await request('POST', '/auth/register', null, { name: 'Other', email: 'other@example.test', tel: '0822222222', password }), 201);
    otherToken = other.token; otherId = other._id || other.data?._id;
    status(await request('POST', '/auth/register', null, { name: 'Duplicate', email: 'pu@example.test', tel: '0833333333', password }), 409);
    status(await request('POST', '/auth/login', null, { email: 'pu@example.test', password: 'Wrong1234' }), 401);
    status(await request('GET', '/auth/me'), 401);
    status(await request('GET', '/auth/me', 'invalid-token'), 401);
    const me = status(await request('GET', '/auth/me', userToken), 200).data;
    assert.equal(me.email, 'pu@example.test'); assert.equal(me.password, undefined);
  });

  await t.test('A2/A3 password hint, old-password check, strength, rehash and token revocation', async () => {
    const hint = status(await request('GET', '/auth/passwordHint?email=pu%40example.test'), 200);
    assert.equal(hint.data?.passwordHint ?? hint.passwordHint, 'A test hint');
    status(await request('PUT', '/auth/passwordHint', userToken, { passwordHint: 'Updated hint' }), 200);
    status(await request('POST', '/auth/changePassword', userToken, { oldPassword: 'Wrong1234', newPassword: 'ChangedPu456' }), 401);
    status(await request('POST', '/auth/changePassword', userToken, { oldPassword: password, newPassword: 'alllowercase1' }), 400);
    const changed = status(await request('POST', '/auth/changePassword', userToken, { oldPassword: password, newPassword: 'ChangedPu456' }), 200);
    status(await request('GET', '/auth/me', userToken), 401);
    userToken = changed.token;
    status(await request('POST', '/auth/login', null, { email: 'pu@example.test', password }), 401);
    userToken = status(await request('POST', '/auth/login', null, { email: 'pu@example.test', password: 'ChangedPu456' }), 200).token;
    const saved = await User.findById(userId).select('+password');
    assert.notEqual(saved.password, 'ChangedPu456'); assert.equal(await saved.matchPassword('ChangedPu456'), true);
  });

  await t.test('Room CRUD and FR3 public list retain required room fields', async () => {
    const data = { name: `Integration room ${Date.now()}`, description: 'Isolated test room', address: 'Bangkok', tel: '021234567', openCloseTimes: '08:00-20:00' };
    status(await request('POST', '/rooms', userToken, data), 403);
    roomId = status(await request('POST', '/rooms', adminToken, data), 201).data._id;
    otherRoomId = status(await request('POST', '/rooms', adminToken, { ...data, name: data.name + ' other' }), 201).data._id;
    const room = status(await request('GET', `/rooms/${roomId}`), 200).data;
    for (const key of ['name', 'address', 'tel', 'openCloseTimes']) assert.ok(room[key]);
    assert.ok(status(await request('GET', '/rooms'), 200).data.some((r) => r._id === roomId));
    status(await request('PUT', `/rooms/${roomId}`, adminToken, { description: 'Updated room description' }), 200);
    status(await request('GET', '/rooms/not-an-id'), 400);
  });

  let firstReservation;
  await t.test('FR3-9/A4 availability, max3, ownership and admin CRUD', async () => {
    status(await request('POST', `/rooms/${roomId}/reservations`, userToken, { reservationDate: `${day}T16:00:00.000Z`, endTime: `${day}T17:00:00.000Z` }), 409); // 23:00 Bangkok is closed.
    firstReservation = status(await request('POST', `/rooms/${roomId}/reservations`, userToken, interval(2)), 201).data._id;
    const overlap = await request('POST', `/rooms/${roomId}/reservations`, otherToken, interval(2));
    status(overlap, 409);
    const second = status(await request('POST', `/rooms/${roomId}/reservations`, userToken, interval(3)), 201).data._id; // Adjacent interval is allowed.
    const third = status(await request('POST', `/rooms/${otherRoomId}/reservations`, userToken, interval(4)), 201).data._id;
    status(await request('POST', `/rooms/${otherRoomId}/reservations`, userToken, interval(5)), 400);
    status(await request('GET', `/reservations/${firstReservation}`, otherToken), 403);
    status(await request('PUT', `/reservations/${firstReservation}`, otherToken, interval(6)), 403);
    status(await request('DELETE', `/reservations/${firstReservation}`, otherToken), 403);
    assert.equal(status(await request('GET', '/reservations', otherToken), 200).data.length, 0);
    assert.equal(status(await request('GET', `/rooms/${otherRoomId}/reservations`, userToken), 200).data.length, 1);
    assert.equal(status(await request('GET', '/reservations', adminToken), 200).data.length, 3);
    status(await request('PUT', `/reservations/${firstReservation}`, userToken, interval(6)), 200);
    status(await request('PUT', `/reservations/${firstReservation}`, adminToken, interval(7)), 200);
    status(await request('DELETE', `/reservations/${second}`, userToken), 200);
    status(await request('DELETE', `/reservations/${third}`, adminToken), 200);
    status(await request('DELETE', `/reservations/${firstReservation}`, adminToken), 200);
  });

  await t.test('A4 concurrent overlapping requests create exactly one reservation', async () => {
    const results = await Promise.all([
      request('POST', `/rooms/${roomId}/reservations`, userToken, interval(2)),
      request('POST', `/rooms/${roomId}/reservations`, otherToken, interval(2)),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409], JSON.stringify(results));
    const created = results.find((r) => r.status === 201).json.data._id;
    status(await request('DELETE', `/reservations/${created}`, adminToken), 200);
  });

  await t.test('FR3 simultaneous requests cannot bypass the three-active-booking limit', async () => {
    const roomData = { address: 'Bangkok', tel: '021234567', openCloseTimes: '08:00-20:00' };
    const extraA = status(await request('POST', '/rooms', adminToken, { ...roomData, name: 'Concurrency room A' }), 201).data._id;
    const extraB = status(await request('POST', '/rooms', adminToken, { ...roomData, name: 'Concurrency room B' }), 201).data._id;
    // Different rooms remove the shared-room lock from the equation: the user
    // lock must serialize this limit across all rooms.
    const results = await Promise.all([roomId, otherRoomId, extraA, extraB].map((id) => request('POST', `/rooms/${id}/reservations`, userToken, interval(2))));
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 201, 400], JSON.stringify(results));
    for (const result of results.filter((r) => r.status === 201)) status(await request('DELETE', `/reservations/${result.json.data._id}`, adminToken), 200);
    status(await request('DELETE', `/rooms/${extraA}`, adminToken), 200);
    status(await request('DELETE', `/rooms/${extraB}`, adminToken), 200);
  });

  await t.test('Assignment 7 hospital and appointment adapters retain CRUD workflows', async () => {
    const legacyRoom = status(await request('POST', '/hospitals', adminToken, { name: 'Legacy adapter room', address: 'Bangkok', tel: '021234567', district: 'Pathumwan', province: 'Bangkok', postalcode: '10330', region: 'Central' }), 201).data._id;
    const listed = await request('GET', '/hospitals?select=name,address&sort=name&page=1&limit=10');
    status(listed, 200); assert.equal(listed.headers.get('deprecation'), 'true');
    const appt = status(await request('POST', `/hospitals/${legacyRoom}/appointments`, userToken, { apptDate: interval(2).reservationDate, endTime: interval(2).endTime, user: otherId }), 201).data;
    assert.equal(appt.user, userId); assert.ok(appt.apptDate); assert.ok(appt.hospital);
    status(await request('GET', `/appointments/${appt._id}`, userToken), 200);
    status(await request('PUT', `/appointments/${appt._id}`, userToken, { apptDate: interval(3).reservationDate, endTime: interval(3).endTime }), 200);
    status(await request('DELETE', `/appointments/${appt._id}`, userToken), 200);
    status(await request('DELETE', `/hospitals/${legacyRoom}`, adminToken), 200);
  });

  await t.test('A6/A7 deny edits and deletion inside one hour including admins', async () => {
    // Fixture avoids making the result depend on the wall clock's business hour.
    const soon = await Reservation.create({ user: userId, room: roomId, reservationDate: new Date(Date.now() + 30 * 60000), endTime: new Date(Date.now() + 90 * 60000) });
    for (const token of [userToken, adminToken]) {
      status(await request('PUT', `/reservations/${soon.id}`, token, interval(3)), 409);
      status(await request('DELETE', `/reservations/${soon.id}`, token), 409);
    }
    await Reservation.deleteOne({ _id: soon._id });
  });

  let reviewId; let noteId;
  await t.test('A5/A10/A12/A13 one review, completed booking count, anonymous privacy and filtering', async () => {
    await Reservation.create({ user: userId, room: roomId, reservationDate: new Date(Date.now() - 2 * 86400000), endTime: new Date(Date.now() - 2 * 86400000 + 3600000) });
    reviewId = status(await request('POST', `/rooms/${roomId}/reviews`, userToken, { reviewData: 'Useful quiet room', anonymousReview: true }), 201).data._id;
    status(await request('POST', `/rooms/${roomId}/reviews`, userToken, { reviewData: 'Duplicate' }), 409);
    const anonymous = status(await request('GET', `/reviews/${reviewId}`, otherToken), 200).data;
    assert.equal(anonymous.pastBookings, 1);
    assert.equal(anonymous.anonymousReview, true);
    assert.ok(!JSON.stringify(anonymous).includes(userId), 'Anonymous review leaks user ID');
    assert.ok(!JSON.stringify(anonymous).includes('pu@example.test'), 'Anonymous review leaks email');
    assert.equal(status(await request('GET', `/rooms/${roomId}/reviews?includeAnonymous=false`, otherToken), 200).data.length, 0);
    status(await request('PUT', `/reviews/${reviewId}`, otherToken, { reviewData: 'Hijack' }), 403);
    status(await request('DELETE', `/reviews/${reviewId}`, otherToken), 403);
    status(await request('PUT', `/reviews/${reviewId}`, userToken, { reviewData: 'Edited review', anonymousReview: false }), 200);
    assert.equal(status(await request('GET', `/rooms/${roomId}/reviews?includeAnonymous=false`, otherToken), 200).data.length, 1);
    status(await request('DELETE', `/reviews/${reviewId}`, userToken), 200);
    reviewId = status(await request('POST', `/rooms/${roomId}/reviews`, userToken, { reviewData: 'Review after deleting', anonymousReview: false }), 201).data._id;
  });

  await t.test('A8 notes stay private even from admins; user/room cannot be reassigned', async () => {
    noteId = status(await request('POST', `/rooms/${roomId}/notes`, userToken, { noteData: 'Private test note' }), 201).data._id;
    for (const token of [otherToken, adminToken]) {
      assert.equal(status(await request('GET', '/notes', token), 200).data.length, 0);
      status(await request('GET', `/notes/${noteId}`, token), 404);
      status(await request('PUT', `/notes/${noteId}`, token, { noteData: 'Hijacked' }), 404);
      status(await request('DELETE', `/notes/${noteId}`, token), 404);
    }
    const updated = await request('PUT', `/notes/${noteId}`, userToken, { noteData: 'Updated private note', user: otherId, room: otherRoomId });
    assert.ok([200, 400].includes(updated.status));
    const saved = await Note.findById(noteId);
    assert.equal(saved.user.toString(), userId); assert.equal(saved.room.toString(), roomId);
    status(await request('DELETE', `/notes/${noteId}`, userToken), 200);
  });

  await t.test('A9/A11 temporary, permanent, expiry and lifted suspension enforcement', async () => {
    status(await request('POST', '/auth/suspend', userToken, { id: otherId, banType: 'permanentBan' }), 403);
    for (const banType of ['temporaryBan', 'permanentBan']) {
      status(await request('POST', '/auth/suspend', adminToken, { id: otherId, banType, banTime: 1 }), 200);
      status(await request('POST', `/rooms/${roomId}/reservations`, otherToken, interval(3)), 403);
      status(await request('POST', `/rooms/${roomId}/reviews`, otherToken, { reviewData: 'Blocked' }), 403);
    }
    await User.updateOne({ _id: otherId }, { userStatus: 'temporaryBan', banUntil: new Date(Date.now() - 60000) });
    const activeReservation = status(await request('POST', `/rooms/${roomId}/reservations`, otherToken, interval(3)), 201).data._id;
    status(await request('DELETE', `/reservations/${activeReservation}`, otherToken), 200);
    status(await request('POST', '/auth/suspend', adminToken, { id: otherId, banType: 'active' }), 200);
    const activeReview = status(await request('POST', `/rooms/${roomId}/reviews`, otherToken, { reviewData: 'Allowed after lift' }), 201).data._id;
    status(await request('DELETE', `/reviews/${activeReview}`, otherToken), 200);
  });

  await t.test('FR2 logout revokes bearer tokens; public room response cannot reveal notes', async () => {
    status(await request('GET', '/auth/logout', userToken), 200);
    status(await request('GET', '/auth/me', userToken), 401);
    const publicRoom = status(await request('GET', `/rooms/${roomId}`), 200).data;
    assert.equal(publicRoom.notes, undefined);
    status(await request('DELETE', `/reviews/${reviewId}`, adminToken), 200);
    status(await request('DELETE', `/rooms/${roomId}`, adminToken), 200);
    status(await request('DELETE', `/rooms/${otherRoomId}`, adminToken), 200);
  });
});
