//require model ของ Reservation มาด้วย
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const Review = require('../models/Review');
const Note = require('../models/Note');

//@desc Get all notes
//@route GET /api/v1/notes
//@access Public

exports.getNotes = async(req,res,next)=>{
    //All users can only get their own notes. Even admins can't get other user's notes.
    let query;
    if (req.params.roomId){
            console.log(req.params.roomId);
            query = Note.find({room: req.params.roomId, user:req.user.id}).populate({
            path:'room',
            select:'name description address tel openCloseTimes'
         });
    }
    else{
            query = Note.find({user:req.user.id}).populate({
            //ให้ populate อะไร: room, เลือก fields ไหนมาบ้าง: name, province, tel
            path:'room',
            select:'name description address tel openCloseTimes'
        });
    }
    // //General user can see only their reviews
    // if (req.user.role !== 'admin'){

    //     query = Note.find({user:req.user.id}).populate({
    //         //ให้ populate อะไร: room, เลือก fields ไหนมาบ้าง: name, province, tel
    //         path:'room',
    //         select:'name province tel'
    //     });

    // }
    // else{
    //     //Admin can see all reservations
    //     if (req.params.roomlId){
    //         console.log(req.params.roomId);
    //         query = Note.find({room: req.params.roomId}).populate({
    //          path:'room',
    //          select:'name province tel'
    //      });
    //     }
    //     else{
    //          query = Note.find().populate({
    //          path:'room',
    //          select:'name province tel'
    //      });
    //     }

    // }
    try{
        //Execute query
        const notes = await query;

        res.status(200).json({
            success: true,
            count: notes.length,
            data: notes
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success: false, message:"Cannot find note"});
    }
};


//@desc Get single note
//@route GET /api/v1/notes/:id
//@access Public

exports.getNote = async(req,res,next)=>{
    try{
        const note = await Note.findById(req.params.id).populate({
            path: 'room',
            select: 'name description address tel openCloseTimes'
        });
        if (!note){
            return res.status(404).json({success:false,message:`No note with the id of ${req.params.id}`});

        }
        //User cannot get other user's notes even if they sedn the correct note id.
        if(note.user.toString() !== req.user.id/* && req.user.role !== 'admin'*/){
            return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to get this note`});
        }
        res.status(200).json({
            success:true,
            data:note
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot find Note"});
    }
}

//@desc Add note
//@route POST /api/v1/rooms/:roomId/notes/
//@access Private

exports.addNote = async(req,res,next)=>{
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
        const existedNote = await Note.find({user:req.user.id});
        //If the user is not an admin, they can only create 3 reservations.
        if (existedNote.length >= 3 && req.user.role !== 'admin'){
            return res.status(400).json({success:false,message:`The user with ID ${req.user.id} has already made 3 notes`});
        }


        //สร้าง reservation โดยใช้ method create ของ model reservation
        //โดยข้อมูลมาจาก request.body
        const note = await Note.create(req.body);
        res.status(201).json({
            success: true,
            data: note
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot create Note"});     
    }
}


//@desc Update note
//@route PUT /api/v1/notes/:id
//@access Private

exports.updateNote = async(req,res,next)=>{
    try{
        //ดูก่อนว่าที่จะ update อยู่ในฐานข้อมูลมั้ย?
        let note = await Note.findById(req.params.id);
        if (!note){
            return res.status(404).json({success:false, message:`No note with the id of ${req.params.id}`});

        }
        //Ownership
        //Make sure user is the reservation owner
        if(note.user.toString() !== req.user.id/* && req.user.role !== 'admin'*/){
            return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to update this note`});
        }

        note = await Note.findByIdAndUpdate(req.params.id, req.body,{new: true, runValidators: true});
        res.status(200).json({
            success:true,
            data:note
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot update Note"});
    }
}

//@desc Delete note
//@route DELETE /api/v1/notes/:id
//@access Private

exports.deleteNote = async(req,res,next)=>{
    try{
        const note = await Note.findById(req.params.id);
        if (!note){
            return res.status(404).json({success:false, message:`No note with the id of ${req.params.id}`});

        }

        //Ownership
        //Make sure user is the note owner
        if(note.user.toString() !== req.user.id/* && req.user.role !== 'admin'*/){
            return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to delete this note`});
        }


        await note.deleteOne();
        res.status(200).json({
            success:true,
            data:{}
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot delete Note"});
    }
}