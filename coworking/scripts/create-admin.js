const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const { isStrongPassword } = require('../utils/booking');
async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_TEL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_TEL || !isStrongPassword(ADMIN_PASSWORD)) throw new Error('Provide ADMIN_NAME, ADMIN_EMAIL, ADMIN_TEL and a strong ADMIN_PASSWORD through environment variables');
  await mongoose.connect(process.env.MONGO_URI);
  await User.init();
  const existing = await User.findOne({ email: ADMIN_EMAIL.trim().toLowerCase() });
  if (existing) throw new Error('An account with this email already exists; this command does not silently promote existing users');
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, tel: ADMIN_TEL, password: ADMIN_PASSWORD, role: 'admin' });
  console.log('Administrator account created');
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
