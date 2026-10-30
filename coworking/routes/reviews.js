const express = require('express');

//ดึง method getReservations และ อื่น ๆ มาใช้จาก controllers ของ reservations
const {getReviews, getReview, addReview, updateReview, deleteReview} = require('../controllers/reviews');

//มีการส่งต่อ parameters กันได้
const router = express.Router({mergeParams:true});

//เพราะมีการตรวจสอบ roles ของ user
const {protect,authorize} = require('../middleware/auth');

//ต้อง login ก่อนถึงจะใช้ได้ = protect
//ต้องเป็น role นี้ถึงจะเข้าได้ = authorize
router.route('/').get(protect, getReviews).post(protect, authorize('admin','user'), addReview);
//ไม่ protect
//เช่น ถ้าเป็น path มี id แล้วเป็น method delete ให้ไปที่ deleteReservation
router.route('/:id').get(protect, getReview).put(protect, authorize('admin','user'), updateReview).delete(protect, authorize('admin','user'), deleteReview);



module.exports = router;