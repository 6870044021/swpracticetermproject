'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Review = require('../models/Review');
const Note = require('../models/Note');
const mongoose = require('mongoose');

test('FR1/A1 user model validates contact fields and password policy', async () => {
  const valid = { name: 'Pu', email: 'PU@EXAMPLE.TEST', tel: '0811111111', password: 'PuTesting123' };
  const user = new User(valid);
  await user.validate();
  assert.equal(user.email, 'pu@example.test');
  for (const change of [{ name: '' }, { email: 'bad' }, { tel: '' }, { password: 'weakpass1' }]) {
    await assert.rejects(new User({ ...valid, ...change }).validate(), mongoose.Error.ValidationError);
  }
});

test('A2 password save hook hashes once and does not rehash unrelated saves', async () => {
  const password = 'PuTesting123';
  const user = new User({ name: 'Pu', email: 'pu@example.test', tel: '0811111111', password });
  await User.schema.s.hooks.execPre('save', user, []);
  const hash = user.password;
  assert.notEqual(hash, password);
  assert.equal(await bcrypt.compare(password, hash), true);
  user.unmarkModified('password');
  user.name = 'Updated Pu';
  await User.schema.s.hooks.execPre('save', user, []);
  assert.equal(user.password, hash);
});

test('FR2 token includes revocation version and model JSON excludes credentials', () => {
  process.env.JWT_SECRET = 'test-only-jwt-key-123456789012345678901234567890';
  const user = new User({ name: 'Pu', email: 'pu@example.test', tel: '0811111111', password: 'PuTesting123', passwordHint: 'My hint', tokenVersion: 5 });
  const decoded = jwt.verify(user.getSignedJwtToken(), process.env.JWT_SECRET);
  assert.equal(decoded.id, user.id); assert.equal(decoded.tv, 5);
  const json = user.toJSON();
  for (const key of ['password', 'passwordHint', 'tokenVersion']) assert.equal(json[key], undefined);
});

test('FR3 room model validates required contact and opening-hour format', async () => {
  const data = { name: 'Room', address: 'Bangkok', tel: '021234567', openCloseTimes: '08:00-20:00' };
  await new Room(data).validate();
  for (const change of [{ name: '' }, { address: '' }, { tel: '' }, { openCloseTimes: 'bad' }]) await assert.rejects(new Room({ ...data, ...change }).validate(), mongoose.Error.ValidationError);
});

test('A10 duplicate-review prevention has a database unique user-room index', () => {
  assert.ok(Review.schema.indexes().some(([keys, options]) => keys.user === 1 && keys.room === 1 && options.unique));
});

test('A8 private-note model requires both owner and room', async () => {
  await assert.rejects(new Note({ noteData: 'Private' }).validate(), mongoose.Error.ValidationError);
  await new Note({ user: new mongoose.Types.ObjectId(), room: new mongoose.Types.ObjectId(), noteData: 'Private' }).validate();
});
