//ต้องใช้ข้อมูลของ user
const User = require('../models/User');
const { isStrongPassword, hintRevealsPassword, PASSWORD_RULE_MESSAGE } = require('../utils/password');
const { sendError } = require('../utils/errors');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    //Create token.
    const token = user.getSignedJwtToken();

    //Set option ให้ cookie และแปลงจาก day เป็น millisecond
    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }
    //set cookie ให้ใช้ตัว token พร้อมส่ง option จากที่สร้างไว้ข้างบน แล้วก็ส่ง JSON พร้อม token ไว้แสดง
    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        //Add for frontend
        _id: user._id,
        name: user.name,
        email: user.email,
        //End for frontend
        token
    });
};

//@desc     Register user (FR1, A1, A3)
//@route    POST /api/v1/auth/register
//@access   Public
exports.register = async (req, res, next) => {
    try {
        //นำค่าจาก request.body มาใช้ โดยแตกแต่ละ key value เป็นตัวแปร
        const { name, email, password, tel, passwordHint, role } = req.body;

        // A3: the hint must not give the password away
        if (hintRevealsPassword(passwordHint, password)) {
            return res.status(400).json({ success: false, message: 'Password hint must not contain the password' });
        }

        //Create user. สร้าง object จาก user model (A1: password strength is validated by the model)
        const user = await User.create({ name, email, password, role, tel, passwordHint });

        //Create token
        sendTokenResponse(user, 201, res);
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(400).json({ success: false, message: 'This email is already registered' });
        }
        return sendError(res, err, 'Cannot register user');
    }
};

//@desc     Login user (FR2)
//@route    POST /api/v1/auth/login
//@access   Public
exports.login = async (req, res, next) => {
    try {
        //รับค่าจาก request.body เอามาแตกเป็น email กับ password
        const { email, password } = req.body;

        //Validate email & password (เช็คค่าว่าง)
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide an email and password' });
        }

        // NoSQL injection guard, e.g. {"email": {"$gt": ""}}
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(401).json({ success: false, message: 'Cannot convert email or password to string' });
        }

        //Check for user ค้นหาโดยใช้ email และ select password ที่ตรงกันมาด้วย
        const user = await User.findOne({ email }).select('+password');

        //Same answer for an unknown email and a wrong password, so emails cannot be guessed
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        //ส่ง token กลับไปให้ client ผ่านทาง response.
        sendTokenResponse(user, 200, res);
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Cannot convert email or password to string' });
    }
};

//@desc     Log user out / clear cookie (FR2)
//@route    GET /api/v1/auth/logout
//@access   Private
exports.logout = async (req, res, next) => {
    //ใน cookie set ให้ token เป็น none
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({ success: true, data: {} });
};

//@desc     Get the current logged in user
//@route    GET /api/v1/auth/me
//@access   Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        return sendError(res, err, 'Cannot get user');
    }
};

//@desc     Change password by specifying the old password (A2, A1 rules apply to the new password)
//@route    POST /api/v1/auth/changePassword
//@access   Private
exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, passwordHint } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide oldPassword and newPassword' });
        }
        if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ success: false, message: 'oldPassword and newPassword must be strings' });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ success: false, message: PASSWORD_RULE_MESSAGE });
        }
        if (oldPassword === newPassword) {
            return res.status(400).json({ success: false, message: 'New password must be different from the old password' });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        //Check if the old password matches
        if (!(await user.matchPassword(oldPassword))) {
            return res.status(401).json({ success: false, message: 'Old password is incorrect' });
        }

        const hint = passwordHint !== undefined ? passwordHint : user.passwordHint;
        if (hintRevealsPassword(hint, newPassword)) {
            return res.status(400).json({ success: false, message: 'Password hint must not contain the password' });
        }

        // save() runs the model validators and the pre('save') hook that hashes the password
        user.password = newPassword;
        if (passwordHint !== undefined) {
            user.passwordHint = passwordHint;
        }
        await user.save({ validateModifiedOnly: true });

        sendTokenResponse(user, 200, res);
    } catch (err) {
        return sendError(res, err, 'Cannot change password');
    }
};

