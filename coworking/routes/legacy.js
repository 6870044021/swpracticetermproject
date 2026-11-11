const express = require('express');
const { HttpError } = require('../utils/errors');

// Assignment 7 used hospitals/appointments. Keep an explicit adapter, not duplicate business rules.
const translateBody = (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Link', '</api/v1/rooms>; rel="successor-version"');
  if (req.body && typeof req.body === 'object') {
    if (req.body.apptDate !== undefined) { req.body.reservationDate = req.body.apptDate; delete req.body.apptDate; }
    if (req.body.hospital !== undefined) { req.body.room = req.body.hospital; delete req.body.hospital; }
    // The old appointment endpoint accepted user input but always replaced it with the caller.
    if (req.method === 'POST') delete req.body.user;
  }
  const originalJson = res.json.bind(res);
  res.json = payload => {
    const map = item => {
      if (!item || typeof item !== 'object') return item;
      const value = item.toJSON ? item.toJSON() : { ...item };
      if (value.reservationDate) value.apptDate = value.reservationDate;
      if (value.room) value.hospital = value.room;
      return value;
    };
    if (payload?.data) payload.data = Array.isArray(payload.data) ? payload.data.map(map) : map(payload.data);
    return originalJson(payload);
  };
  next();
};
const hospitals = express.Router();
hospitals.use(translateBody);
hospitals.use('/:roomId/appointments', require('./reservations'));
hospitals.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/') req.body = { description: '', openCloseTimes: '00:00-24:00', ...req.body };
  next();
});
hospitals.use(require('./rooms'));
const appointments = express.Router();
appointments.use(translateBody);
appointments.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/') return next(new HttpError(400, 'Create appointments with /hospitals/:roomId/appointments'));
  next();
});
appointments.use(require('./reservations'));
module.exports = { hospitals, appointments };
