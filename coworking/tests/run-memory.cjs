'use strict';
// Isolated real-MongoDB replica set plus HTTP and Postman/Newman evidence.
// First use may download a MongoDB binary. No existing MongoDB service is used.
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-memory-test-secret-1234567890123456789';
process.env.JWT_EXPIRE = '1d';
process.env.JWT_COOKIE_EXPIRE = '1';
process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(__dirname, '..', '.cache', 'mongodb-binaries');
process.env.MONGOMS_DOWNLOAD_IGNORE_MISSING_HEADER ||= 'true';
const { MongoMemoryReplSet } = require('mongodb-memory-server');

async function run() {
  let replica; let server; let mongoose;
  try {
    replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ ip: '127.0.0.1' }] });
    const uri = replica.getUri();
    const exit = await new Promise((resolve, reject) => {
      const files = ['booking.test.js', 'models.test.js', 'http.test.js', 'integration.test.js'].map((name) => path.join(__dirname, name));
      const child = spawn(process.execPath, ['--test', ...files], { env: { ...process.env, TEST_MONGO_URI: uri }, stdio: 'inherit' });
      child.once('error', reject); child.once('exit', resolve);
    });
    if (exit !== 0) throw new Error(`Node/API tests exited ${exit}`);
    mongoose = require('mongoose');
    const dbName = `vacq_runner_${Date.now()}_${process.pid}`;
    await mongoose.connect(uri, { dbName });
    const User = require('../models/User');
    const Room = require('../models/Room');
    const Review = require('../models/Review');
    const Reservation = require('../models/Reservation');
    const Note = require('../models/Note');
    await Promise.all([User.init(), Room.init(), Review.init(), Reservation.init(), Note.init()]);
    const password = 'RunnerAdmin123';
    await User.create({ name: 'Isolated Runner Admin', email: 'runner-admin@example.test', tel: '020000000', password, role: 'admin' });
    const app = require('../app');
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const output = path.resolve(__dirname, '..', '..', 'output', 'api');
    fs.mkdirSync(output, { recursive: true });
    const privateOutput = path.resolve(__dirname, '..', '..', 'tmp', 'api');
    fs.mkdirSync(privateOutput, { recursive: true });
    const newman = require('newman');
    const summary = await new Promise((resolve, reject) => newman.run({
      collection: require('../../postman/VacQ_Final_Project.postman_collection.json'),
      environment: { name: 'Isolated replica-set verification', values: [
        { key: 'baseUrl', value: `http://127.0.0.1:${server.address().port}/api/v1`, enabled: true },
        { key: 'adminEmail', value: 'runner-admin@example.test', enabled: true },
        { key: 'adminPassword', value: password, enabled: true },
      ] },
      reporters: ['cli', 'json'],
      reporter: { json: { export: path.join(privateOutput, 'newman-results.json') } },
      timeoutRequest: 15000,
    }, (error, result) => error ? reject(error) : resolve(result)));
    // Keep the shareable evidence free of runtime authentication values.
    const durations = summary.run.executions.map((execution) => execution.response?.responseTime).filter(Number.isFinite).sort((a, b) => a - b);
    const concise = {
      generatedAt: new Date().toISOString(), database: 'temporary MongoDB replica set',
      integration: { exitCode: exit, realMongo: true },
      stats: summary.run.stats,
      performance: {
        scope: 'Sequential Newman requests on this machine against one local temporary MongoDB replica-set member; this is not a production load test',
        requestCount: durations.length,
        averageMs: durations.reduce((sum, value) => sum + value, 0) / durations.length,
        p95Ms: durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)],
        maxMs: durations.at(-1),
        responsesWithinThreeSeconds: durations.filter((value) => value <= 3000).length,
      },
      failures: summary.run.failures.map((f) => ({ request: f.source?.name, error: f.error?.message || String(f.error) })),
    };
    fs.writeFileSync(path.join(output, 'verification-summary.json'), JSON.stringify(concise, null, 2) + '\n');
    if (summary.run.failures.length) throw new Error(`Newman reported ${summary.run.failures.length} failures`);
    if (!/^vacq_runner_\d+_\d+$/.test(dbName)) throw new Error('Refusing cleanup of an unexpected database');
    await mongoose.connection.dropDatabase();
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose?.connection.readyState) await mongoose.disconnect();
    if (replica) await replica.stop();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
