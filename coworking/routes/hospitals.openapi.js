/**
 * Swagger JSDoc only. This file is NOT an Express router and must NOT be mounted
 * using app.use(). swagger-jsdoc finds it with apis: ['./routes/*.js'].
 * Verify each request/response schema against the actual VacQ controllers.
 */

/**
 * @swagger
 * tags:
 *   name: Hospitals
 *   description: The hospitals managing API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Hospital:
 *       type: object
 *       required:
 *         - name
 *         - address
 *         - district
 *         - province
 *         - postalcode
 *         - region
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId (when returned by the backend)
 *           example: 609bda561452242d88d36e37
 *         name:
 *           type: string
 *           description: Hospital name
 *           example: Happy Hospital
 *         address:
 *           type: string
 *           description: House No., Street, Road
 *           example: 121 Sukhumvit Road
 *         district:
 *           type: string
 *           description: District
 *           example: Bang Na
 *         province:
 *           type: string
 *           description: Province
 *           example: Bangkok
 *         postalcode:
 *           type: string
 *           description: Five-digit postal code
 *           example: '10110'
 *         tel:
 *           type: string
 *           description: Telephone number
 *           example: 02-2187000
 *         region:
 *           type: string
 *           description: Region
 *           example: Bangkok
 *     HospitalPayload:
 *       type: object
 *       required:
 *         - name
 *         - address
 *         - district
 *         - province
 *         - postalcode
 *         - region
 *       properties:
 *         name:
 *           type: string
 *           example: Happy Hospital
 *         address:
 *           type: string
 *           example: 121 Sukhumvit Road
 *         district:
 *           type: string
 *           example: Bang Na
 *         province:
 *           type: string
 *           example: Bangkok
 *         postalcode:
 *           type: string
 *           example: '10110'
 *         tel:
 *           type: string
 *           example: 02-2187000
 *         region:
 *           type: string
 *           example: Bangkok
 *     HospitalListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           example: 1
 *         pagination:
 *           type: object
 *           description: Pagination information
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Hospital'
 *     HospitalResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Hospital'
 */

/**
 * @swagger
 * /hospitals:
 *   get:
 *     summary: Returns the list of all the hospitals
 *     tags: [Hospitals]
 *     responses:
 *       '200':
 *         description: A successful response containing the hospitals
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HospitalListResponse'
 */

/**
 * @swagger
 * /hospitals/{id}:
 *   get:
 *     summary: Get one hospital by ID
 *     tags: [Hospitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The hospital ID
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: The requested hospital
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HospitalResponse'
 *       '400':
 *         description: Invalid hospital ID or hospital not found
 */

/**
 * @swagger
 * /hospitals:
 *   post:
 *     summary: Add one hospital
 *     tags: [Hospitals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HospitalPayload'
 *     responses:
 *       '201':
 *         description: Hospital created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HospitalResponse'
 *       '400':
 *         description: Invalid request data
 */

/**
 * @swagger
 * /hospitals/{id}:
 *   put:
 *     summary: Update one hospital by ID
 *     tags: [Hospitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The hospital ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HospitalPayload'
 *     responses:
 *       '200':
 *         description: Hospital updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HospitalResponse'
 *       '404':
 *         description: Hospital not found
 */

/**
 * @swagger
 * /hospitals/{id}:
 *   delete:
 *     summary: Delete one hospital by ID
 *     tags: [Hospitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The hospital ID
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Hospital deleted
 *       '404':
 *         description: Hospital not found
 */
