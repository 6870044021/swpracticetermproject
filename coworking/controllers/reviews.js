//require model ของ Reservation มาด้วย
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const Review = require('../models/Review');

//@desc Get all reviews
//@route GET /api/v1/reviews
//@access Public

exports.getReviews = async(req,res,next)=>{
    let query;
    
    req.body.room=req.params.roomId;
    const room = await Room.findById(req.params.roomId);

    const includeAnonymous = true;

    //Room not specified, gets all reviews
    if (!room){
        query = Review.find().populate({
             path:'room',
             select:'name description address tel openCloseTimes'
         });
    // //General user can see only their reviews
    // if (req.user.role !== 'admin'){

    //     query = Review.find({user:req.user.id}).populate({
    //         //ให้ populate อะไร: room, เลือก fields ไหนมาบ้าง: name, province, tel
    //         path:'room',
    //         select:'name description address tel openCloseTimes'
    //     });

    // }
    // else{
    //     //Admin can see all reviews
    //     if (req.params.roomlId){
    //         console.log(req.params.roomId);
    //         query = Review.find({room: req.params.roomId}).populate({
    //          path:'room',
    //          select:'name description address tel openCloseTimes'
    //      });
    //     }
    //     else{
             
    //     }

    // }
    }
    else{
        //Room specified. Gets reviews for that room.
         query = Review.find({room: req.params.roomId}).populate({
             path:'room',
             select:'name description address tel openCloseTimes'
             });
    }
    try{
        //Execute query
        const reviews = await query;
        console.log(reviews);
        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success: false, message:"Cannot find review"});
    }
};


// //@desc Get all reviews for a room
// //@route GET /api/v1/rooms/:roomId/reviews/
// //@access Public

// exports.getRoomReview = async(req,res,next)=>{}


//@desc Get single reservation
//@route GET /api/v1/reservations/:id
//@access Public

exports.getReview = async(req,res,next)=>{
    try{
        const review = await Review.findById(req.params.id).populate({
            path: 'room',
            select: 'name description tel'
        });
        if (!review){
            return res.status(404).json({success:false,message:`No review with the id of ${req.params.id}`});

        }
        res.status(200).json({
            success:true,
            data:review
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot find Review"});
    }
}

//@desc Add reservation
//@route POST /api/v1/rooms/:roomId/reviews/
//@access Private

exports.addReview = async(req,res,next)=>{
    try{
        req.body.room=req.params.roomId;
        const room = await Room.findById(req.params.roomId);
        if (!room){
            return res.status(404).json({success:false,message:`No room with the id of ${req.params.roomId}`});
        }

        //Reservation ownership
        //Add user id to req.body
        //User จะใส่ id อะไรมาก็แล้วแต่ จะเอา id มาจาก req.user.id อยู่ดี
        req.body.user = req.user.id;
        //Check for existed reservation
        const existedReview = await Review.find({user:req.user.id, room:req.params.roomId});
        //If the user is not an admin, they can only create 3 reservations.
        if (existedReview.length >= 1){
            return res.status(400).json({success:false,message:`The user with ID ${req.user.id} has already made a review for room ${req.params.roomId}. Please delete the old review first or edit it instead.`});
        }


        //สร้าง reservation โดยใช้ method create ของ model reservation
        //โดยข้อมูลมาจาก request.body
        const review = await Review.create(req.body);
        res.status(201).json({
            success: true,
            data: review
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot create Review"});     
    }
}


//@desc Update reservation
//@route PUT /api/v1/reservations/:id
//@access Private

exports.updateReview = async(req,res,next)=>{
    try{
        //ดูก่อนว่าที่จะ update อยู่ในฐานข้อมูลมั้ย?
        let review = await Review.findById(req.params.id);
        if (!review){
            return res.status(404).json({success:false, message:`No review with the id of ${req.params.id}`});

        }
        //Ownership
        //Make sure user is the reservation owner or admin
        if(review.user.toString() !== req.user.id && req.user.role !== 'admin'){
            return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to update this review`});
        }

        review = await Review.findByIdAndUpdate(req.params.id, req.body,{new: true, runValidators: true});
        res.status(200).json({
            success:true,
            data:review
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot update Review"});
    }
}

//@desc Delete reservation
//@route DELETE /api/v1/reservations/:id
//@access Private

exports.deleteReview = async(req,res,next)=>{
    try{
        const review = await Review.findById(req.params.id);
        if (!review){
            return res.status(404).json({success:false, message:`No review with the id of ${req.params.id}`});

        }

        //Ownership
        //Make sure user is the reservation owner or admin
        if(review.user.toString() !== req.user.id && req.user.role !== 'admin'){
            return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to delete this review`});
        }


        await review.deleteOne();
        res.status(200).json({
            success:true,
            data:{}
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot delete Review"});
    }
}