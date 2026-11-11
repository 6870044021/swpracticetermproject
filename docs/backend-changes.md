# WoTA backend implementation and API guide

The current change implements and refactors FR1–FR9 and A1–A13 for the co-working space API. Changes in this working tree were prepared for Pu using Codex. Existing Ta contributions remain credited in Git history; this document does not claim new commits or a measured 50/50 GitHub contribution split.

## Why the Assignment 7 files look missing

The supplied `503cp69-a7-2-worapakornjarusiriphot.zip` contains a hospital appointment project: `controllers/hospitals.js`, `controllers/appointments.js`, `models/Hospital.js`, `models/Appointment.js` and `/api/v1/hospitals`, `/api/v1/appointments`. The supplied Postman collection uses those same hospital endpoints, despite its VacQ filename.

Local Git evidence is more specific than an assumption of deletion. Commit `908de75` is an initial README-only commit. Commit `2052baf` (`project initialization`, 29 October 2026) first adds the backend directly as `rooms` and `reservations`, including authentication, room CRUD, filtering, sorting, projection, pagination, reservation CRUD and cascading deletion. The available path history contains additions and modifications to these files, and no earlier hospital/appointment paths in this repository. Thus the local evidence supports a domain adaptation at initialization. It cannot prove whether unrelated work existed elsewhere before that initialization.

This change restores compatibility through an adapter in `coworking/routes/legacy.js`, while keeping one implementation of each rule. Copying the old ZIP over this project would revert the domain and overwrite the later reviews, notes, password hints and suspension work. The ZIP's `.git` directory, autograding credentials and test configuration are deliberately not imported.

| Assignment 7 capability | Final implementation |
| --- | --- |
| Hospital collection and item CRUD | `/api/v1/hospitals` adapts to `/api/v1/rooms` |
| Hospital address fields | Optional `district`, `province`, `postalcode`, `region` remain available |
| Appointment collection and item CRUD | `/api/v1/appointments` adapts to `/api/v1/reservations` |
| Nested appointment routes | `/api/v1/hospitals/:roomId/appointments` adapts to room reservations |
| `apptDate` and `hospital` request fields | Translated to `reservationDate` and `room`; successful legacy responses also include old aliases |
| Nested creation determines owner | Legacy POST ignores supplied `user`; canonical POST rejects unsupported ownership fields |
| Filter, compare, select, sort and paginate | Whitelisted fields/operators; filtered totals; safe page and limit validation |
| Cascading deletion | Admin room deletion removes reservations, notes and reviews in one transaction |

Legacy responses have a `Deprecation: true` header and a successor link. They operate on the same Room and Reservation collections, not a second hospital database. Existing hospital database records are not silently migrated into this domain. The old collection must be updated to use strong passwords, required telephone numbers and a provisioned admin account. Public `role: "admin"` registration is rejected with 403. A legacy date-time without `endTime` receives a one-hour interval; a bare calendar date has no specified time and is rejected.

## Setup and verification

1. In `coworking`, run `npm ci`.
2. Copy `config/config.env.example` to `config/config.env`, set an isolated `MONGO_URI`, and set a random `JWT_SECRET` of at least 32 characters. Never commit real credentials.
3. Use MongoDB Atlas or a MongoDB replica set. Booking, room-update/delete, note-creation, review-creation/update and suspension operations use transactions. A standalone MongoDB server receives 503 for these writes with an explanation. Read operations and authentication alone do not establish transaction compatibility.
4. For existing data, back up the database, then run `npm run db:audit`. Resolve reported duplicate reviews and invalid room hours manually. `npm run db:migrate` fills missing `endTime` as `reservationDate + 1 hour` and builds indexes. It never deletes old reviews to make a uniqueness error disappear.
5. Provision an admin through environment variables `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_TEL`, `ADMIN_PASSWORD`, then run `npm run create-admin`. The command refuses to silently promote an existing account and never prints the password.
6. Run `npm start`. Swagger is available at `/api-docs`, raw OpenAPI at `/api-docs.json`, and `/health` reports database connection state.
7. Run `npm test`. The live integration suite requires `TEST_MONGO_URI`, creates a unique `vacq_test_*` database and drops only that generated database during cleanup. Without this variable, the live suite explicitly reports a skip.

The normal server loads `config/config.env` relative to its own directory and waits for the database and indexes before listening. `app.js` exports the Express app without connecting or opening a port, so tests can control their own server and database.

## API reference

All paths below have prefix `/api/v1`. Use `Authorization: Bearer <token>` for authenticated requests. JSON responses use `{success, data}`; lists also contain `count`. Authentication responses contain `{success, _id, name, email, role, token, user}` for both the current frontend and Postman.