//@desc     Get the password hint of an account (A3)
//@route    POST /api/v1/auth/passwordhint
//@access   Public
exports.getPasswordHint = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!isNonEmptyString(email)) {
            return res.status(400).json({ success: false, message: 'Please provide an email' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No user with that email' });
        }
        if (!user.passwordHint) {
            return res.status(404).json({ success: false, message: 'This account has no password hint' });
        }

        res.status(200).json({ success: true, data: { email: user.email, passwordHint: user.passwordHint } });
    } catch (err) {
        return sendError(res, err, 'Cannot get password hint');
    }
};

//@desc     Add or change the password hint, confirmed with the current password (A3)
//@route    PUT /api/v1/auth/passwordhint
//@access   Private
exports.updatePasswordHint = async (req, res, next) => {
    try {
        const { password, passwordHint } = req.body;
        if (typeof password !== 'string' || !password || typeof passwordHint !== 'string') {
            return res.status(400).json({ success: false, message: 'Please provide your current password and the new passwordHint' });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Password is incorrect' });
        }
        if (hintRevealsPassword(passwordHint, password)) {
            return res.status(400).json({ success: false, message: 'Password hint must not contain the password' });
        }

        user.passwordHint = passwordHint;
        await user.save({ validateModifiedOnly: true });

        res.status(200).json({ success: true, data: { email: user.email, passwordHint: user.passwordHint } });
    } catch (err) {
        return sendError(res, err, 'Cannot update password hint');
    }
};

//@desc     Suspend a user for some days or indefinitely, or lift the suspension (A9)
//@route    POST /api/v1/auth/suspend   body: { id, banType: temporaryBan|permanentBan|active, banTime: days }
//@access   Private (admin)
exports.suspendUser = async (req, res, next) => {
    try {
        const { id, banType, banTime } = req.body;

        if (!isNonEmptyString(id)) {
            return res.status(400).json({ success: false, message: 'Please specify the id of the user' });
        }
        if (!['temporaryBan', 'permanentBan', 'active'].includes(banType)) {
            return res.status(400).json({
                success: false,
                message: 'Please specify a correct banType: temporaryBan, permanentBan or active'
            });
        }
        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot suspend your own account' });
        }

        const target = await User.findById(id);
        if (!target) {
            return res.status(404).json({ success: false, message: `No user with the id of ${id}` });
        }
        if (target.role === 'admin' && banType !== 'active') {
            return res.status(400).json({ success: false, message: 'An admin account cannot be suspended' });
        }

        let update;
        let message;
        if (banType === 'temporaryBan') {
            //Default ban is 1 day
            const banDays = banTime === undefined || banTime === null || banTime === '' ? 1 : Number(banTime);
            if (!Number.isFinite(banDays) || banDays <= 0 || banDays > 3650) {
                return res.status(400).json({ success: false, message: 'banTime must be a number of days between 0 and 3650' });
            }
            update = { userStatus: 'temporaryBan', banUntil: new Date(Date.now() + banDays * 24 * 60 * 60 * 1000) };
            message = `User with the id of ${id} has been temporarily suspended for ${banDays} day(s).`;
        } else if (banType === 'permanentBan') {
            update = { userStatus: 'permanentBan', $unset: { banUntil: 1 } };
            message = `User with the id of ${id} has been permanently suspended.`;
        } else {
            update = { userStatus: 'active', $unset: { banUntil: 1 } };
            message = `User with the id of ${id} has been set to active. Any current suspension is lifted.`;
        }

        const user = await User.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });

        res.status(200).json({
            success: true,
            message,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                userStatus: user.userStatus,
                banUntil: user.banUntil || null
            }
        });
    } catch (err) {
        return sendError(res, err, 'Cannot change user status');
    }
};
