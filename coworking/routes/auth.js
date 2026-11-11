//เดี๋ยวต้องใช้ method ต่างๆของ express
const express = require('express');
//require controller ของ authentication ด้วย
const {
    register,
    login,
    getMe,
    logout,
    changePassword,
    getPasswordHint,
    updatePasswordHint,
    suspendUser
} = require('../controllers/auth');
//ตัวแปร router จะเป็นตัวรับ request เข้ามา
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

//ถ้า path เป็นของ register ก็ส่งต่อไปที่ register
router.post('/register', register);
//ถ้ามี request ที่เป็น post และมี path เป็น login ให้ส่งไปที่ login ที่สร้างขึ้นใน ../controllers/auth
router.post('/login', login);
router.get('/logout', logout);
//route ของ getMe ผ่าน function protect ก่อนไปที่ getMe
router.get('/me', protect, getMe);
router.post('/changePassword', protect, changePassword);
router.route('/passwordhint').post(getPasswordHint).put(protect, updatePasswordHint);
//เฉพาะ admin เท่านั้นที่ suspend user ได้
router.post('/suspend', protect, authorize('admin'), suspendUser);

//ยอมให้คนอื่นเรียกใช้ router
module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Register, login, password and account status
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user (FR1, A1, A3)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, tel, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Worapakorn Jarusiriphot
 *               tel:
 *                 type: string
 *                 example: '0812345678'
 *               email:
 *                 type: string
 *                 example: pu@example.com
 *               password:
 *                 type: string
 *                 description: At least 8 characters with 1 lowercase letter, 1 uppercase letter and 1 number
 *                 example: Wota1234
 *               passwordHint:
 *                 type: string
 *                 example: my first co-working space
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       201:
 *         description: Registered; returns a JWT token
 *       400:
 *         description: Missing field, weak password, invalid telephone number or email already registered
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with email and password (FR2)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in; returns a JWT token
 *       400:
 *         description: Email or password missing
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Log out and clear the token cookie (FR2)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The current user
 *       401:
 *         description: Not logged in
 */

/**
 * @swagger
 * /auth/changePassword:
 *   post:
 *     summary: Change password by giving the old password (A2)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 description: Must follow the A1 password rules
 *               passwordHint:
 *                 type: string
 *                 description: Optional new hint
 *     responses:
 *       200:
 *         description: Password changed; returns a new JWT token
 *       400:
 *         description: Missing field, weak new password, or same as the old password
 *       401:
 *         description: Old password is incorrect
 */

/**
 * @swagger
 * /auth/passwordhint:
 *   post:
 *     summary: Get the password hint of an email (A3)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: The password hint
 *       404:
 *         description: Unknown email or no hint set
 *   put:
 *     summary: Add or change your password hint (A3)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, passwordHint]
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password, to confirm the change
 *               passwordHint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hint saved
 *       400:
 *         description: The hint contains the password
 *       401:
 *         description: Password is incorrect
 */

/**
 * @swagger
 * /auth/suspend:
 *   post:
 *     summary: Suspend a user for some days or indefinitely, or reactivate them (A9, admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, banType]
 *             properties:
 *               id:
 *                 type: string
 *                 description: The user id
 *               banType:
 *                 type: string
 *                 enum: [temporaryBan, permanentBan, active]
 *               banTime:
 *                 type: number
 *                 description: Days of a temporary ban (default 1)
 *     responses:
 *       200:
 *         description: User status changed
 *       400:
 *         description: Invalid id, banType or banTime
 *       403:
 *         description: Only admins can suspend users
 *       404:
 *         description: User not found
 */
