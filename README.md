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

<<<<<<< Updated upstream
The backend implements the WoTA co-working space requirements, with Assignment 7 hospital/appointment compatibility routes. See [API guide and restoration evidence](docs/backend-changes.md) and [requirements traceability](docs/requirements-traceability.md).

```powershell
cd coworking
npm ci
Copy-Item config/config.env.example config/config.env
```

Set your own `MONGO_URI` and a random `JWT_SECRET` of at least 32 characters in `config/config.env`. Use MongoDB Atlas or a replica set for transactional writes. A standalone MongoDB server cannot provide the booking guarantees required here.

Create a separate admin account using `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_TEL` and `ADMIN_PASSWORD` environment variables, then run `npm run create-admin`. Public registration creates ordinary users only. Existing databases should be backed up and checked with `npm run db:audit` before `npm run db:migrate`.

```powershell
npm start
```

Open [Swagger](http://localhost:5000/api-docs) or `/api-docs.json`. Room opening hours use Asia/Bangkok. Reservation date-times require an explicit timezone, for example `2030-01-02T10:00:00+07:00`; `endTime` defaults to one hour after the start.

## Test and demonstrate

```powershell
=======
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
>>>>>>> Stashed changes
cd coworking
npm test
```

<<<<<<< Updated upstream
The integration suite explicitly skips when `TEST_MONGO_URI` is unset. Use an isolated replica-set database or the temporary database runner in `tests/run-memory.cjs` for full HTTP/MongoDB and Newman verification. The temporary runner downloads MongoDB on first use and does not use an existing database.

Import the collection and example environment from [postman](postman/README.md). It captures tokens and IDs and uses future dates automatically. Use test data and keep real credentials out of Git. See [verification results](docs/verification.md) for what actually ran in this task.

## Presentation and diagrams

Final presentation files and the updated Pu checklist are in `output/`. Submit one presentation file, as requested by the course. Demonstrate the real running program separately. Editable diagram sources are `VacQusecase.puml`, `VacQclass.puml`, and `VacQSequence.puml`; rendered views are in `docs/diagrams/`.

Use the [7-minute speaking/demo script](docs/presentation-script.md) and [Extra Credit teaching-video script](docs/extra-credit-video-script.md). The video still needs recording and a real URL. [Contribution notes](docs/contributions.md) preserve Ta's original credit and explain the local Pu changes without claiming an invented 50/50 GitHub split.

The optional React frontend only supplies authentication pages. The project specification requires the REST API and Postman testing, rather than a full booking frontend.

=======
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
>>>>>>> Stashed changes
