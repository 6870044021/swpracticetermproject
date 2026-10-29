const mongoose =require('mongoose');
const { deleteRoom } = require('../controllers/rooms');

//สร้าง ReservationSchema โดยใช้ Schema ของ mongoose
const ReservationSchema=new mongoose.Schema({
    //Reservation ประกอบด้วย field อะไรบ้าง?
    reservationDate:{
        type: Date,
        required: true
    },
    user:{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    room:{
        type: mongoose.Schema.ObjectId,
        ref: 'Room',
        required: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
});

module.exports=mongoose.model('Reservation', ReservationSchema);
