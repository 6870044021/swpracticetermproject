const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });
const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');
const Room = require('../models/Room');
const { parseOpeningHours } = require('../utils/booking');
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const duplicates = await Review.aggregate([{ $group: { _id: { user: '$user', room: '$room' }, count: { $sum: 1 }, ids: { $push: '$_id' } } }, { $match: { count: { $gt: 1 } } }]);
  const invalidHours = [];
  for (const room of await Room.find().lean()) {
    try { parseOpeningHours(room.openCloseTimes); } catch { invalidHours.push(String(room._id)); }
  }
  const missingEnds = await Reservation.countDocuments({ endTime: { $exists: false } });
  console.log(JSON.stringify({ missingEndTimes: missingEnds, duplicateReviews: duplicates, roomsWithInvalidOpeningHours: invalidHours }, null, 2));
  if (duplicates.length || invalidHours.length) throw new Error('Resolve reported duplicate reviews and invalid opening hours before starting the upgraded API; no data has been deleted');
  if (!process.argv.includes('--apply')) { console.log('Read-only audit complete. Use --apply after backing up the database to fill missing end times and create indexes.'); return; }
  await Reservation.collection.updateMany({ endTime: { $exists: false } }, [{ $set: { endTime: { $add: ['$reservationDate', 3600000] } } }]);
  await Promise.all([require('../models/User').createIndexes(), Room.createIndexes(), Reservation.createIndexes(), Review.createIndexes(), require('../models/Note').createIndexes()]);
  console.log('Migration completed without deleting existing records');
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
