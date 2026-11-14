# Software Development Practice Term Project

Chulalongkorn University

2110503 Software Development Practice (2026/1)

<h2>WoTA: Working Time Allocator</h2>

A Co-working Space Reservation system (Project #6), built as REST APIs with Node.js, Express and MongoDB Atlas,
by modifying the course VacQ code from Assignment 7 (Hospital → Co-working space/Room, Appointment → Reservation).
The original VacQ APIs from Assignment 7 (`/api/v1/hospitals`, `/api/v1/appointments`) are kept and work as before.

Contributors:

Chanapat Keeratichaowanakul 6870044021

Worapakorn Jarusiriphot 6870242021

## Run the API

```bash
cd coworking
npm install
npm run dev
```

`coworking/config/config.env` (not committed):

| Key | Example | Notes |
| --- | --- | --- |
| `PORT` | `5000` | |
| `NODE_ENV` | `development` | |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `JWT_SECRET` | any long random string | |
| `JWT_EXPIRE` | `30d` | |
| `JWT_COOKIE_EXPIRE` | `30` | days |
| `RATE_LIMIT_MAX` | `1000` | optional; requests per 10 minutes (default 100 in production, 1000 otherwise) |
| `TZ_OFFSET` | `+07:00` | optional; time zone of the co-working spaces' opening hours |

API documentation (Swagger UI): http://localhost:5000/api-docs

## Test with Postman / Newman

The collection `coworking/postman/WoTA_TermProject.postman_collection.json` runs top to bottom
(124 requests, 227 assertions in 20 folders) and creates its own users, rooms and hospitals, so it can be run again and again.
Folders 1-12 follow the official presentation steps (Project Timeslots 69 > instructions): register + validation check, log-in,
view co-working spaces, create booking + invalid conditions, view, edit and delete own booking, log-out, admin log-in,
and admin view, edit and delete any booking. Folders 13-16 demo the extra credits, 17 admin management of co-working spaces,
18 the VacQ APIs kept from Assignment 7, and 19 cleans up.

```bash
cd coworking
npm test
```

HTML report (needs `npm install -g newman-reporter-htmlextra`): `npm run test:report`.
To test another server, change the `URL` collection variable (default `http://localhost:5000`).

## API

| Method | Path | Access | Requirement |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Public | FR1, A1, A3 |
| POST | `/api/v1/auth/login` | Public | FR2 |
| GET | `/api/v1/auth/logout` | Public | FR2 (clears the token cookie) |
| GET | `/api/v1/auth/me` | User | FR2 |
| POST | `/api/v1/auth/changePassword` | User | A2 (A1 rules) |
| POST | `/api/v1/auth/passwordhint` | Public | A3 (get hint by email) |
| PUT | `/api/v1/auth/passwordhint` | User | A3 (set hint) |
| POST | `/api/v1/auth/suspend` | Admin | A9 |
| GET | `/api/v1/rooms` | Public | FR3 (filter `?field[gt]=`, `select`, `sort`, `page`, `limit`) |
| GET | `/api/v1/rooms/:id` | Public | FR3 |
| GET | `/api/v1/rooms/:id/availability?date=YYYY-MM-DD` | Public | A4 |
| POST / PUT / DELETE | `/api/v1/rooms`, `/api/v1/rooms/:id` | Admin | manage co-working spaces (delete cascades) |
| GET / POST | `/api/v1/rooms/:roomId/reservations` | User | FR3, FR4, FR7, A4, A11 |
| GET | `/api/v1/reservations` | User | FR4 (own), FR7 (admin: all) |
| GET / PUT / DELETE | `/api/v1/reservations/:id` | Owner or admin | FR4–FR9, A4, A6, A7 |
| GET / POST | `/api/v1/rooms/:roomId/reviews` | User | A5, A10, A11, A12, A13 (`?excludeAnonymous=true`) |
| GET | `/api/v1/reviews` | User | A5, A13 |
| GET / PUT / DELETE | `/api/v1/reviews/:id` | Author or admin | A10, A12 |
| GET / POST | `/api/v1/rooms/:roomId/notes` | User (own notes) | A8 |
| GET | `/api/v1/notes` | User (own notes) | A8 |
| GET / PUT / DELETE | `/api/v1/notes/:id` | Owner | A8 |
| GET | `/api/v1/hospitals` | Public | VacQ, Assignment 7 (filter `?field[gt]=`, `select`, `sort`, `page`, `limit`) |
| GET | `/api/v1/hospitals/:id` | Public | VacQ, Assignment 7 |
| POST / PUT / DELETE | `/api/v1/hospitals`, `/api/v1/hospitals/:id` | Admin | VacQ, Assignment 7 (delete cascades to appointments) |
| GET / POST | `/api/v1/hospitals/:hospitalId/appointments` | User | VacQ, Assignment 7 (a user may hold at most 3 appointments) |
| GET | `/api/v1/appointments` | User | VacQ, Assignment 7 (own; admin: all) |
| GET / PUT / DELETE | `/api/v1/appointments/:id` | Owner or admin | VacQ, Assignment 7 |

Reservation body: `{ "reservationDate": "2026-11-20T09:00:00+07:00", "endDate": "2026-11-20T11:00:00+07:00" }`
(`endDate` defaults to 1 hour later). Room `openCloseTimes` uses `HH:mm-HH:mm`, e.g. `08:00-20:00` (`00:00-24:00` = 24 hours).

Register body: `{ "name": "Admin", "email": "admin@example.com", "tel": "0812345678", "password": "Admin1234", "role": "admin" }`.
`tel` is required (FR1) and the password needs at least 8 characters with a lowercase letter, an uppercase letter and a number (A1),
so an Assignment 7 register body (no `tel`, password `12345678`) now gets 400. Login does not check password strength,
so accounts created in Assignment 7 in the same database can still log in.

## Diagrams

PlantUML sources: `VacQusecase.puml`, `VacQclass.puml`, `VacQSequence.puml`. Rendered PNG/SVG: `docs/diagrams/`.
`VacQclass.puml` holds three class diagrams (UML Profile for REST): `WoTA_Class_UMLProfile` (FR1–FR9),
`WoTA_Class_UMLProfile_Full` (with the extra credits) and `WoTA_Class_UMLProfile_VacQ` (the VacQ API kept from Assignment 7).
