//Middleware ของ authentication
const jwt = require('jsonwebtoken');

//มีการเชื่อมต่อฐานข้อมูลดึงข้อมูล เลยต้องใช้ model ของ user ด้วย
const User = require('../models/User');

//Protect routes
//function ชื่อ protect ที่จะถูกเรียกใช้โดย router file อื่นๆ
//หลังจากมี request เข้ามาแล้ว path/route นี้ อนุญาตให้ user ใช้งานได้มั้ย? function นี้ตรวจสอบให้
exports.protect = async(req,res,next)=>{
    let token;
    //ตรวจสอบ header ของ request ในส่วน authorization ว่ามีการใส่ค่า bearer เข้ามามั้ย?
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        //Split ส่วน bearer ออกมา เฉพาะส่วนที่เป็น token
        //เวลาเก็บ: 'Bearer [ค่าของ token]' ดังนั้นถ้าจะเอาค่าของ token ต้องตัดคำว่า bearer กับเว้นวรรคทิ้งไป
        token = req.headers.authorization.split(' ')[1];
    }

    //Make sure token exists
    //เช็คว่า token ไม่ได้เป็นค่าว่าง
    if(!token || token=='null'){
        //เช่นกาณีไม่ได้ส่ง token มา ไม่รู้ว่าเป็นใคร ไม่ให้ใช้
        return res.status(401).json({success:false, message:'Not authorize to access this route'});
    }

    try{
        //Verify token กับ secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decoded);
        //นำ id ที่อยู่ใน decoded มาค้นหาใน database
        req.user = await User.findById(decoded.id);

        //ไปทำโค้ดของ next ต่อไป
        next();
    }
    catch(err){
        console.log(err.stack);
        return res.status(401).json({success:false, message:'Not authorize to access this route'});

    }
}

//Grant access to specific roles
//รับค่าเป็น roles ต่าง ๆ ที่สามารถใช้ request นี้ได้
exports.authorize=(...roles)=>{
    return (req,res,next)=>{
        //Check ว่า roles ที่อนุญาติให้ใช้ได้ในแต่ละ request ตรงกับ role ที่ user ได้ login เข้ามารึปล่าว
        if (!roles.includes(req.user.role)){
            return res.status(403).json({success: false, message: `User role ${req.user.role} is not authorized to access this route`});
        }
        next();
    }
}