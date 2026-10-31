const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
name: {
    type: String,
    required: [true, 'Please add a name'],
    unique: true,
    trim: true,
    maxLength:[100,'Name can not be more than 100 characters']
},
description:{
    type: String,
    required:[true, 'Please add a description']
},
address:{
    type: String,
    required:[true, 'Please add an address']
},
tel:{
    type: String,
    required:[true, 'Please add a telephone number']
},
openCloseTimes:{
    type: String,
    required:[true, 'Please add open-close timese'],
}
},
{
    //แทรก virtual
    toJSON: {virtuals:true},
    toObjects: {virtuals:true}

});

//Reverse populate with virtuals
//แทรกข้อมูล reservations เข้าไป
RoomSchema.virtual('reservations',{
    ref:'Reservation',
    localField:'_id',
    foreignField:'room',
    justOne:false
});

RoomSchema.virtual('reviews',{
    ref:'Review',
    localField:'_id',
    foreignField:'room',
    justOne:false
});

RoomSchema.virtual('notes',{
    ref:'Note',
    localField:'_id',
    foreignField:'room',
    justOne:false
});

module.exports = mongoose.model('Room', RoomSchema);