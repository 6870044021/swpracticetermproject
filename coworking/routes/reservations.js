const express = require('express');
<<<<<<< Updated upstream
const c = require('../controllers/reservations');
const { protect, checkStatus } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');
const router = express.Router({ mergeParams: true });
router.use(protect);
router.route('/').get(asyncHandler(c.getReservations)).post(checkStatus, asyncHandler(c.addReservation));
router.route('/:id').get(asyncHandler(c.getReservation)).put(checkStatus, asyncHandler(c.updateReservation)).delete(asyncHandler(c.deleteReservation));
module.exports = router;
=======

//ดึง method getReservations และ อื่น ๆ มาใช้จาก controllers ของ reservations
const {
    getReservations,
    getReservation,
    addReservation,
    updateReservation,
    deleteReservation
} = require('../controllers/reservations');

//มีการส่งต่อ parameters กันได้ (roomId จาก /rooms/:roomId/reservations)
const router = express.Router({ mergeParams: true });

//เพราะมีการตรวจสอบ roles และสถานะ (suspended) ของ user
const { protect, authorize, checkStatus } = require('../middleware/auth');

//ต้อง login ก่อนถึงจะใช้ได้ = protect
//ต้องเป็น role นี้ถึงจะเข้าได้ = authorize
//A11: suspended users cannot make or change reservations = checkStatus
router.route('/')
    .get(protect, getReservations)
    .post(protect, authorize('admin', 'user'), checkStatus, addReservation);

router.route('/:id')
    .get(protect, getReservation)
    .put(protect, authorize('admin', 'user'), checkStatus, updateReservation)
    .delete(protect, authorize('admin', 'user'), deleteReservation);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Reservation:
 *       type: object
 *       required:
 *         - reservationDate
 *       properties:
 *         id:
 *           type: string
 *         reservationDate:
 *           type: string
 *           format: date-time
 *           description: Start of the booked time slot
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: End of the booked time slot (default 1 hour after reservationDate)
 *         user:
 *           type: string
 *           description: Taken from the login token
 *         room:
 *           type: string
 *           description: Taken from the URL /rooms/{roomId}/reservations
 *       example:
 *         reservationDate: '2026-11-20T09:00:00+07:00'
 *         endDate: '2026-11-20T11:00:00+07:00'
 */

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Co-working space reservations
 */

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: My reservations (FR4), or every reservation for an admin (FR7)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservations sorted by start time
 *       401:
 *         description: Not logged in
 */

/**
 * @swagger
 * /rooms/{roomId}/reservations:
 *   get:
 *     summary: Reservations of one room (own ones for a user, all for an admin)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Reservations of the room
 *   post:
 *     summary: Reserve a co-working space (FR3 up to 3 active reservations, A4 must be available, A11 not suspended)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reservation'
 *     responses:
 *       201:
 *         description: Reserved
 *       400:
 *         description: Invalid or past time, outside opening hours, or already 3 active reservations
 *       403:
 *         description: The user is suspended
 *       404:
 *         description: Room not found
 *       409:
 *         description: The room is already booked at that time
 */

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Get one reservation (owner or admin)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: The reservation
 *       401:
 *         description: Not the owner
 *       404:
 *         description: Not found
 *   put:
 *     summary: Edit a reservation (FR5 owner, FR8 admin; A6 users must edit at least 1 hour before it begins)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reservationDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               room:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid time or outside opening hours
 *       401:
 *         description: Not the owner
 *       403:
 *         description: Less than 1 hour before the reservation begins, or the user is suspended
 *       409:
 *         description: The room is already booked at that time
 *   delete:
 *     summary: Delete a reservation (FR6 owner, FR9 admin; A7 users must delete at least 1 hour before it begins)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Not the owner
 *       403:
 *         description: Less than 1 hour before the reservation begins
 */
>>>>>>> Stashed changes
