const express = require('express');

//ดึง method getReservations และ อื่น ๆ มาใช้จาก controllers ของ reservations
const {getNotes, getNote, addNote, updateNote, deleteNote} = require('../controllers/notes');

//มีการส่งต่อ parameters กันได้
const router = express.Router({mergeParams:true});

//เพราะมีการตรวจสอบ roles ของ user
const {protect,authorize} = require('../middleware/auth');

//ต้อง login ก่อนถึงจะใช้ได้ = protect
//ต้องเป็น role นี้ถึงจะเข้าได้ = authorize
router.route('/').get(protect, getNotes).post(protect, authorize('admin','user'), addNote);
//ไม่ protect
//เช่น ถ้าเป็น path มี id แล้วเป็น method delete ให้ไปที่ deleteReservation
router.route('/:id').get(protect, getNote).put(protect, authorize('admin','user'), updateNote).delete(protect, authorize('admin','user'), deleteNote);



module.exports = router;