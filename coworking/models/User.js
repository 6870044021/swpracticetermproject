const mongoose = require('mongoose');

//package ที่ช่วยเรื่องการเข้ารหัส
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PASSWORD_MIN_LENGTH, PASSWORD_REGEX, PASSWORD_RULE_MESSAGE } = require('../utils/password');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please add a valid email'
        ]
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    // FR1: register with name, telephone number, email and password
    tel: {
        type: String,
        required: [true, 'Please add a telephone number'],
        trim: true,
        match: [/^\+?[0-9][0-9\- ]{7,18}[0-9]$/, 'Please add a valid telephone number, e.g. 0812345678 or 02-123-4567']
    },
    // A1: at least 8 characters with 1 lowercase letter, 1 uppercase letter and 1 number.
    // Validation runs on the plain-text password before the pre('save') hook hashes it.
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [PASSWORD_MIN_LENGTH, PASSWORD_RULE_MESSAGE],
        match: [PASSWORD_REGEX, PASSWORD_RULE_MESSAGE],
        select: false
    },
    // A3: optional hint shown when the user forgets the password
    passwordHint: {
        type: String,
        trim: true,
        maxlength: [100, 'Password hint can not be more than 100 characters']
    },
    // A9: admins can suspend a user for a duration (temporaryBan + banUntil) or indefinitely (permanentBan)
    userStatus: {
        type: String,
        enum: ['active', 'inactive', 'temporaryBan', 'permanentBan'],
        default: 'active'
    },
    banUntil: {
        type: Date
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

//Encrypt password using Bcrypt
//UserSchema.pre('save',...) = ทำก่อนที่จะมี event 'save' (hash เฉพาะตอนที่ password ถูกเปลี่ยน ไม่ hash ซ้ำ)
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    //นำ salt มา hash เข้ากับ password โดยใช้ bcrypt.
    this.password = await bcrypt.hash(this.password, salt);
});

// Safety net: never store a plain-text password through findOneAndUpdate / findByIdAndUpdate.
UserSchema.pre('findOneAndUpdate', async function () {
    const update = this.getUpdate() || {};
    const target = update.$set && update.$set.password ? update.$set : update;
    if (target.password) {
        const salt = await bcrypt.genSalt(10);
        target.password = await bcrypt.hash(target.password, salt);
    }
});

//Sign and return
//สร้าง method ให้ UserSchema ใส่ชื่อ method ที่ต้องการจะสร้าง (getSignedJwtToken)
UserSchema.methods.getSignedJwtToken = function () {
    //นำ secret จาก server เราไปเข้ารหัสข้อมูลของ user
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

//Match user entered password with hashed password in database.
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// A9/A11: true while the user is suspended (a temporary ban ends automatically at banUntil).
UserSchema.methods.isSuspended = function () {
    if (this.userStatus === 'permanentBan') {
        return true;
    }
    if (this.userStatus === 'temporaryBan') {
        return !this.banUntil || this.banUntil.getTime() > Date.now();
    }
    return false;
};

module.exports = mongoose.model('User', UserSchema);
