const Room = require('../models/Room');

const Reservation = require('../models/Reservation');
const Note = require('../models/Note');




exports.getRooms = async (req,res,next)=>{
    try{

        let query;

        //Copy req.query มาแตกจาก string เป็น key-value array
        const reqQuery = {...req.query};

        //Fields to exclude
        //นำมาดูพวก greater than/less than ก่อน select/sort ยังไม่ต้องสน
        const removeFields = ['select', 'sort', 'page', 'limit'];

        //Loop over removeFields and delete them from reqQuery;
        removeFields.forEach(param=>delete reqQuery[param]);
        console.log(reqQuery);

        let queryStr = JSON.stringify(reqQuery);
        // regular expression (เขียน pattern ให้ match กับข้อความ)
        //Regular expression ต้องอยู่ใน / / 1 คู่
        // \b = boundary คร่อมหน้าหลัง (ดู้ฉพราะเป็นคำ ๆ)
        //เช่น {{URL}}/api/v1/rooms?province[lt]=Z
        // [] คือ boundary ก็จะเอาข้างใน boundary มา เจอ lt ก็เอามาเติม $ ข้างหน้า ให้เป็น NoSQL Syntax
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match=>`$${match}`);

        //สั่งให้ไปค้นหาข้อมูลตามเงื่อนไขที่มีใน query string แต่ยังไม่ execute
        //เติม reservations ของ room เข้าไปด้วย
        query = Room.find(JSON.parse(queryStr)).populate('reservations');

        //Select fields
        if(req.query.select){
            //เปลี่ยน comma เป็น space ให้ตรงกับ syntax ของ noSQL
            const fields = req.query.select.split(',').join(' ');
            //หลังจากกรองตาม gt/lt มาแล้วก็เลือก fields ที่ต้องการอีกทีนึง
            query = query.select(fields);

        }
        //Sort
        if(req.query.sort){
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        }
        else{
            //ถ้าไม่ส่งวิธีการ sort มา จะ default ไว้ที่ createdAt (เรียงตามเวลาสร้างข้อมูล)
            query=query.sort('-createdAt');
        }

        //Pagination
        //รับมาว่า query ต้องการแสดงข้อมูลหน้าไหน ถ้าไม่มีกำหนดก็ page = 1
        const page = parseInt(req.query.page,10) || 1;
        const limit = parseInt(req.query.limit,10) || 25;

        //ข้อมูลตัวแรก/ตัวสุดท้าย
        const startIndex = (page-1)*limit;
        const endIndex = page*limit;
        const total = await Room.countDocuments();

        //เช่น เริ่มตัวที่ 50 และไปหยิบมา 25 ตัว
        query = query.skip(startIndex).limit(limit);

        //มา execute ตรงนี้
        const rooms = await query;

        //Pagination result
        const pagination = {};
        //ดูว่าจากข้อมูลปัจจุบัน ถ้าไปหน้า prev/next คือหน้าอะไร
        if (endIndex<total){
            pagination.next={
                page:page+1,
                limit
            }
        }
        if(startIndex>0){
            pagination.prev={
                page:page-1,
                limit
            }
        }

        res.status(200).json({success:true, count:rooms.length, pagination, data:rooms});
    }
    catch(err){
        res.status(400).json({success:false});
    }
}



exports.getRoom = async (req,res,next)=>{
    try{
        const room = await Room.findById(req.params.id);
        if (!room){
            return res.status(400).json({success:false});
        }
        res.status(200).json({success:true,data:room});
    }
    catch(err){
        res.status(400).json({success:false});
    }
}



exports.createRoom = async(req,res,next)=>{
    const room = await Room.create(req.body);
    res.status(201).json({
        success: true,
        data: room
    });
}



exports.updateRoom = async (req,res,next)=>{
    try{
        const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!room){
            return res.status(400).json({success:false});
        }
        res.status(200).json({success:true,data:room});
    }
    catch(err){
        res.status(400).json({success:false});
    }
}



exports.deleteRoom = async (req,res,next)=>{
     try{
        //เพิ่ม cascade delete เปลี่ยนให้ดึง room id มาก่อน (อย่าเพิ่งลบ)
        const room = await Room.findById(req.params.id);
        if (!room){
            // return res.status(400).json({success:false});
            return res.status(404).json({success:false, message : `Room not found with id of ${req.params.id}`});
        }
        
        //ลบ reservations ที่เป็นของ room นั้งก่อนแล้วค่อยลบ room
        await Reservation.deleteMany({room: req.params.id});
        await Note.deleteMany({room: req.params.id});
        await Room.deleteOne({_id: req.params.id});
        res.status(200).json({success:true,data:{}});
    }
    catch(err){
        res.status(400).json({success:false});
    }
}