# Software Development Practice Term Project

Chulalongkorn University

2110503 Software Development Practice (2026/1)

<h2>WoTA: Working Time Allocator</h2>

A Co-working Space Reservation system.

Contributors:

Chanapat Keeratichaowanakul 6870044021

Worapakorn Jarusiriphot 6870242021

## Run the API

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
cd coworking
npm test
```

The integration suite explicitly skips when `TEST_MONGO_URI` is unset. Use an isolated replica-set database or the temporary database runner in `tests/run-memory.cjs` for full HTTP/MongoDB and Newman verification. The temporary runner downloads MongoDB on first use and does not use an existing database.

Import the collection and example environment from [postman](postman/README.md). It captures tokens and IDs and uses future dates automatically. Use test data and keep real credentials out of Git. See [verification results](docs/verification.md) for what actually ran in this task.

## Presentation and diagrams

Final presentation files and the updated Pu checklist are in `output/`. Submit one presentation file, as requested by the course. Demonstrate the real running program separately. Editable diagram sources are `VacQusecase.puml`, `VacQclass.puml`, and `VacQSequence.puml`; rendered views are in `docs/diagrams/`.

Use the [7-minute speaking/demo script](docs/presentation-script.md) and [Extra Credit teaching-video script](docs/extra-credit-video-script.md). The video still needs recording and a real URL. [Contribution notes](docs/contributions.md) preserve Ta's original credit and explain the local Pu changes without claiming an invented 50/50 GitHub split.

The optional React frontend only supplies authentication pages. The project specification requires the REST API and Postman testing, rather than a full booking frontend.

