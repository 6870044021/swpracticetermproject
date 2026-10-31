const mongoose = require('mongoose');

//package ที่ช่วยเรื่องการเข้ารหัส
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserSchema = new mongoose.Schema({
    name:{
        type: String,
        required:[true,'Please add a name']
    },
    email:{
        type: String,
        required:[true,'Please add an email'],
        unique:true,
        match:[
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            "Please add a valid email"
        ]
    },
    role:{
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
     tel:{
        type: String,
        required:[true,'Please add a telephone number']
    },
    password:{
        type: String,
        required:[true,'Please add a password'],
        minlength:8,
        select:false
    },
    passwordHint:{
        type: String,
        // required:[true,'Please add a password'],
    },
    userStatus:{
        type: String,
        enum: ['active', 'inactive', 'temporaryBan', 'permanentBan'],
        default: 'active'
    },
    banUntil:{
        type: Date
    },
    resetPasswordToken: String,
    resetPaawordExpire: Date,
    createdAt:{
        type: Date,
        default:Date.now
    }
});
//Encrypt password using Bcrypt
//UserSchema.pre('save',...) = ทำก่อนที่จะมี event 'save'
UserSchema.pre('save', async function(next){
    const salt = await bcrypt.genSalt(10);
    //นำ salt มา hash เข้ากับ password โดยใช้ bcrypt.
    this.password = await bcrypt.hash(this.password, salt);
});

//Sign and return

//สร้าง method ให้ UserSchema ใส่ชื่อ method ที่ต้องการจะสร้าง (getSignedJwtToken)
UserSchema.methods.getSignedJwtToken = function(){
    //นำ secret จาก server เราไปเข้ารหัสข้อมูลของ user
    return jwt.sign({id:this._id}, process.env.JWT_SECRET, {expiresIn:process.env.JWT_EXPIRE});
}

//Match user entered password with hashed password in database.
UserSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

module.exports = mongoose.model('User', UserSchema);