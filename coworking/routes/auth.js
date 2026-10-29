//เดี๋ยวต้องใช้ method ต่างๆของ express
const express = require('express');
//require controller ของ authentication ด้วย
const {register, login, getMe, logout} = require('../controllers/auth');
//ตัวแปร router จะเป็นตัวรับ request เข้ามา
const router = express.Router();

const {protect} = require('../middleware/auth');

//ถ้า path เป็นของ register ก็ส่งต่อไปที่ register
router.post('/register', register);

//ถ้ามี request ที่เป็น post และมี path เป็น login ให้ส่งไปที่ login ที่สร้างขึ้นใน ../controllers/auth
router.post('/login', login);
//route ของ getMe ผ่าน function protect ก่อนไปที่ getMe
router.get('/me', protect, getMe);

router.get('/logout', logout);
//ยอมให้คนอื่นเรียกใช้ router
module.exports = router;