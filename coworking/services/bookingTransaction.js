const mongoose = require('mongoose');
const BookingLock = require('../models/BookingLock');
const { HttpError } = require('../utils/errors');
async function withBookingTransaction(keys, work) {
  const lockKeys = [...new Set(keys)].sort();
  for (const _id of lockKeys) {
    try { await BookingLock.updateOne({ _id }, { $setOnInsert: { revision: 0 } }, { upsert: true }); }
    catch (err) { if (err.code !== 11000) throw err; }
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      // Updating shared lock rows forces concurrent transactions to retry their checks.
      for (const _id of lockKeys) await BookingLock.updateOne({ _id }, { $inc: { revision: 1 } }, { session });
      return work(session);
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 10000 });
  } catch (err) {
    if (err.code === 20 || /Transaction numbers are only allowed/.test(err.message)) throw new HttpError(503, 'Reservation writes require MongoDB Atlas or a replica set; standalone MongoDB does not provide the required booking transaction guarantees');
    throw err;
  } finally { await session.endSession(); }
}
module.exports = { withBookingTransaction };
