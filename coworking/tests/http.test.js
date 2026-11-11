'use strict';
// These tests exercise the real Express middleware and routes without a DB.
const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'http-boundary-test-secret-only-123456789';
const app = require('../app');

test('HTTP middleware rejects unauthorized and malformed requests before database access', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(method, route, body, token) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
    return { response, json: await response.json() };
  }
  await t.test('service response and security headers', async () => {
    const { response, json } = await request('GET', '/');
    assert.equal(response.status, 200); assert.equal(json.success, true);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.ok(response.headers.get('x-content-type-options'));
  });
  await t.test('health reports disconnected DB honestly', async () => {
    const { response, json } = await request('GET', '/health');
    assert.equal(response.status, 503); assert.equal(json.success, false);
    assert.equal(json.data.database, 'disconnected');
  });
  await t.test('private resources reject missing and invalid bearer tokens', async () => {
    for (const route of ['/auth/me', '/reservations', '/notes']) {
      for (const token of [undefined, 'bad-token']) {
        const { response, json } = await request('GET', '/api/v1' + route, undefined, token);
        assert.equal(response.status, 401); assert.equal(json.success, false);
      }
    }
  });
  await t.test('MongoDB operator injection is rejected', async () => {
    const { response, json } = await request('POST', '/api/v1/auth/login', { email: { $gt: '' }, password: 'PuTesting123' });
    assert.equal(response.status, 400); assert.equal(json.success, false);
  });
  await t.test('malformed JSON is a client error', async () => {
    const { response, json } = await request('POST', '/api/v1/auth/register', '{broken');
    assert.equal(response.status, 400); assert.equal(json.success, false);
  });
  await t.test('registration enforces password policy and public role boundary', async () => {
    for (const password of ['lowercase1', 'UPPERCASE1', 'NoNumbers', 'Short1']) {
      const { response } = await request('POST', '/api/v1/auth/register', { name: 'Pu', email: 'test@example.test', tel: '0811111111', password });
      assert.equal(response.status, 400);
    }
    const { response } = await request('POST', '/api/v1/auth/register', { name: 'Pu', email: 'test@example.test', tel: '0811111111', password: 'PuTesting123', role: 'admin' });
    assert.equal(response.status, 403);
  });
  await t.test('OpenAPI describes actual room and reservation paths', async () => {
    const { response, json } = await request('GET', '/api-docs.json');
    assert.equal(response.status, 200); assert.ok(json.openapi);
    assert.ok(json.paths['/rooms']); assert.ok(json.paths['/reservations/{id}']);
  });
  await t.test('unknown routes return JSON404', async () => {
    const { response, json } = await request('GET', '/missing-route');
    assert.equal(response.status, 404); assert.equal(json.success, false);
  });
});
