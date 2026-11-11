const express = require('express');
<<<<<<< Updated upstream
const c = require('../controllers/rooms');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');
const router = express.Router();
router.use('/:roomId/reservations', require('./reservations'));
router.use('/:roomId/reviews', require('./reviews'));
router.use('/:roomId/notes', require('./notes'));
router.route('/').get(asyncHandler(c.getRooms)).post(protect, authorize('admin'), asyncHandler(c.createRoom));
router.route('/:id').get(asyncHandler(c.getRoom)).put(protect, authorize('admin'), asyncHandler(c.updateRoom)).delete(protect, authorize('admin'), asyncHandler(c.deleteRoom));
module.exports = router;
=======

const {
    getRooms,
    getRoom,
    getRoomAvailability,
    createRoom,
    updateRoom,
    deleteRoom
} = require('../controllers/rooms');

//ต้องเข้าถึงข้อมูลของ reservation / review / note ได้ผ่าน path ของ rooms ด้วย
//Include other resource routers
const reservationRouter = require('./reservations');
const reviewRouter = require('./reviews');
const noteRouter = require('./notes');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

//Re-route into other resource routers
//ถ้ามี request มาจะอ้างอิงถึง path นี้
router.use('/:roomId/reservations', reservationRouter);
router.use('/:roomId/reviews', reviewRouter);
router.use('/:roomId/notes', noteRouter);

//Anyone can view rooms and their availability. Only admins can create/update/delete rooms.
router.route('/').get(getRooms).post(protect, authorize('admin'), createRoom);
router.get('/:id/availability', getRoomAvailability);
router.route('/:id').get(getRoom).put(protect, authorize('admin'), updateRoom).delete(protect, authorize('admin'), deleteRoom);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - address
 *         - tel
 *         - openCloseTimes
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the co-working space
 *           example: 6a95572c7a321f6197c642fa
 *         name:
 *           type: string
 *           description: Co-working space (room) name, unique
 *         description:
 *           type: string
 *         address:
 *           type: string
 *         tel:
 *           type: string
 *           description: Telephone number
 *         openCloseTimes:
 *           type: string
 *           description: Opening hours in HH:mm-HH:mm (UTC+07:00); 00:00-24:00 means 24 hours
 *       example:
 *         name: WoTA Siam Room 1
 *         description: Quiet room for 6 people with a whiteboard
 *         address: 254 Phayathai Road, Pathumwan, Bangkok 10330
 *         tel: 02-218-6956
 *         openCloseTimes: 08:00-20:00
 */

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: The co-working spaces (rooms)
 */

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: List co-working spaces with filter, select, sort and pagination
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         example: name,address,tel,openCloseTimes
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         example: name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The list of co-working spaces
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid filter, select, sort, page or limit
 *   post:
 *     summary: Create a co-working space (admin)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: The co-working space was created
 *       400:
 *         description: Missing field, duplicate name or invalid openCloseTimes
 *       403:
 *         description: Only admins can create rooms
 */

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Get a co-working space by id
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: The co-working space, with its booked time slots
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       404:
 *         description: The co-working space was not found
 *   put:
 *     summary: Update a co-working space (admin)
 *     tags: [Rooms]
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
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       200:
 *         description: The co-working space was updated
 *       404:
 *         description: The co-working space was not found
 *   delete:
 *     summary: Delete a co-working space and its reservations, reviews and notes (admin)
 *     tags: [Rooms]
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
 *         description: The co-working space was deleted
 *       404:
 *         description: The co-working space was not found
 */

/**
 * @swagger
 * /rooms/{id}/availability:
 *   get:
 *     summary: Booked and free time slots of a co-working space on one day (A4)
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         example: '2026-11-20'
 *     responses:
 *       200:
 *         description: Opening hours, booked slots and free slots of the day
 *       400:
 *         description: date is not in YYYY-MM-DD format
 *       404:
 *         description: The co-working space was not found
 */
>>>>>>> Stashed changes
