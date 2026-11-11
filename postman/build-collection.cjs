'use strict';
// Run `node postman/build-collection.cjs` after editing this source.
const fs = require('node:fs');
const path = require('node:path');
const items = [];
function add(name, method, route, { token, body, code = 200, checks = [], save, before = [] } = {}) {
  const test = [
    `pm.test(${JSON.stringify(name + ' status ' + code)}, () => pm.response.to.have.status(${code}));`,
    'const json = pm.response.json();',
    `pm.test('success flag', () => pm.expect(json.success).to.eql(${code < 400}));`,
    "pm.test('response within 3 seconds', () => pm.expect(pm.response.responseTime).to.be.at.most(3000));",
    ...(save ? [`if (pm.response.code < 400) pm.collectionVariables.set('${save}', json.data ? json.data._id : (json._id || json.token));`] : []),
    ...checks,
  ];
  const request = { method, header: [{ key: 'Content-Type', value: 'application/json' }], url: '{{baseUrl}}' + route };
  if (token) request.auth = { type: 'bearer', bearer: [{ key: 'token', value: `{{${token}}}`, type: 'string' }] };
  else request.auth = { type: 'noauth' };
  if (body) request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  // This suite explicitly tests bearer tokens. A retained browser-style login
  // cookie would otherwise make the no-token negative request authenticated.
  items.push({ name, request, protocolProfileBehavior: { disableCookies: true }, event: [
    ...(before.length ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: before } }] : []),
    { listen: 'test', script: { type: 'text/javascript', exec: test } },
  ] });
}
const user = 'userToken'; const other = 'otherToken'; const admin = 'adminToken';
const range = (n) => ({ reservationDate: `{{start${n}}}`, endTime: `{{end${n}}}` });
const storeToken = (key) => `if (pm.response.code < 400) pm.collectionVariables.set('${key}', json.token);`;
const storeUser = (key) => `if (pm.response.code < 400) pm.collectionVariables.set('${key}', json._id || (json.data && json.data._id));`;

