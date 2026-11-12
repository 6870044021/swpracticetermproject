//Middleware ของ authentication
const jwt = require('jsonwebtoken');

//มีการเชื่อมต่อฐานข้อมูลดึงข้อมูล เลยต้องใช้ model ของ user ด้วย
const User = require('../models/User');

const notAuthorized = (res) =>
    res.status(401).json({ success: false, message: 'Not authorize to access this route' });

//Protect routes
//function ชื่อ protect ที่จะถูกเรียกใช้โดย router file อื่นๆ
//หลังจากมี request เข้ามาแล้ว path/route นี้ อนุญาตให้ user ใช้งานได้มั้ย? function นี้ตรวจสอบให้
exports.protect = async (req, res, next) => {
    let token;
    //ตรวจสอบ header ของ request ในส่วน authorization ว่ามีการใส่ค่า bearer เข้ามามั้ย?
    //เวลาเก็บ: 'Bearer [ค่าของ token]' ดังนั้นถ้าจะเอาค่าของ token ต้องตัดคำว่า bearer กับเว้นวรรคทิ้งไป
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    //Cookie fallback (as in Assignment 7/10): login sets the token cookie and logout replaces it with 'none'
    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    //Make sure token exists (Postman sets TOKEN to null after logout)
    if (!token || token === 'null' || token === 'none') {
        return notAuthorized(res);
    }

    try {
        //Verify token กับ secret แล้วนำ id ที่อยู่ใน token มาค้นหาใน database
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        // The token can outlive its user (e.g. the user was deleted from the database).
        if (!req.user) {
            return notAuthorized(res);
        }

        //ไปทำโค้ดของ next ต่อไป
        next();
    } catch (err) {
        return notAuthorized(res);
    }
};

//Grant access to specific roles
//รับค่าเป็น roles ต่าง ๆ ที่สามารถใช้ request นี้ได้
exports.authorize = (...roles) => {
    return (req, res, next) => {
        //Check ว่า roles ที่อนุญาตให้ใช้ได้ในแต่ละ request ตรงกับ role ที่ user ได้ login เข้ามารึเปล่า
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// A11: suspended users cannot make reservations or leave reviews.
// Use after protect, e.g. router.post('/', protect, authorize('admin','user'), checkStatus, addReview)
exports.checkStatus = async (req, res, next) => {
    const user = req.user;

    // A temporary ban that has already ended is lifted automatically.
    if (user.userStatus === 'temporaryBan' && user.banUntil && user.banUntil.getTime() <= Date.now()) {
        await User.updateOne({ _id: user._id }, { userStatus: 'active', $unset: { banUntil: 1 } });
        user.userStatus = 'active';
        user.banUntil = undefined;
        return next();
    }

    if (user.isSuspended()) {
        const permanent = user.userStatus === 'permanentBan';
        return res.status(403).json({
            success: false,
            message: permanent
                ? 'Your account is permanently suspended. You cannot make reservations or leave reviews.'
                : `Your account is suspended until ${user.banUntil ? user.banUntil.toISOString() : 'further notice'}. You cannot make reservations or leave reviews.`,
            userStatus: user.userStatus,
            banUntil: permanent ? null : user.banUntil || null
        });
    }

    next();
};
