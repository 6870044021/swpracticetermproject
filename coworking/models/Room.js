const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
name: {
    type: String,
    required: [true, 'Please add a name'],
    unique: true,
    trim: true,
    maxLength:[50,'Name can not be more than 50 characters']
},
address:{
    type: String,
    required:[true, 'Please add an address']
},
district:{
    type: String,
    required:[true, 'Please add a district']
},
province:{
    type: String,
    required:[true, 'Please add a province']
},
postalcode:{
    type: String,
    required:[true, 'Please add a postalCode'],
    maxLength:[5,'Postal Code can not be more than 50 digits']
},
tel:{
    type: String
},
region:{
    type: String,
    required:[true, 'Please add a region']
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

module.exports = mongoose.model('Room', RoomSchema);