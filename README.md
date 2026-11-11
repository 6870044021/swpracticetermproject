# Software Development Practice Term Project

Chulalongkorn University

2110503 Software Development Practice (2026/1)

<h2>WoTA: Working Time Allocator</h2>

A Co-working Space Reservation system (Project #6), built as REST APIs with Node.js, Express and MongoDB Atlas,
by modifying the course VacQ code from Assignment 7 (Hospital → Co-working space/Room, Appointment → Reservation).

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
(97 requests, 178 assertions) and creates its own users and rooms, so it can be run again and again.

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
| GET | `/api/v1/auth/logout` | User | FR2 |
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

Reservation body: `{ "reservationDate": "2026-11-20T09:00:00+07:00", "endDate": "2026-11-20T11:00:00+07:00" }`
(`endDate` defaults to 1 hour later). Room `openCloseTimes` uses `HH:mm-HH:mm`, e.g. `08:00-20:00` (`00:00-24:00` = 24 hours).

## Diagrams

PlantUML sources: `VacQusecase.puml`, `VacQclass.puml`, `VacQSequence.puml`. Rendered PNG/SVG: `docs/diagrams/`.
