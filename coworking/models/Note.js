const mongoose =require('mongoose');
const { deleteRoom } = require('../controllers/rooms');

//สร้าง ReviewSchema โดยใช้ Schema ของ mongoose
const NoteSchema=new mongoose.Schema({
    //Review ประกอบด้วย field อะไรบ้าง?
    noteDate:{
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
     noteData:{
        type: String,
        required: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
});

module.exports=mongoose.model('Note', NoteSchema);