add('00 Setup and admin login', 'POST', '/auth/login', {
  body: { email: '{{adminEmail}}', password: '{{adminPassword}}' }, checks: [storeToken(admin)], before: [
    "if (!pm.environment.get('adminEmail') || !pm.environment.get('adminPassword')) throw new Error('Set adminEmail/adminPassword in the local Postman environment first. Use npm run create-admin.');",
    "const runId = Date.now() + '-' + Math.floor(Math.random() * 100000);",
    "pm.collectionVariables.set('runId', runId);",
    "pm.collectionVariables.set('userEmail', 'pu-demo-' + runId + '@example.test');",
    "pm.collectionVariables.set('otherEmail', 'other-demo-' + runId + '@example.test');",
    "pm.collectionVariables.set('userPassword', 'PuDemoPass123');",
    "const day = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10);",
    "for (let n=1;n<=8;n++) { const start = new Date(day + 'T' + String(n+1).padStart(2,'0') + ':00:00.000Z'); pm.collectionVariables.set('start'+n,start.toISOString()); pm.collectionVariables.set('end'+n,new Date(+start+3600000).toISOString()); }",
    "pm.collectionVariables.set('soonStart',new Date(Date.now()+15*60000).toISOString());",
    "pm.collectionVariables.set('soonEnd',new Date(Date.now()+16*60000).toISOString());",
  ],
});
for (const [i, password] of ['Short1', 'lowercase1', 'UPPERCASE1', 'NoNumbers'].entries()) add(`A1 Reject weak password ${i + 1}`, 'POST', '/auth/register', {
  body: { name: 'Weak demo', tel: '0811111111', email: `weak-${i}-{{runId}}@example.test`, password }, code: 400,
});
add('FR1 Register Pu demo user', 'POST', '/auth/register', {
  body: { name: 'Pu demo', email: '{{userEmail}}', tel: '0811111111', password: '{{userPassword}}', passwordHint: 'A demo hint' }, code: 201,
  checks: [storeToken(user), storeUser('userId')],
});
add('Setup Register another ordinary user', 'POST', '/auth/register', {
  body: { name: 'Other demo', email: '{{otherEmail}}', tel: '0822222222', password: '{{userPassword}}' }, code: 201,
  checks: [storeToken(other), storeUser('otherId')],
});
add('FR2 Login with wrong password fails', 'POST', '/auth/login', { body: { email: '{{userEmail}}', password: 'Wrong12345' }, code: 401 });
add('FR2 Login Pu', 'POST', '/auth/login', { body: { email: '{{userEmail}}', password: '{{userPassword}}' }, checks: [storeToken(user)] });
add('Security Auth required', 'GET', '/auth/me', { code: 401 });
add('FR2 View own profile without password', 'GET', '/auth/me', { token: user, checks: ["pm.test('password is private',()=>pm.expect(json.data).not.to.have.property('password'));"] });
add('A3 Retrieve entered password hint', 'GET', '/auth/passwordHint?email={{userEmail}}', { checks: ["pm.test('hint',()=>pm.expect(json.data.passwordHint).to.eql('A demo hint'));"] });
add('A3 Update own password hint', 'PUT', '/auth/passwordHint', { token: user, body: { passwordHint: 'Updated demo hint' } });
add('A2 Reject wrong old password', 'POST', '/auth/changePassword', { token: user, body: { oldPassword: 'Wrong12345', newPassword: 'PuChangedPass456' }, code: 401 });
add('A1 A2 Reject weak replacement password', 'POST', '/auth/changePassword', { token: user, body: { oldPassword: '{{userPassword}}', newPassword: 'alllowercase1' }, code: 400 });
add('A2 Change password and refresh token', 'POST', '/auth/changePassword', { token: user, body: { oldPassword: '{{userPassword}}', newPassword: 'PuChangedPass456' }, checks: [storeToken(user), "pm.collectionVariables.set('userPassword','PuChangedPass456');"] });
add('A2 New password logs in', 'POST', '/auth/login', { body: { email: '{{userEmail}}', password: '{{userPassword}}' }, checks: [storeToken(user)] });
const roomBody = { name: 'Pu Runner {{runId}}', address: 'Bangkok demo address', tel: '021234567', description: 'Disposable room created by this collection', openCloseTimes: '00:00-24:00' };
add('Security User cannot create room', 'POST', '/rooms', { token: user, body: roomBody, code: 403 });
add('Setup Admin creates demo room', 'POST', '/rooms', { token: admin, body: roomBody, code: 201, save: 'roomId' });
add('FR3 View public space list', 'GET', '/rooms', { checks: ["pm.test('room list',()=>pm.expect(json.data).to.be.an('array'));"] });
add('FR3 View room contact and opening times', 'GET', '/rooms/{{roomId}}', { checks: ["pm.test('required room details',()=>{for(const k of ['name','address','tel','openCloseTimes'])pm.expect(json.data).to.have.property(k);});"] });
add('Room Admin updates description', 'PUT', '/rooms/{{roomId}}', { token: admin, body: { description: 'Updated demo description' } });
add('FR3 Book first room interval', 'POST', '/rooms/{{roomId}}/reservations', { token: user, body: range(1), code: 201, save: 'reservation1' });
add('A4 Reject overlap from another user', 'POST', '/rooms/{{roomId}}/reservations', { token: other, body: range(1), code: 409 });
add('FR3 A4 Adjacent booking is allowed', 'POST', '/rooms/{{roomId}}/reservations', { token: user, body: range(2), code: 201, save: 'reservation2' });
add('FR3 Third active booking allowed', 'POST', '/rooms/{{roomId}}/reservations', { token: user, body: range(3), code: 201, save: 'reservation3' });
add('FR3 Reject fourth active booking', 'POST', '/rooms/{{roomId}}/reservations', { token: user, body: range(4), code: 400 });
add('FR4 View own reservations', 'GET', '/reservations', { token: user, checks: ["pm.test('three own bookings',()=>pm.expect(json.data.length).to.eql(3));"] });
add('FR4 Another user cannot see private reservations', 'GET', '/reservations', { token: other, checks: ["pm.test('no other user bookings',()=>pm.expect(json.data.length).to.eql(0));"] });
add('FR4 Deny direct foreign reservation access', 'GET', '/reservations/{{reservation1}}', { token: other, code: 403 });
add('FR5 Deny foreign reservation edit', 'PUT', '/reservations/{{reservation1}}', { token: other, body: range(4), code: 403 });
add('FR6 Deny foreign reservation deletion', 'DELETE', '/reservations/{{reservation1}}', { token: other, code: 403 });
add('FR7 Admin views reservations', 'GET', '/reservations', { token: admin, checks: ["pm.test('admin sees demo booking',()=>pm.expect(json.data.some(x=>x._id===pm.collectionVariables.get('reservation1'))).to.eql(true));"] });
add('FR7 Admin views single reservation', 'GET', '/reservations/{{reservation1}}', { token: admin });
add('FR5 Owner edits booking with one hour lead', 'PUT', '/reservations/{{reservation1}}', { token: user, body: range(4) });
add('FR8 Admin edits another user booking', 'PUT', '/reservations/{{reservation1}}', { token: admin, body: range(5) });
add('FR6 Owner deletes booking', 'DELETE', '/reservations/{{reservation2}}', { token: user });
add('FR9 Admin deletes booking', 'DELETE', '/reservations/{{reservation3}}', { token: admin });
add('Cleanup Delete remaining future booking', 'DELETE', '/reservations/{{reservation1}}', { token: user });
add('A6 A7 Setup booking beginning within one hour', 'POST', '/rooms/{{roomId}}/reservations', { token: user, body: { reservationDate: '{{soonStart}}', endTime: '{{soonEnd}}' }, code: 201, save: 'soonReservation' });
add('A6 Deny edit within one hour', 'PUT', '/reservations/{{soonReservation}}', { token: user, body: range(6), code: 409 });
add('A7 Deny deletion within one hour', 'DELETE', '/reservations/{{soonReservation}}', { token: user, code: 409 });
add('A5 A12 Leave anonymous room review', 'POST', '/rooms/{{roomId}}/reviews', { token: user, body: { reviewData: 'Quiet demo room', anonymousReview: true }, code: 201, save: 'reviewId' });
add('A5 A12 Credibility count and anonymous privacy', 'GET', '/reviews/{{reviewId}}', { token: other, checks: [
  "pm.test('past bookings count',()=>pm.expect(json.data.pastBookings).to.be.a('number'));",
  "pm.test('anonymous author absent',()=>{pm.expect(json.data).not.to.have.property('user');pm.expect(JSON.stringify(json.data)).not.to.include(pm.collectionVariables.get('userId'));});",
] });
add('A10 Reject duplicate user room review', 'POST', '/rooms/{{roomId}}/reviews', { token: user, body: { reviewData: 'Duplicate' }, code: 409 });
add('A13 Filter anonymous reviews', 'GET', '/rooms/{{roomId}}/reviews?includeAnonymous=false', { token: other, checks: ["pm.test('anonymous excluded',()=>pm.expect(json.data.some(x=>x.anonymousReview)).to.eql(false));"] });
add('Review Deny foreign edit', 'PUT', '/reviews/{{reviewId}}', { token: other, body: { reviewData: 'Hijack' }, code: 403 });
add('A10 A12 Edit review to named', 'PUT', '/reviews/{{reviewId}}', { token: user, body: { reviewData: 'Updated named review', anonymousReview: false } });
add('A13 Named review remains in filtered list', 'GET', '/rooms/{{roomId}}/reviews?includeAnonymous=false', { token: other, checks: ["pm.test('named review visible',()=>pm.expect(json.data.some(x=>x._id===pm.collectionVariables.get('reviewId'))).to.eql(true));"] });
add('A10 Delete review before recreating', 'DELETE', '/reviews/{{reviewId}}', { token: user });
add('A10 Recreate after deletion', 'POST', '/rooms/{{roomId}}/reviews', { token: user, body: { reviewData: 'Recreated review' }, code: 201, save: 'reviewId' });
add('A8 Save private room note', 'POST', '/rooms/{{roomId}}/notes', { token: user, body: { noteData: 'My private demo note' }, code: 201, save: 'noteId' });
add('A8 View own note', 'GET', '/notes/{{noteId}}', { token: user });
add('A8 Other user cannot read note', 'GET', '/notes/{{noteId}}', { token: other, code: 404 });
add('A8 Admin cannot read private note', 'GET', '/notes/{{noteId}}', { token: admin, code: 404 });
add('A8 Other user list excludes note', 'GET', '/notes', { token: other, checks: ["pm.test('notes private',()=>pm.expect(json.data.length).to.eql(0));"] });
add('A8 Edit own private note', 'PUT', '/notes/{{noteId}}', { token: user, body: { noteData: 'Edited private note' } });
add('A8 Delete own note', 'DELETE', '/notes/{{noteId}}', { token: user });
add('A9 Ordinary user cannot suspend others', 'POST', '/auth/suspend', { token: user, body: { id: '{{otherId}}', banType: 'permanentBan' }, code: 403 });
for (const banType of ['temporaryBan', 'permanentBan']) {
  add(`A9 Admin applies ${banType}`, 'POST', '/auth/suspend', { token: admin, body: { id: '{{otherId}}', banType, banTime: 1 } });
  add(`A11 ${banType} blocks booking`, 'POST', '/rooms/{{roomId}}/reservations', { token: other, body: range(7), code: 403 });
  add(`A11 ${banType} blocks review`, 'POST', '/rooms/{{roomId}}/reviews', { token: other, body: { reviewData: 'Blocked review' }, code: 403 });
}
add('A9 Admin lifts suspension', 'POST', '/auth/suspend', { token: admin, body: { id: '{{otherId}}', banType: 'active' } });
add('A11 Lifted user can book', 'POST', '/rooms/{{roomId}}/reservations', { token: other, body: range(7), code: 201, save: 'otherReservation' });
add('Cleanup Other user deletes future booking', 'DELETE', '/reservations/{{otherReservation}}', { token: other });
add('A11 Lifted user can review', 'POST', '/rooms/{{roomId}}/reviews', { token: other, body: { reviewData: 'Allowed review' }, code: 201, save: 'otherReview' });
add('Cleanup Delete other review', 'DELETE', '/reviews/{{otherReview}}', { token: other });
add('Cleanup Delete Pu review', 'DELETE', '/reviews/{{reviewId}}', { token: user });
add('FR2 Logout Pu and revoke token', 'GET', '/auth/logout', { token: user });
add('FR2 Logged-out bearer token no longer works', 'GET', '/auth/me', { token: user, code: 401 });
add('Cleanup Admin deletes demo room and its demo booking', 'DELETE', '/rooms/{{roomId}}', { token: admin });

const collection = {
  info: { name: 'VacQ Final Project FR1-9 A1-A13 Pu', description: 'Run in order on a disposable test database. Creates 2 demo users and a uniquely named room. Last request removes the room and its remaining near-start booking. Accounts remain because the product has no account-delete API. See README for setup and limits.', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: 'http://localhost:5000/api/v1', type: 'string' }], item: items,
};
fs.writeFileSync(path.join(__dirname, 'VacQ_Final_Project.postman_collection.json'), JSON.stringify(collection, null, 2) + '\n');
const environment = { name: 'VacQ local example', values: [
  { key: 'baseUrl', value: 'http://localhost:5000/api/v1', enabled: true },
  { key: 'adminEmail', value: '', enabled: true },
  { key: 'adminPassword', value: '', enabled: true, type: 'secret' },
], _postman_variable_scope: 'environment' };
fs.writeFileSync(path.join(__dirname, 'VacQ_local.postman_environment.json'), JSON.stringify(environment, null, 2) + '\n');
console.log(`Generated ${items.length} ordered requests`);
