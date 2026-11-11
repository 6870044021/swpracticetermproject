const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config/config.env'), quiet: true });
const connectDB = require('./config/db');
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random string containing at least 32 characters');
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI to an isolated MongoDB replica-set or Atlas database');
  await connectDB();
  // Build required unique indexes before accepting writes.
  await Promise.all(['User', 'Room', 'Reservation', 'Review', 'Note', 'BookingLock'].map(name => require(`./models/${name}`).init()));
  const app = require('./app');
  const server = app.listen(process.env.PORT || 5000, () => console.log(`WoTA API listening on port ${process.env.PORT || 5000}`));
  const shutdown = () => server.close(() => require('mongoose').disconnect().then(() => process.exit(0)));
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}
if (require.main === module) start().catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
module.exports = { start };