| Method | Path | Body or query | Access and behavior |
| --- | --- | --- | --- |
| POST | `/auth/register` | `name,tel,email,password,passwordHint?` | Public ordinary-user registration; strong password required |
| POST | `/auth/login` | `email,password` | Public login; email normalized to lowercase |
| GET | `/auth/me` | — | Own account; excludes password, hint and token version |
| GET or POST | `/auth/logout` | — | Authenticated; revokes all existing tokens for this user and clears cookie |
| POST or PUT | `/auth/changePassword` | `oldPassword,newPassword` | Checks old password, validates and hashes new password; returns fresh token and revokes previous tokens |
| GET | `/auth/passwordHint` | `?email=...` | Returns optional hint, never a password; unknown email returns empty hint |
| POST | `/auth/passwordHint` | `email` | Body-based alias for hint lookup |
| PUT | `/auth/passwordHint` | `passwordHint` | Set or clear own hint, up to 200 characters |
| POST | `/auth/suspend` | `id,banType,banTime?` or `banUntil?` | Admin; `active`, `temporaryBan`, `permanentBan`; banTime is positive days, default 1 |
| GET | `/rooms` | `select,sort,page,limit` plus whitelisted field filters | Public catalogue; comparison syntax such as `name[gte]=A`; limit 1–100 |
| GET | `/rooms/:id` | — | Public room details, without private notes or reservations |
| POST | `/rooms` | `name,address,tel,openCloseTimes,description?` | Admin; returns 201 |
| PUT | `/rooms/:id` | Changed room fields | Admin; new opening hours must accommodate existing active reservations |
| DELETE | `/rooms/:id` | — | Admin; atomically cascades dependent resources |
| GET | `/reservations` | — | User's own reservations; admin sees all |
| GET | `/rooms/:roomId/reservations` | — | Same ownership scope, narrowed to selected room |
| POST | `/rooms/:roomId/reservations` | `reservationDate,endTime?` | Own booking; `startTime` is a start-date alias; returns 201 |
| GET | `/reservations/:id` | — | Owner or admin only |
| PUT | `/reservations/:id` | `reservationDate?,endTime?,room?` | Owner or admin; immutable user ownership; cutoff and availability checks |
| DELETE | `/reservations/:id` | — | Owner or admin; at least one hour before the original start |
| GET | `/reviews` or `/rooms/:roomId/reviews` | `includeAnonymous=false` optional | Authenticated reviews; adds `pastBookings` and `canEdit` |
| POST | `/rooms/:roomId/reviews` | `reviewData,anonymousReview?` | Authenticated active account; one review per user/room; returns 201 |
| GET | `/reviews/:id` | — | Authenticated; anonymous author identity omitted |
| PUT | `/reviews/:id` | `reviewData?,anonymousReview?` | Owner or admin; active account required |
| DELETE | `/reviews/:id` | — | Owner or admin; deletion permits creating a new review |
| GET | `/notes` or `/rooms/:roomId/notes` | — | Only caller's private notes, including admin callers |
| POST | `/rooms/:roomId/notes` | `noteData` | Creates own private note; returns 201 |
| GET, PUT, DELETE | `/notes/:id` | PUT: `noteData` | Only owner; foreign or missing IDs both receive 404 |

Nested room-resource routers also support item routes, and verify that the item belongs to the requested room. Flat POST reservation/review/note requests must select a room using the corresponding nested creation route.

Example reservation:

```json
{
  "reservationDate": "2030-01-02T10:00:00+07:00",
  "endTime": "2030-01-02T11:30:00+07:00"
}
```

## Requirement decisions and refactoring

- A password must contain at least eight characters with lowercase, uppercase and a digit. The additional 72-byte UTF-8 cap avoids bcrypt truncation. Passwords are never logged. Password hashing runs only when the password changes, and strength validation checks the plaintext before hashing.
- Ordinary users may hold at most three active reservations across all rooms. Completed reservations remain readable and do not permanently exhaust this allowance. Admins retain the previous unlimited reservation allowance.
- Date-times require `Z` or an explicit offset. Room opening hours use Asia/Bangkok. `08:00-20:00`, overnight `20:00-02:00`, and all-day `00:00-24:00` are supported. A reservation lasts at most 24 hours. Omitted endTime defaults to one hour; changing only the start preserves the previous duration.
- Availability uses half-open intervals: a booking ending at 11:00 permits another starting exactly at 11:00. Both new and moved bookings must fit the room opening hours. Legacy reservations missing endTime are treated as one-hour bookings when checking overlaps and active counts.
- A6/A7 apply to admins as well as users because the requirements state no exception. Exactly one hour is allowed; less than one hour returns 409. Updating cannot move a reservation into the next hour. Admin room deletion is a separate catalogue operation and cascades all dependent records, including bookings inside the cancellation cutoff.
- A9 suspension may be indefinite or expire at a future instant. At the exact expiry, a temporary suspension ceases. Suspended accounts can still log in, read their own data and delete permitted content, but cannot create or reschedule reservations or create/edit reviews.
- Review uniqueness is enforced by a database compound unique index, including simultaneous submissions. Anonymous mode is opt-in and defaults to false. Anonymous responses remove the author field rather than merely hiding the display name. `pastBookings` counts completed reservations retained in the database across all rooms, using end time, and is calculated on the server.
- Private notes have no unrelated three-note limit. Ownership and room cannot be reassigned in updates. Public room endpoints no longer populate private notes or reservations, and admin role gives no access to another user's notes.
- Controllers handle HTTP orchestration, `services/reservations.js` owns booking policies, `utils/booking.js` holds testable rules, models hold structure/indexes, and routers declare routes and authorization. Shared error handling returns useful 400/401/403/404/409 responses without database stack traces.
- MongoDB transactions acquire shared `BookingLock` rows in a deterministic order. The room lock serializes competing overlaps; the user lock serializes the maximum-three check and suspension. The MongoDB driver's transaction retry reruns the checks after a write conflict. Review/note creation shares the room lock with deletion so a concurrent delete cannot leave a newly created orphan.
- Security remains explicit: Helmet, restricted CORS origin configuration, body-size limits, authentication rate limits, whitelisted query operators and request fields, and rejection of dollar/dotted/prototype request keys. JSON text is not executed as HTML; password input is not changed by an HTML sanitizer.

The automated test results and presentation separately identify what has actually run. Functional correctness under tested conditions does not establish a universal three-second response guarantee for every deployment, network, database size or workload. A teaching-video link and truthful GitHub contribution evidence also require real user actions; they cannot be generated by claiming a URL or a contribution percentage.
