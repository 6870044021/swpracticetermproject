const ref = name => ({ $ref: `#/components/schemas/${name}` });
const json = schema => ({ 'application/json': { schema } });
const success = { description: 'Successful response. JSON envelope: success, data; lists include count.', content: json({ type: 'object' }) };
const responses = { 200: success, 400: { description: 'Invalid request' }, 401: { description: 'Authentication required or expired' }, 403: { description: 'Role, ownership or suspension denies access' }, 404: { description: 'Resource not found' }, 409: { description: 'Duplicate record, occupied room or 1-hour cutoff conflict' }, 503: { description: 'Database or required replica-set transaction unavailable' } };
const id = name => ({ name, in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } });
const body = schema => ({ required: true, content: json(schema) });
const secured = { security: [{ bearerAuth: [] }] };
const operation = (summary, schema, isPublic = false, parameters = []) => ({ summary, ...(isPublic ? {} : secured), parameters, ...(schema ? { requestBody: body(schema) } : {}), responses });
const paths = {
  '/auth/register': { post: operation('Register an ordinary user. Public administrator creation is forbidden.', ref('Registration'), true) },
  '/auth/login': { post: operation('Authenticate with email and password', { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }, true) },
  '/auth/me': { get: operation('Get your own account') },
  '/auth/logout': { get: operation('Revoke all existing tokens belonging to this account'), post: operation('Revoke all existing tokens belonging to this account') },
  '/auth/changePassword': { post: operation('Change password and revoke previous tokens', { type: 'object', required: ['oldPassword', 'newPassword'], properties: { oldPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } } }) },
  '/auth/passwordHint': {
    get: operation('Retrieve an optional hint without revealing the password', null, true, [{ name: 'email', in: 'query', required: true, schema: { type: 'string', format: 'email' } }]),
    put: operation('Set or clear your password hint', { type: 'object', required: ['passwordHint'], properties: { passwordHint: { type: 'string', maxLength: 200 } } })
  },
  '/auth/suspend': { post: operation('Admin: suspend a user or lift a suspension', { type: 'object', required: ['id', 'banType'], properties: { id: { type: 'string' }, banType: { type: 'string', enum: ['active', 'temporaryBan', 'permanentBan'] }, banTime: { type: 'number', description: 'Positive duration in days. Defaults to 1.' }, banUntil: { type: 'string', format: 'date-time', description: 'Explicit future expiry instead of banTime' } } }) },
  '/rooms': { get: operation('Browse rooms with safe select, sort, page, limit and field filters', null, true), post: { ...operation('Admin: create a room', ref('Room')), responses: { ...responses, 201: success } } },
  '/rooms/{id}': { get: operation('View room catalogue details', null, true, [id('id')]), put: operation('Admin: update room details', ref('Room'), false, [id('id')]), delete: operation('Admin: atomically delete room and dependent resources', null, false, [id('id')]) },
  '/reservations': { get: operation('List your reservations. Admin sees all reservations.') },
  '/reservations/{id}': { get: operation('View your reservation. Admin may view any.', null, false, [id('id')]), put: operation('Owner or admin: change reservation at least 1 hour before it begins', ref('ReservationUpdate'), false, [id('id')]), delete: operation('Owner or admin: cancel at least 1 hour before it begins', null, false, [id('id')]) },
  '/reviews': { get: operation('List reviews with credibility counts and anonymous privacy', null, false, [{ name: 'includeAnonymous', in: 'query', schema: { type: 'boolean', default: true } }]) },
  '/notes': { get: operation('List only your private notes, including when you are an admin') }
};
for (const [resource, schema] of [['reservations', 'Reservation'], ['reviews', 'Review'], ['notes', 'Note']]) {
  paths[`/rooms/{roomId}/${resource}`] = { get: operation(`List ${resource} in this room`, null, false, [id('roomId')]), post: { ...operation(`Create ${resource === 'reservations' ? 'a reservation, checking capacity and opening hours' : resource === 'reviews' ? 'your only review for this room' : 'a private note'}`, ref(schema), false, [id('roomId')]), responses: { ...responses, 201: success } } };
  if (resource !== 'reservations') paths[`/${resource}/{id}`] = { get: operation(`Get a ${resource === 'reviews' ? 'review' : 'private note'}`, null, false, [id('id')]), put: operation(`Update a ${resource === 'reviews' ? 'review' : 'private note'}`, ref(schema), false, [id('id')]), delete: operation(`Delete a ${resource === 'reviews' ? 'review' : 'private note'}`, null, false, [id('id')]) };
}
paths['/auth/register'].post.responses = { ...responses, 201: success };
paths['/auth/passwordHint'].post = operation('Retrieve an optional hint using the email body alias', { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }, true);
paths['/auth/changePassword'].put = paths['/auth/changePassword'].post;
module.exports = {
  openapi: '3.0.3', info: { title: 'WoTA Co-working Space API', version: '2.0.0', description: 'All booking date-times require an explicit offset. Opening hours use Asia/Bangkok. MongoDB Atlas or a replica set is required for atomic booking writes. Legacy /hospitals and /appointments adapt Assignment 7 to this API.' },
  servers: [{ url: '/api/v1' }], paths,
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas: {
    Registration: { type: 'object', required: ['name', 'tel', 'email', 'password'], properties: { name: { type: 'string' }, tel: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8, description: 'At least one lowercase, uppercase and digit; at most 72 UTF-8 bytes' }, passwordHint: { type: 'string', maxLength: 200 } } },
    Room: { type: 'object', required: ['name', 'address', 'tel', 'openCloseTimes'], properties: { name: { type: 'string' }, description: { type: 'string' }, address: { type: 'string' }, tel: { type: 'string' }, openCloseTimes: { type: 'string', example: '08:00-20:00' } } },
    Reservation: { type: 'object', required: ['reservationDate'], properties: { reservationDate: { type: 'string', format: 'date-time', example: '2030-01-02T10:00:00+07:00' }, endTime: { type: 'string', format: 'date-time', description: 'Default 1 hour after start when omitted on creation' } } },
    ReservationUpdate: { type: 'object', properties: { room: { type: 'string' }, reservationDate: { type: 'string', format: 'date-time' }, endTime: { type: 'string', format: 'date-time' } } },
    Review: { type: 'object', required: ['reviewData'], properties: { reviewData: { type: 'string', maxLength: 5000 }, anonymousReview: { type: 'boolean', default: false } } },
    Note: { type: 'object', required: ['noteData'], properties: { noteData: { type: 'string', maxLength: 5000 } } }
  } }
};
