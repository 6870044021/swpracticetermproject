const express = require('express');
const c = require('../controllers/reservations');
const { protect, checkStatus } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');
const router = express.Router({ mergeParams: true });
router.use(protect);
router.route('/').get(asyncHandler(c.getReservations)).post(checkStatus, asyncHandler(c.addReservation));
router.route('/:id').get(asyncHandler(c.getReservation)).put(checkStatus, asyncHandler(c.updateReservation)).delete(asyncHandler(c.deleteReservation));
module.exports = router;
