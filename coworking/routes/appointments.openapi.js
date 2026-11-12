/**
 * Swagger JSDoc only, like routes/hospitals.openapi.js. This file is NOT an Express router and is not
 * mounted with app.use(); swagger-jsdoc reads it through apis: ['./routes/*.js'].
 * Documents the VacQ appointment API kept from Assignment 7 (controllers/appointments.js).
 */

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: VacQ appointments kept from Assignment 7
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       required:
 *         - apptDate
 *       properties:
 *         _id:
 *           type: string
 *           example: 6aa4153f434d220e85991d4b
 *         apptDate:
 *           type: string
 *           format: date-time
 *           example: '2026-11-20T10:00:00+07:00'
 *         user:
 *           type: string
 *           description: Taken from the login token
 *         hospital:
 *           type: string
 *           description: Taken from the URL /hospitals/{hospitalId}/appointments
 */

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: Own appointments for a user, every appointment for an admin
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: The appointments
 *       '401':
 *         description: Not logged in
 */

/**
 * @swagger
 * /hospitals/{hospitalId}/appointments:
 *   get:
 *     summary: Appointments of one hospital (own ones for a user, all for an admin)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hospitalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: The appointments of the hospital
 *   post:
 *     summary: Add an appointment (a user may hold at most 3; admins are not limited)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hospitalId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Appointment'
 *     responses:
 *       '201':
 *         description: Appointment created
 *       '400':
 *         description: The user already has 3 appointments
 *       '404':
 *         description: Hospital not found
 */

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: Get one appointment (owner or admin)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: The appointment
 *       '401':
 *         description: Not the owner
 *       '404':
 *         description: Appointment not found
 *   put:
 *     summary: Update apptDate or hospital of an appointment (owner or admin)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apptDate:
 *                 type: string
 *                 format: date-time
 *               hospital:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Appointment updated
 *       '401':
 *         description: Not the owner
 *       '404':
 *         description: Appointment or hospital not found
 *   delete:
 *     summary: Delete an appointment (owner or admin)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Appointment deleted
 *       '401':
 *         description: Not the owner
 *       '404':
 *         description: Appointment not found
 */
