//ต้องใช้ข้อมูลของ user
const User = require('../models/User');



//@desc Register User
//@route POST /api/v1/auth/register
//@access Public

//สร้าง function register และ export ให้ไฟล์อื่นเรียกใช้ได้
exports.register= async(req,res,next)=>{
    try{
        //นำค่าจาก request.body มาใช้ โดยแตกแต่ละ key value เป็นตัวแปร
        const {name, email, password, tel, passwordHint, role} = req.body;

        //Create user. สร้าง object จาก user model
        const user = await User.create({
            name, email, password, role, tel, passwordHint
        });
        //Create token
        sendTokenResponse(user,201,res);
    }
    catch(err){
        res.status(400).json({success:false});
        console.log(err.stack);
    }
}

//@desc Login User
//@route POST /api/v1/auth/login
//@access Public

//ต้องมีการเชื่อมต้อกับ database เลยเป็น async
exports.login=async(req,res,next)=>{

    try{
    //รับค่าจาก request.body เอามาแตกเป็น email กับ password
    const {email,password} = req.body;

    //Validate email & password (เช็คค่าว่าง)
    if (!email || !password){
        return res.status(400).json({success:false, message:'Please provide an email and password'});

    }
    //Check for user ค้นหาโดยใช้ email และ select password ที่ตรงกันมาด้วย
    const user = await User.findOne({email}).select('+password');

    //กรณีไม่เจอ user
    if (!user){
        return res.status(400).json({success:false, message:'Invalid credentials'});    
    }

    //Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch){
         return res.status(401).json({success:false, message:'Invalid credentials'});       
    }

    //Create token

    //ส่ง token กลับไปให้ client ผ่านทาง response.

    sendTokenResponse(user,200,res);
    }
    catch(err){
        return res.status(401).json({success:false, msg:'Cannot convert email or password to string'});
    }
}

//Get token from model, create cookie and send response
const sendTokenResponse=(user, statusCode, res)=>{
    //Create token.
    const token=user.getSignedJwtToken();

    //Set option ให้ cookie และแปลงจาก day เป็น millisecond 
    const options={
        expires: new Date(Date.now()+process.env.JWT_COOKIE_EXPIRE*24*60*60*1000), httpOnly: true
    };

    if (process.env.NODE_ENV === 'production'){
        options.secure = true;
    }
    //set cookie ให้ใช้ตัว token พร้อมส่ง option จากที่สร้างไว้ข้างบน แล้วก็ส่ง JSON พร้อม token ไว้แสดง
    res.status(statusCode)/*.cookie('token', token, options)*/.json({
        success:true,
        //Add for frontend
        _id:user._id,
        name:user.name,
        email:user.email,
        //End for frontend
        token
    })
}

//@desc Get the current logged in user
//@route POST /api/v1/auth/me
//@access Private


//function ที่ใช้ดูข้อมูลว่าเราเป็นใคร
exports.getMe = async(req,res,next)=>{
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        data: user
    });
};


//@desc Log user out / clear cookie
//@route GET /api/v1/auth/logout
//@access Private
exports.logout = async(req,res,next)=>{
    //ใน cookie set ให้ token เป็น none
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10*1000),
        httpOnly:true
    });

    res.status(200).json({
        success:true,
        data:{}
    });
};