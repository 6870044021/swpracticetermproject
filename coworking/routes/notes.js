const express = require('express');
<<<<<<< Updated upstream
const c = require('../controllers/notes');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');
const router = express.Router({ mergeParams: true });
router.use(protect);
router.route('/').get(asyncHandler(c.getNotes)).post(asyncHandler(c.addNote));
router.route('/:id').get(asyncHandler(c.getNote)).put(asyncHandler(c.updateNote)).delete(asyncHandler(c.deleteNote));
module.exports = router;
=======

const { getNotes, getNote, addNote, updateNote, deleteNote } = require('../controllers/notes');

//มีการส่งต่อ parameters กันได้ (roomId จาก /rooms/:roomId/notes)
const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

//A8: every note route needs login; controllers only ever return the caller's own notes
router.route('/')
    .get(protect, getNotes)
    .post(protect, authorize('admin', 'user'), addNote);

router.route('/:id')
    .get(protect, getNote)
    .put(protect, authorize('admin', 'user'), updateNote)
    .delete(protect, authorize('admin', 'user'), deleteNote);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Note:
 *       type: object
 *       required:
 *         - noteData
 *       properties:
 *         noteData:
 *           type: string
 *           description: Personal note about the room, visible only to its owner (A8)
 *       example:
 *         noteData: Sit by the window, the plug under the desk works
 */

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Personal notes on co-working spaces (A8)
 */

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: My notes
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Only the caller's own notes
 */

/**
 * @swagger
 * /rooms/{roomId}/notes:
 *   get:
 *     summary: My note for a room
 *     tags: [Notes]
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
 *         description: Only the caller's own notes
 *   post:
 *     summary: Assign a personal note to a room (one note per room)
 *     tags: [Notes]
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
 *             $ref: '#/components/schemas/Note'
 *     responses:
 *       201:
 *         description: Note created
 *       400:
 *         description: You already have a note for this room
 */

/**
 * @swagger
 * /notes/{id}:
 *   get:
 *     summary: Get my note
 *     tags: [Notes]
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
 *         description: The note
 *       401:
 *         description: Not your note
 *   put:
 *     summary: Edit my note
 *     tags: [Notes]
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
 *             $ref: '#/components/schemas/Note'
 *     responses:
 *       200:
 *         description: Updated
 *       401:
 *         description: Not your note
 *   delete:
 *     summary: Delete my note
 *     tags: [Notes]
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
 *         description: Not your note
 */
>>>>>>> Stashed changes
