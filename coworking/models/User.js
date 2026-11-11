const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isStrongPassword } = require('../utils/booking');
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please add a valid email'] },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  tel: { type: String, required: true, trim: true, maxlength: 30 },
  password: { type: String, required: true, select: false, validate: { validator: function (value) { return !this.isNew && !this.isModified('password') || isStrongPassword(value); }, message: 'Password must contain at least 8 characters, one lowercase letter, one uppercase letter and one number, and at most 72 UTF-8 bytes' } },
  passwordHint: { type: String, maxlength: 200, default: '', select: false },
  userStatus: { type: String, enum: ['active', 'inactive', 'temporaryBan', 'permanentBan'], default: 'active' },
  banUntil: { type: Date, default: null },
  tokenVersion: { type: Number, default: 0, select: false },
  createdAt: { type: Date, default: Date.now }
});
UserSchema.pre('save', async function () { if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12); });
UserSchema.methods.getSignedJwtToken = function () { return jwt.sign({ id: this._id, tv: this.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '1d' }); };
UserSchema.methods.matchPassword = function (enteredPassword) { return bcrypt.compare(enteredPassword, this.password); };
UserSchema.set('toJSON', { transform: (doc, ret) => { delete ret.password; delete ret.passwordHint; delete ret.tokenVersion; return ret; } });
module.exports = mongoose.model('User', UserSchema);
