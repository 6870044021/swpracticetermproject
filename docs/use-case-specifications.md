# WoTA base use case specifications

These six goal-level use cases correspond to the six diagrams in `VacQSequence.puml`. FR numbers refer to `SWPracticeTermProjectTodo.docx`. Authentication and authorization are preconditions or guards. They are not ordered use cases connected as a workflow. Extra-credit rules apply in the implementation but their internal sequences are outside the required base diagrams.

## UC1 Register account

- **System / actor:** WoTA API / Visitor.
- **Requirements:** FR1.
- **Trigger:** `POST /api/v1/auth/register` with `name`, `tel`, `email`, and `password`.
- **Precondition:** The email is not already registered.
- **Actions:** The controller allows registration fields, normalizes email, validates the password, and creates a user with the ordinary `user` role. The model validates required values and hashes the password before persistence. The server issues an authentication token.
- **Response / postcondition:** HTTP 201 with `{success,token,user}`. A user account exists. Password hashes are absent from returned JSON.
- **Alternatives:** Invalid input returns 400, an existing email returns 409, and an attempt to self-register an administrator returns 403. A1 password strength and A3 password hints extend this use case.

## UC2 Sign in

- **System / actor:** WoTA API / Registered user or Administrator.
- **Requirements:** FR2.
- **Trigger:** `POST /api/v1/auth/login` with email and password.
- **Precondition:** An account exists.
- **Actions:** The controller normalizes the supplied email, loads the account including its otherwise hidden password hash, and compares the supplied password with the stored hash. On a match, it issues a signed token and an HTTP-only cookie.
- **Response / postcondition:** HTTP 200 with `{success,token,user}`. The client can authenticate protected requests.
- **Alternatives:** Missing or malformed credentials return 400. An unknown email or wrong password returns 401 without disclosing which credential failed.

## UC3 Sign out

- **System / actor:** WoTA API / Authenticated registered user or Administrator.
- **Requirements:** FR2.
- **Trigger:** `POST /api/v1/auth/logout`. GET is retained as a compatibility alias.
- **Precondition:** A valid, unrevoked token is supplied by bearer header or cookie.
- **Actions:** The server increments the user's token version and clears the authentication cookie.
- **Response / postcondition:** HTTP 200 with `{success:true,data:{}}`. Previously issued tokens for this account no longer authenticate. This deliberately signs out all currently issued tokens for the account.
- **Alternatives:** Missing, invalid, expired or revoked authentication returns 401.

## UC4 Browse co-working rooms

- **System / actor:** WoTA API / Visitor, Registered user, or Administrator.
- **Requirements:** FR3 catalogue information. Public reading preserves the existing API behavior.
- **Trigger:** `GET /api/v1/rooms` or `GET /api/v1/rooms/{id}`.
- **Actions:** The controller validates supported query parameters, queries rooms, and returns the requested catalogue page or one room. The room information includes name, address, telephone and the opening/closing interval in `openCloseTimes`.
- **Response:** Collection: HTTP 200 `{success,count,total,pagination,data:Room[]}`. Item: HTTP 200 `{success,data:Room}`.
- **Alternatives:** Invalid query or identifier returns 400; a missing room returns 404. Public room JSON does not populate private reservations or notes.

## UC5 Manage reservations

- **System / actor:** WoTA API / Authenticated Registered user or Administrator.
- **Requirements:** FR3-FR9.
- **Preconditions:** Valid authentication. A user may access their own reservations. An administrator may read, update, or delete any reservation.
- **Create:** `POST /api/v1/rooms/{roomId}/reservations` with `reservationDate` and optionally `endTime`. The server derives the owner from the authenticated account. It loads the room and counts active reservations. Ordinary users can have at most three active reservations. Creation returns HTTP 201 `{success,data:Reservation}`.
- **Read:** `GET /api/v1/reservations`, `GET /api/v1/rooms/{roomId}/reservations`, or `GET /api/v1/reservations/{id}`. The user query is scoped to their account. Administrators can retrieve all reservations. Responses return one record or `{success,count,data:Reservation[]}`.
- **Edit:** `PUT /api/v1/reservations/{id}`. The service loads the reservation, checks ownership or admin role, validates allowed changes, and persists them. The owner cannot be replaced through the request body. HTTP 200 returns the updated reservation.
- **Delete:** `DELETE /api/v1/reservations/{id}`. The service checks ownership or admin role and deletes the reservation. HTTP 200 returns `{success:true,data:{}}`.
- **Alternatives:** Authentication fails with 401, cross-user access with 403, missing records with 404, invalid input/three-reservation limit with 400, and conflicts with 409.
- **Additional rules:** A4 checks interval availability and opening hours. A6/A7 enforce at least one hour before the existing booking begins, including admin changes; rescheduling must also leave at least one hour before the proposed start. A11 blocks suspended users from creating or rescheduling. Transaction locks preserve constraints when requests overlap. End times determine whether a booking is active. Legacy records without `endTime` use a one-hour interval. These are explicit implementation policies, not assertions that the original prose specifies every boundary.

## UC6 Manage room catalogue

- **System / actor:** WoTA API / Authenticated Administrator.
- **Source:** Preserved administrative CRUD from the pre-existing API.
- **Trigger:** POST collection, PUT item, or DELETE item under `/api/v1/rooms`.
- **Actions:** Create or update an allowlisted room representation with model validation. Changing opening hours checks existing future bookings. Room deletion removes dependent reservations, notes and reviews in the same transaction.
- **Response:** Create returns 201, update and delete return 200. Standard JSON responses match the API profiles.
- **Alternatives:** Unauthenticated requests return 401, ordinary-user writes return 403, missing rooms return 404, invalid input returns 400, and an incompatible opening-hours change is rejected.

## Vocabulary and diagram boundaries

| Term | Meaning |
| --- | --- |
| Application | The Express application mounted under `/api/v1` |
| Resource | An HTTP-addressable collection, item or authentication action |
| Representation | JSON input/output shape, as used in the course REST API UML profile |
| Registered user | An authenticated ordinary account with access to its own transactions |
| Administrator | An authenticated account with administrative access to room and reservation records |
| Active reservation | A reservation whose end is later than the current instant |
| Controller | Request/response orchestration in a JavaScript module |
| Service | Business operations independent of Express response construction |
| Model | A Mongoose model with persistence schema and validation |
| BookingLock | Persisted lock rows used inside MongoDB transactions to serialize competing writes |

`VacQclass.puml` is an API profile, not a claim that HTTP resource objects are domain subclasses. It contains three views for readability, following the view/package simplification guidance in the structural-modeling lecture (pages 31-32). `architecture.puml` shows actual modules and models inside subsystem packages so that packages do not remain empty, addressing the prior OOD feedback.
