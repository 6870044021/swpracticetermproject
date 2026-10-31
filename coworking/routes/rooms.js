const express = require('express');

const {getRooms, getRoom, createRoom, updateRoom, deleteRoom} = require('../controllers/rooms');

//ต้องเข้าถึงข้อมูลของ reservation ได้ผ่าน path ของ rooms ด้วย
//Include other resource routers
const reservationRouter = require('./reservations');
const reviewRouter = require('./reviews');
const noteRouter = require('./notes');

const router = express.Router();

const {protect, authorize} = require('../middleware/auth');

//Re-route into other resource routers
//ถ้ามี request มาจะอ้างอิงถึง path นี้
router.use('/:roomId/reservations/', reservationRouter);

router.use('/:roomId/reviews/', reviewRouter);

router.use('/:roomId/notes/', noteRouter);

//path ไหนที่ต้องการใช้ function protect ก็เติมเข้าไป
//protect ทำก่อน หลังจากนั้น createRoom
//Does not allow to create/update/delete room unless admin. Anyone can call getRooms.
router.route('/').get(getRooms).post(protect, authorize('admin'), createRoom);
router.route('/:id').get(getRoom).put(protect, authorize('admin'), updateRoom).delete(protect, authorize('admin'), deleteRoom);
module.exports = router;




/**
 * @swagger
 * components:
 *   schemas:
 *     Hospital:
 *       type: object
 *       required:
 *         - name
 *         - address
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The auto-generated id of the hospital
 *           example: 6ac243490c461a2997324f88
 *         ลำดับ:
 *           type: string
 *           description: Ordinal number
 *         name:
 *           type: string
 *           description: Hospital name
 *         address:
 *           type: string
 *           description: House No., Street, Road
 *         district:
 *           type: string
 *           description: District
 *         province:
 *           type: string
 *           description: province
 *         postalcode:
 *           type: string
 *           description: 5-digit postal code
 *         tel:
 *           type: string
 *           description: telephone number
 *         region:
 *           type: string
 *           description: region
 *       example:
 *         id: 6ac243490c461a2997324f88
 *         ลำดับ: 121
 *         name: Happy Hospital
 *         address: 121 ถ.สุขุมวิท
 *         district: บางนา
 *         province: กรุงเทพมหานคร
 *         postalcode: 10110
 *         tel: 02-2187000
 *         region: กรุงเทพมหานคร (Bangkok)
 */


/**
 * @swagger
 * tags:
 *   name: Hospitals
 *   description: The hospitals managing API
 */

/**
 * @swagger
 * /hospitals:
 *   get:
 *     summary: Returns the list of all the hospitals
 *     tags: [Hospitals]
 *     responses:
 *       200:
 *         description: The list of the hospitals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Hospital'
 */

/**
 * @swagger
 * /hospitals/{id}:
 *   get:
 *     summary: Get the hospital by id
 *     tags: [Hospitals]
 *     parameters:
 *       in: path
 *       name: id
 *       schema:
 *         type: string
 *       required: true
 *       description: The hospital id
 *     responses:
 *       200:
 *         description: The hospital description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       404:
 *         description: The hospital was not found
 */

/**
 * @swagger
 * /hospitals:
 *   post:
 *     summary: Create a new hospital
 *     tags: [Hospitals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hospital'
 *     responses:
 *       201:
 *         description: The hopsital was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       500:
 *         description: Some server error
 */

/**
 * @swagger
 * /hospitals/{id}:
 *   put:
 *     summary: Update the hospital by the id
 *     tags: [Hospitals]
 *     parameters:
 *       in: path
 *       name: id
 *       schema:
 *         type: string
 *       required: true
 *       description: The hospital id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hospital'
 *     responses:
 *       200:
 *         description: The hospital was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       404:
 *         description: The hospital was not found
 *       500:
 *         description: Some error happened
 */

/**
 * @swagger
 * /hospitals/{id}:
 *   delete:
 *     summary: Remove the hospital by id
 *     tags: [Hospitals]
 *     parameters:
 *       in: path
 *       name: id
 *       schema:
 *         type: string
 *       required: true
 *       description: The hospital id
 * 
 *     responses:
 *       200:
 *         description: The hospital was deleted
 *       404:
 *         description: The hospital was not found
 */