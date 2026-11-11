const express = require('express');

const { getReviews, getReview, addReview, updateReview, deleteReview } = require('../controllers/reviews');

//มีการส่งต่อ parameters กันได้ (roomId จาก /rooms/:roomId/reviews)
const router = express.Router({ mergeParams: true });

const { protect, authorize, checkStatus } = require('../middleware/auth');

//A11: suspended users cannot leave or edit reviews = checkStatus
router.route('/')
    .get(protect, getReviews)
    .post(protect, authorize('admin', 'user'), checkStatus, addReview);

router.route('/:id')
    .get(protect, getReview)
    .put(protect, authorize('admin', 'user'), checkStatus, updateReview)
    .delete(protect, authorize('admin', 'user'), deleteReview);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - reviewData
 *       properties:
 *         reviewData:
 *           type: string
 *         anonymousReview:
 *           type: boolean
 *           description: Opt in to hide your name (A12), default false
 *         reviewerName:
 *           type: string
 *           description: Anonymous for anonymous reviews
 *         pastBookings:
 *           type: integer
 *           description: How many bookings the reviewer has completed (A5)
 *         pastBookingsInThisRoom:
 *           type: integer
 *       example:
 *         reviewData: Quiet, fast Wi-Fi and plenty of power plugs
 *         anonymousReview: false
 */

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Reviews of co-working spaces
 */

/**
 * @swagger
 * /rooms/{roomId}/reviews:
 *   get:
 *     summary: Reviews of a room with each reviewer's past bookings (A5); excludeAnonymous=true hides anonymous ones (A13)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: excludeAnonymous
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: The reviews
 *       404:
 *         description: Room not found
 *   post:
 *     summary: Review a room (A5); 1 review per room (A10); suspended users cannot review (A11)
 *     tags: [Reviews]
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
 *             $ref: '#/components/schemas/Review'
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Already reviewed this room, or missing reviewData
 *       403:
 *         description: The user is suspended
 */

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: All reviews (excludeAnonymous=true hides anonymous ones)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The reviews
 */

/**
 * @swagger
 * /reviews/{id}:
 *   get:
 *     summary: Get one review
 *     tags: [Reviews]
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
 *         description: The review
 *       404:
 *         description: Not found
 *   put:
 *     summary: Edit your review (author or admin)
 *     tags: [Reviews]
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
 *             $ref: '#/components/schemas/Review'
 *     responses:
 *       200:
 *         description: Updated
 *       401:
 *         description: Not the author
 *   delete:
 *     summary: Delete your review (author or admin)
 *     tags: [Reviews]
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
 *         description: Not the author
 */
