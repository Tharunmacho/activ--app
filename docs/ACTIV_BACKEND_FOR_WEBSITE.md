# ACTIV — Complete Backend Specification for the Web Frontend

**Purpose of this file.** This is the single document you paste into Claude (or
hand to any developer) when building the **ACTIV website**. It describes the
*existing* production backend — the same one the React Native mobile app already
runs on — completely enough that a web frontend can be built against it with
zero backend changes, and so that a user who registers or logs in on the mobile
app can sign in with **the same email and password on the website**, see the
same data, and land on the same dashboard.

> **The rule that makes both clients work:** the mobile app and the website are
> *two clients of one API*. There is no "mobile backend" and "web backend".
> There is one Express server, one MongoDB, one `auth`/`users` pair of
> collections, one JWT scheme. The website must not create its own user table,
> its own password hashing, or its own session system. It sends the same
> `POST /api/v1/auth/login` and stores the same JWT.

---

## Table of contents

0. [TL;DR — the contract in 20 lines](#0-tldr--the-contract-in-20-lines)
1. [System architecture](#1-system-architecture)
2. [Running the backend + the one change the website needs](#2-running-the-backend-and-the-one-change-the-website-needs)
3. [Databases, collections, and the naming traps](#3-databases-collections-and-the-naming-traps)
4. [Authentication — the whole story](#4-authentication--the-whole-story)
5. [Complete API reference](#5-complete-api-reference)
6. [The geofenced 3-tier approval workflow](#6-the-geofenced-3-tier-approval-workflow)
7. [Admin-first region architecture](#7-admin-first-region-architecture)
8. [Building the website client (copy-paste code)](#8-building-the-website-client-copy-paste-code)
9. [Mobile screen → website page parity map](#9-mobile-screen--website-page-parity-map)
10. [Traps, gotchas and known quirks](#10-traps-gotchas-and-known-quirks)
11. [Verification checklist](#11-verification-checklist)
12. [**Gap audit — what is fixed and what is left**](#12-what-is-not-finished--gap-audit)

---

## 0. TL;DR — the contract in 20 lines

```
Base URL (dev)   http://localhost:5000/api/v1
Base URL (prod)  https://actv-project.onrender.com/api/v1
Static uploads   <origin>/uploads/<filename>          (NO /api/v1 prefix)

Login            POST /auth/login  { email, password }
                 -> { success, data: { token, user, role, memberDetails } }

Auth header      Authorization: Bearer <token>        (every protected call)
Token type       JWT HS256, 7-day expiry
Token payload    { userId, email, role, block, district, state, iat, exp }
                 userId === MemberDetails._id (the `users` collection _id)

Roles            member | block_admin | district_admin | state_admin | super_admin

Success shape    { success:true,  statusCode, message, data }
Error shape      { success:false, statusCode, message }   (+ stack in dev)

Landing page by role:
  member         -> /dashboard          then GET /members/my-profile
  block_admin    -> /admin/block        then GET /admin/block/dashboard
  district_admin -> /admin/district     then GET /admin/district/dashboard
  state_admin    -> /admin/state        then GET /admin/state/dashboard
  super_admin    -> /admin/super        then GET /admin/super/overview
```

**The only backend change the website requires:** add the website's origin to
`CORS_ORIGIN` in `backend/.env`. See [§2.3](#23-️-the-only-backend-change-the-website-requires--cors).

---

## 1. System architecture

### 1.1 Repository layout

| Path | What it is |
|---|---|
| `backend/` | Node 18+ / Express 4 / Mongoose 8 API. **Serves both clients.** |
| `frontend/` | React Native 0.8x app (TypeScript). The existing mobile client. |
| `docs/` | Specifications and API documentation (this file lives here). |
| *(new)* `web/` | Where the website frontend goes. Talks to `backend/` over HTTP only. |

### 1.2 Request lifecycle

```
Browser / Mobile app
      │  HTTPS + Authorization: Bearer <jwt>
      ▼
src/server.js       http server, connects Mongo + adminsdb, listens on 0.0.0.0:5000
      ▼
src/app.js          static /uploads → helmet → CORS → JSON body (10mb)
                    → compression → morgan → performanceMonitor
                    → rate limit on /api (auth paths excluded)
      ▼
src/routes.js       mounts every module under /api/v1
      ▼
modules/<x>/x.routes.js       verifyToken / requireRole / express-validator
      ▼
modules/<x>/x.controller.js   thin: unwrap req, call service, wrap in ApiResponse
      ▼
modules/<x>/x.service.js      ALL business logic, ALL database access
      ▼
Mongoose models     → MongoDB Atlas (activ-db + adminsdb)
      ▼
errorHandler.js     turns a thrown ApiError into { success:false, statusCode, message }
```

### 1.3 Layer rules (follow these when extending the backend)

- **Routes** declare path + auth guard + validator. No logic.
- **Controllers** are `asyncHandler(async (req, res) => …)` — never `try/catch`,
  never touch Mongoose. Always respond via `ApiResponse.success(...)` /
  `ApiResponse.created(...)`.
- **Services** are singleton class instances (`module.exports = new XService()`),
  hold every query, and throw
  `ApiError.badRequest | unauthorized | forbidden | notFound | conflict | internal`.
- **Models** pin their collection explicitly with `{ collection: '…' }` because
  several collection names are legacy and do not match the model name.
- **Validators** must call `next(ApiError.badRequest(...))`, never `throw`.
  Express 4 does not await async middleware, so a throw becomes an unhandled
  rejection.

### 1.4 Two Mongo connections

| Connection | Database | Opened by | Holds |
|---|---|---|---|
| default (`mongoose`) | `activ-db` | `src/config/db.js` | auth, users, applications, companies, products, events, audit_logs, notifications, the 4 member-form collections |
| secondary | `adminsdb` | `src/modules/admin/adminsDb.js` | `blockadmins`, `districtadmins`, `stateadmins`, `superadmins` |

The `adminsdb` URI is derived from `MONGODB_URI` by swapping `/activ-db` for
`/adminsdb`. `adminsDb.ensureReady()` (**not** `isReady()`) is what callers
await; it is warmed at boot in `server.js`. If `adminsdb` is unreachable the API
keeps serving — admin *creation* fails, everything else degrades gracefully.

### 1.5 Caching

`core/cache/cacheClient.js` supports Redis but **Redis is currently disabled**
(`config/redis.js` returns `null` immediately). Everything falls back to an
in-process `Map`. Consequences:

- Cache is per-process and dies on restart.
- Multiple server instances do not share cache.
- `/auth/me` depends on this cache — see [§4.6](#46-the-authme-quirk-use-membersmy-profile-instead).

---

## 2. Running the backend (and the one change the website needs)

### 2.1 Start

```bash
cd backend
npm install
cp .env.example .env        # then fill in real values
npm run dev                 # nodemon, port 5000
# or
npm start                   # node src/server.js
# or
npm run pm2:start           # production, pm2.config.js
```

Health check: `GET http://localhost:5000/api/v1/health` →

```json
{ "success": true, "message": "Server is running",
  "timestamp": "2026-08-25T10:00:00.000Z", "environment": "development" }
```

### 2.2 Environment variables (`backend/.env`)

```ini
NODE_ENV=development
PORT=5000
API_VERSION=v1

# MongoDB — one URI; adminsdb is derived by swapping the db name
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster1.gf7usct.mongodb.net/activ-db

# JWT — MUST be identical for every process serving either client
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<different-long-random-string>
JWT_REFRESH_EXPIRES_IN=30d

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS — comma separated. ADD THE WEBSITE ORIGIN HERE.
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://www.activ.org

# Email (optional; bulk-admin welcome mails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=ACTIV Platform <noreply@activ.com>

# Uploads
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Payments (Instamojo)
INSTAMOJO_API_KEY=
INSTAMOJO_AUTH_TOKEN=
INSTAMOJO_PRIVATE_SALT=
INSTAMOJO_BASE_URL=https://api.instamojo.com/v2

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Migration switches — leave both off in production
ADMIN_DEMO_PASSWORDS=
ADMIN_COVERAGE_INCLUDE_LEGACY=false
```

`JWT_SECRET` **must be the same value** wherever the API runs. A token issued by
one process with a different secret will be rejected by another — that is the
one way the "same login on both clients" promise can break.

### 2.3 ⚠️ THE ONLY BACKEND CHANGE THE WEBSITE REQUIRES — CORS

The mobile app is a native client and is not subject to the browser same-origin
policy, so CORS never mattered before. **A browser is subject to it.**
`backend/src/core/middleware/security.js` configures:

```js
app.use(cors({
    origin: config.cors.origin,     // ← from CORS_ORIGIN env, split on ','
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    exposedHeaders: ['Content-Length','X-Request-Id']
}));
```

So: **put every origin the website is served from into `CORS_ORIGIN`** — the dev
origin (`http://localhost:5173` for Vite, `http://localhost:3000` for Next/CRA)
and the production domain. Missing this is the #1 cause of "it works in Postman
but the website gets a network error".

- `Authorization` is already in `allowedHeaders`, so bearer-token auth needs no
  further change.
- `credentials: true` is set, but the API does **not** use cookies — it uses the
  `Authorization` header — so you do **not** need `withCredentials` on the client.
- `/uploads` is served with `crossOriginResourcePolicy: 'cross-origin'`, so
  `<img src="https://api.…/uploads/x.jpg">` loads cross-origin fine.

### 2.4 Rate limits (browsers hit these faster than phones do)

| Scope | Window | Max | Notes |
|---|---|---|---|
| `/api/*` except `/auth/*` | 15 min | 100 (`RATE_LIMIT_MAX_REQUESTS`) | per IP |
| `/auth/register`, `/auth/login`, `/auth/refresh` | 15 min | 100 | own bucket, so heavy browsing can't lock you out of login |
| `/regions/*` | 15 min | 200 | public, unauthenticated |

Exceeding returns `429 { success:false, message:'Too many requests, please try again later' }`.

React `StrictMode` double-renders and unthrottled search-as-you-type will burn
this fast. **Debounce search inputs and guard effects on the website.**

---

## 3. Databases, collections, and the naming traps

### 3.1 Collection map (`activ-db`)

| Model file | Mongoose model | **Actual collection** | Key field |
|---|---|---|---|
| `modules/auth/auth.model.js` | `MemberAuth` | **`auth`** | `email` (unique) |
| `modules/members/memberdetails.model.js` | `MemberDetails` | **`users`** | `_id` / `email` (unique) |
| `modules/members/businessinfo.model.js` | `BusinessInfo` | **`additional form for bussiness 2`** *(sic)* | `userId` (unique) |
| `modules/members/memberfinancialinfo.model.js` | `MemberFinancialInfo` | **`additional form for financial 3`** | `memberId` (unique) |
| `modules/members/memberdeclaration.model.js` | `MemberDeclaration` | **`additional form for declaration 4`** | `userId` (UNIQUE) + `memberId` |
| `modules/members/personalinfo1.model.js` | `PersonalInfo1` | personal-details form mirror | `userId` |
| `modules/members/company.model.js` | `Company` | `companies` | `userId` |
| `models/Product.js` | `Product` | `products` | `userId`, `companyId` |
| `modules/applications/application.model.js` | `Application` | `applications` | `userId` |
| `modules/events/event.model.js` | `Event` | `events` | — |
| `modules/audit/audit.model.js` | `AuditLog` | `audit_logs` | append-only |
| `modules/notifications/notification.model.js` | `Notification` | `notifications` | `user` |
| `modules/common/connection.model.js` | `Connection` | `connections` | `senderId` + `recipientId` |
| `modules/common/activity.model.js` | `Activity` | `activities` | `memberId` |

> **Trap.** The collection names containing spaces and the misspelling
> `bussiness` are real and intentional (legacy data). Never "fix" them.
> Mongoose strict mode silently drops unknown paths, so writing the wrong key
> field fails with **no error** and produces a document that looks saved but is
> invisible to every query.

> **Trap.** `additional form for declaration 4` carries a UNIQUE index on
> `userId`. A unique index permits exactly one `null`, so the *second* document
> ever written without `userId` fails with `E11000`. Always populate both
> `userId` and `memberId`.

> **Note.** There are two `Product` definitions in the tree —
> `models/Product.js` (used by `product.controller.js`, has `userId`, `stock`,
> `sku`, `isActive`, `isFeatured`) and `modules/common/product.model.js` (older,
> has `companyId`, `status`, `featured`). **The live one is `models/Product.js`.**
> Build the website against its field names.

### 3.2 Collection map (`adminsdb`)

| Model | Collection | Role |
|---|---|---|
| `BlockAdmin` | `blockadmins` | `block_admin` |
| `DistrictAdmin` | `districtadmins` | `district_admin` |
| `StateAdmin` | `stateadmins` | `state_admin` |
| `SuperAdmin` | `superadmins` | `super_admin` |

Plus a legacy unified `admins` collection in the **main** database, kept
readable for accounts that predate the split.

`admin.repository.js` is the **only** module allowed to read or write any admin
collection. It hides two field-name translations that fail *silently* if bypassed:

| Canonical (what callers pass) | Unified `admins` | Segregated per-tier |
|---|---|---|
| `passwordHash` | `password` | `passwordHash` |
| `phoneNumber` | `phone` | `phoneNumber` |
| `active` | `isActive` | `active` |

### 3.3 The two-collection identity design (why login looks the way it does)

```
auth  collection   { email (unique), password (bcrypt, select:false),
                     isActive, lastLogin, createdAt, updatedAt }

users collection   { _id, fullName, email (unique), phoneNumber,
                     state, district, block, city, aadhaarNumber (select:false),
                     educationalQualification, religion, socialCategory,
                     profileCompleted, approvedBy, approvedBlock, approvedAt,
                     membershipStatus, membershipType, membershipActivatedAt,
                     role, isActive, profilePhoto, createdAt, updatedAt }
```

The **credential** lives in `auth`. The **identity/profile** lives in `users`.
They are joined **by email**, not by `_id`. `MemberAuth._id !== MemberDetails._id`.

**The JWT's `userId` is `MemberDetails._id`** (the `users` collection `_id`).
Every protected member endpoint uses it as the member key. Remember this — it is
the source of the `/auth/me` quirk in [§4.6](#46-the-authme-quirk-use-membersmy-profile-instead).

### 3.4 Key enums

```
users.membershipStatus   pending | approved | active | expired | cancelled
users.membershipType     annual | lifetime | none
users.role               member | admin
users.socialCategory     'Christian ST' | 'Christian SC' | 'ST' | 'SC' | 'Others' | ''

applications.status      PENDING | Pending-Block | Pending-District |
                         Pending-State | Approved | Rejected

companies.businessType   Manufacturing | Trader | Service Provider | Others
companies.status         pending | active | inactive

businessinfo.constitutionType  OPC | TRUST | SOCIETY | Proprietorship |
                               Partnership | Private Limited | ''
businessinfo.businessTypes[]   Manufacturing | Trader | Service Provider | Others
businessinfo.govtOrganizations[]  MSME | KVIC | NABARD | None | Others

financial.turnoverRange  'Below 1 Lakh' | '1-5 Lakhs' | '5-10 Lakhs' |
                         '10-50 Lakhs' | '50 Lakhs - 1 Crore' | 'Above 1 Crore'
financial.status         draft | submitted | verified | rejected

events.status            draft | published
```

---

## 4. Authentication — the whole story

### 4.1 Why the same email/password works on both clients

Nothing in the login path is client-aware. `POST /api/v1/auth/login` reads the
same `auth` collection, compares the same bcrypt hash, and issues a JWT signed
with the same `JWT_SECRET`. The token is a plain string — the mobile app puts it
in `AsyncStorage`, the website puts it in `localStorage`. Both send it as
`Authorization: Bearer <token>`.

**Therefore:** register on mobile → log in on the website with the same
credentials → same `userId`, same profile, same application, same dashboard.
No sync step, no migration, no account linking.

### 4.2 Registration — `POST /auth/register`

```
Request  { fullName, email, password, phoneNumber, state, district, block, city? }
```

Validation (`auth.validators.js`):

| Field | Rule |
|---|---|
| `email` | valid email, normalized (lowercased) |
| `password` | min 6 characters |
| `fullName` | non-empty after trim |
| `phoneNumber` | exactly 10 digits, `/^[0-9]{10}$/` |

Server flow (`auth.service.js → register`):

1. Reject if `users.email` already exists → `409 Email already registered`.
2. **Region coverage gate.** `regionService.validateRegion({state, district, block})`.
   If no active admin covers that block → `400` with a specific reason like
   `No active admin covers the block "X" in Y. Choose a block from the list.`
   On success the *canonical spellings* come back and are what get stored.
3. Insert into `users` — **no password field here** — with
   `role:'member'`, `isActive:true`, `profileCompleted:false`,
   `membershipStatus:'pending'`, `membershipType:'none'`.
4. Insert into `auth` — `{ email, password, isActive:true }`. The pre-save hook
   bcrypt-hashes with salt rounds 10.
5. Issue tokens.

```
201 Response
{
  "success": true, "statusCode": 201, "message": "Registration successful",
  "data": {
    "user": { "id": "<users._id>", "memberId": "<users._id>",
              "email": "a@b.com", "role": "member" },
    "memberDetails": { …the full users document… },
    "token": "<jwt>"
  }
}
```

> **Note:** register does **not** return a top-level `role` key (login does).
> Read `data.user.role` after registering.

### 4.3 Login — `POST /auth/login`

```
Request  { email, password }
```

Server flow (`auth.service.js → login`), in this exact order:

**Path A — member.**
1. `auth.findOne({ email }).select('+password')`.
2. If found and `isActive === false` → `403 Account is deactivated`.
3. `bcrypt.compare`. Mismatch → `401 Invalid credentials`.
4. `users.findOne({ email })` for the profile.
5. Normalize role (`blockadmin`/`block_admin` → `block_admin`, etc.).
6. Sign a JWT that **includes the location claims** `block`, `district`, `state`
   from the profile — the geofenced admin dashboards read them off `req.user`.

**Path B — admin.** Only reached if no `auth` row matched.
1. `adminRepository.findRawByEmail(email)` scans **every** admin collection in
   **both** databases, so an account deleted from the primary collection cannot
   keep signing in through a legacy mirror, and an account that only exists in a
   mirror can still sign in.
2. Inactive → `403 Account is deactivated`.
3. Password: bcrypt if the stored hash starts with `$2`; otherwise a plaintext
   comparison (legacy seed) which is **upgraded to bcrypt in place on that login**
   — each such account is plaintext for exactly one more sign-in.
4. `ADMIN_DEMO_PASSWORDS` shared-password fallback, checked **last**, off by
   default, logged loudly on every use. Leave unset in production.
5. Sign a JWT with the admin's real `state`/`district`/`block`. **No default
   region is ever substituted** — a default here would silently geofence an
   admin to somebody else's district.

**Neither path matched** → `401 Invalid credentials`.

```
200 Response
{
  "success": true, "statusCode": 200, "message": "Login successful",
  "data": {
    "token": "<jwt>",
    "role":  "member",             // ← top-level, use this for routing
    "user": {
      "id": "68f…", "memberId": "68f…", "_id": "68f…",
      "email": "a@b.com", "fullName": "A B",
      "role": "member",
      "phoneNumber": "9876543210",   // admins only
      "state": "Tamil Nadu", "district": "Ariyalur", "block": "Andimadam"
    },
    "memberDetails": { …full profile (member) or the same admin object… }
  }
}
```

### 4.4 The JWT

Signed HS256 with `JWT_SECRET`, `expiresIn: '7d'`.

```json
{
  "userId":   "68f1a2…",        // MemberDetails._id, or the admin document _id
  "email":    "a@b.com",
  "role":     "block_admin",
  "block":    "Andimadam",
  "district": "Ariyalur",
  "state":    "Tamil Nadu",
  "iat": 1756100000, "exp": 1756704800
}
```

`verifyToken` (`core/middleware/auth.js`) reads
`req.headers.authorization?.split(' ')[1]`, verifies, and assigns the decoded
payload to `req.user`. So inside any handler:
`req.user.userId`, `req.user.role`, `req.user.email`, `req.user.block`, …

Failure modes: no header → `401 No token provided`; bad/expired →
`401 Invalid or expired token`.

`requireRole(...roles)` compares `req.user.role` against the allowlist →
`403 Insufficient permissions`.

`optionalAuth` attaches `req.user` when a valid token is present and `null`
otherwise, never erroring.

### 4.5 Refresh, logout, change password

| Endpoint | Notes |
|---|---|
| `POST /auth/refresh` `{ refreshToken }` | Verifies against `JWT_REFRESH_SECRET`, looks up `MemberDetails.findById(decoded.userId)`, returns `{ accessToken, refreshToken }`. **Caveat:** the login response does not currently expose `refreshToken` — only `accessToken` as `token`. Treat refresh as available-but-unused; on 401 the website should simply route back to login. |
| `POST /auth/logout` (auth) | Clears the server-side cache entry. The client must delete its own stored token. |
| `POST /auth/change-password` (auth) `{ oldPassword, newPassword }` | Uses `MemberAuth.findById(userId)` — see the `/auth/me` quirk below; for members prefer `PUT /members/profile` with `{ currentPassword, password, confirmPassword }`, which resolves the auth row by email and works reliably. |

### 4.6 The `/auth/me` quirk — use `/members/my-profile` instead

`GET /auth/me` calls `authService.getCurrentUser(req.user.userId)`, which:

1. tries the cache key `user:<userId>` (populated at login), then
2. falls back to `MemberAuth.findById(userId)`.

But `userId` is `MemberDetails._id`, **not** `MemberAuth._id`, and Redis is
disabled so the cache is per-process and dies on restart. Result: `/auth/me`
works right after login on the same process, and returns `404 User not found`
after a restart or after the 1-hour TTL.

> **Website guidance:** do not build session restoration on `/auth/me`. Use
> **`GET /members/my-profile`** for members (it does `MemberDetails.findById(req.user.userId)`
> and is correct), and **`GET /admin/profile`** for admins (it resolves through
> `admin.repository` by email). Decode the stored JWT locally for
> `role`/`userId`/region, and treat any `401` as "session over → go to login".

### 4.7 Error codes you will see

| Status | Meaning | Typical message |
|---|---|---|
| 400 | Validation / illegal state transition / uncovered region | `Validation error: …`, `Illegal status transition: …`, `No active admin covers the block "…"` |
| 401 | No/!invalid token, wrong credentials | `Invalid credentials`, `Invalid or expired token`, `No token provided` |
| 403 | Role not allowed, geofence violation, deactivated | `Insufficient permissions`, `This application belongs to a different block`, `Account is deactivated` |
| 404 | Not found | `Application not found`, `Route /api/v1/x not found` |
| 409 | Unique-index collision (mapped from Mongo `E11000`) | `That email is already in use ("a@b.com"). Please use a different one.` |
| 429 | Rate limited | `Too many requests, please try again later` |
| 500 | Unexpected | `Internal Server Error` (message is masked in production) |

---

## 5. Complete API reference

Everything below is prefixed with `/api/v1`.
🔓 = public · 🔒 = requires `Authorization: Bearer` · 👤 = role-gated.

### 5.1 Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | 🔓 | `{ success, message, timestamp, environment }` |

### 5.2 Auth — `/auth`

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 | `{ fullName, email, password, phoneNumber, state, district, block, city? }` | `201 { user, memberDetails, token }` |
| POST | `/auth/login` | 🔓 | `{ email, password }` | `200 { token, role, user, memberDetails }` |
| POST | `/auth/refresh` | 🔓 | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | 🔒 | — | `{ success:true }` |
| GET | `/auth/me` | 🔒 | — | cache-dependent, see §4.6 |
| POST | `/auth/change-password` | 🔒 | `{ oldPassword, newPassword }` | `{ success:true }` |
| POST | `/auth/forgot-password` | 🔓 | `{ email }` | `200 { message }` — **always the same response**, registered or not |
| GET | `/auth/reset-password/verify` | 🔓 | `?token=` | `{ valid: true\|false, email? }` |
| POST | `/auth/reset-password` | 🔓 | `{ token, newPassword }` (`password` also accepted) | `{ success:true }` |

### 5.3 Regions (public, drives every dropdown) — `/regions`

**These must stay mounted above `businessRoutes` in `routes.js`** — that router
is mounted at `/` and calls `router.use(verifyToken)` internally, making it a
catch-all auth gate for everything registered after it.

| Method | Path | Auth | Query | Returns |
|---|---|---|---|---|
| GET | `/regions/states` | 🔓 | — | `{ states:[{name,admins}], coverageAvailable }` |
| GET | `/regions/districts` | 🔓 | `?state=` | `{ state, districts:[{name,admins}], coverageAvailable }` |
| GET | `/regions/blocks` | 🔓 | `?state=&district=` | `{ state, district, blocks:[{name,admins}], coverageAvailable }` |
| GET | `/regions/tree` | 🔓 | — | whole nested tree in one call (best for the web) |
| GET | `/regions/validate` | 🔓 | `?state=&district=&block=` | `{ ok, reason, region:{state,district,block} \| null, bootstrap? }` |
| GET | `/regions/geography` | 🔓 | `?state=&district=` | canonical India reference, super-admin pickers only |

`coverageAvailable:false` means "the platform has no staffed region yet", which
is different from "the request failed" — show a distinct message.

**Never** ship a bundled `locations_nested.json`. The website's registration
dropdowns must read `/regions/tree`.

### 5.4 Members — `/members`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/members/my-profile` | 🔒 | The signed-in member's profile. **Use this for session restore.** Returns `{ fullName, phoneNumber, state, district, block, city, religion, socialCategory, email, profilePhoto, membershipStatus, membershipType, approvedAt, isLocked }`. Sends `Cache-Control: no-store`. |
| GET | `/members/business-info` | 🔒 | Business form (step 2). Returns defaults, never 404s on missing data. |
| GET | `/members/financial-info` | 🔒 | Financial form (step 3). |
| GET | `/members/declaration-info` | 🔒 | Declaration form (step 4). |
| PUT | `/members/profile` | 🔒 | **The multi-purpose profile writer.** See below. |
| POST | `/members/profile-photo` | 🔒 | `multipart/form-data`, field name **`profilePhoto`**, ≤5 MB, images only. Returns `{ profilePhoto: '/uploads/…' }`. |
| GET | `/members/` | 🔒 | Paginated member list. `?page=&limit=&<any users field>=`. |

**`PUT /members/profile`** accepts *any* subset of these and routes each group to
its own collection:

```jsonc
{
  // personal → PersonalInfo1 + mirrored onto `users` + synced onto Application
  "fullName": "", "phoneNumber": "", "state": "", "district": "", "block": "",
  "city": "", "religion": "", "socialCategory": "", "profilePhoto": "",

  // email change → updates BOTH `users` and `auth`
  "email": "",

  // password change → updates `auth` only (hashed by the pre-save hook)
  "currentPassword": "", "password": "", "confirmPassword": "",

  // business → BusinessInfo   (triggered when `doingBusiness` is present)
  "doingBusiness": true, "organizationName": "", "constitutionType": "",
  "businessTypes": [], "businessActivities": "", "businessCommencementYear": "",
  "numberOfEmployees": "", "memberOfOtherChamber": false, "otherChamber": "",
  "govtOrganizations": [],

  // financial → MemberFinancialInfo (triggered if ANY of these is present)
  "panNumber": "", "gstNumber": "", "udyamNumber": "",
  "filedITR": false, "turnoverRange": "", "govtSchemeBenefit": false,

  // declaration → MemberDeclaration (triggered if ANY of these is present)
  "sisterConcerns": 0, "companyNames": [], "agreeToDeclaration": true
  // "agreeToTerms" is accepted as an alias
}
```

Behaviours worth knowing on the website:

- Empty strings are **ignored**, never written — a partial save cannot blank out
  existing data.
- After a successful save the form is **locked** (`isLocked: true` comes back).
  Render the fields read-only when `isLocked` is true.
- Changing personal details **also updates the member's Application document**
  (top-level and `data.personalDetails.*`) so admin queues stay in sync.
- Password change requires `currentPassword` **only if** a password already
  exists; the two new fields must match and be ≥6 characters.
- `companyNames` may be sent as a comma-separated string; the server splits it.

### 5.5 Applications — `/applications`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/applications` | 🔒 | Submit. Also aliased at `POST /applications/submit`. |
| GET | `/applications/my-applications` | 🔒 | The caller's applications, newest first. |
| GET | `/applications/user/:userId` | 🔒 | Same, by explicit user id. |
| GET | `/applications/:id` | 🔒 | One application (populates `userId → fullName,email`). |
| GET | `/applications` | 👤 any admin | `?status=&page=&limit=` → `{ applications, pagination }`. |
| PATCH | `/applications/:id/status` | 👤 any admin | `{ status, comment }` — enforces `ALLOWED_TRANSITIONS`. |
| POST | `/applications/:id/block-review` | 👤 `block_admin`, `super_admin` | `{ action:'approve'\|'reject', rejectionReason? }` |
| POST | `/applications/:id/district-review` | 👤 `district_admin`, `super_admin` | same body |
| POST | `/applications/:id/state-review` | 👤 `state_admin`, `super_admin` | same body; approving creates the member profile |
| POST | `/applications/:id/approve` | 👤 any admin | **Tier-agnostic** — the caller's role picks the tier |
| POST | `/applications/:id/reject` | 👤 any admin | `{ rejectionReason }` (`reason` also accepted) |
| DELETE | `/applications/:id` | 👤 `super_admin` | hard delete |

**Submit body.** Send the four form sections nested under `data`:

```jsonc
POST /applications
{
  "applicationType": "membership",       // membership | business_profile | udyam_registration
  "fullName": "A B", "email": "a@b.com", "phone": "9876543210",
  "state": "Tamil Nadu", "district": "Ariyalur", "block": "Andimadam",
  "data": {
    "personalDetails": { "fullName":"", "dateOfBirth":"", "aadhaarNumber":"",
                         "streetName":"", "city":"", "block":"", "district":"",
                         "state":"", "education":"", "religion":"",
                         "socialCategory":"", "phone":"", "email":"" },
    "businessInfo":    { "doingBusiness": true, "organizationName":"",
                         "constitutionType":"", "businessTypes":[],
                         "businessActivities":"", "businessCommencementYear":"",
                         "numberOfEmployees":"", "memberOfOtherChamber":false,
                         "otherChamber":"", "govtOrganizations":[] },
    "financialInfo":   { "panNumber":"", "gstNumber":"", "udyamNumber":"",
                         "filedITR":false, "turnoverRange":"",
                         "govtSchemeBenefit":false },
    "declaration":     { "sisterConcerns":0, "companyNames":[],
                         "agreeToDeclaration":true }
  }
}
```

Server behaviour on submit:

- If the user already has an application, **the existing one is returned** — it
  is idempotent, not a duplicate-creator.
- Missing region fields are filled from the member profile; there is **no
  hardcoded default region** — an application with no resolvable region is
  rejected by the coverage gate rather than silently assigned to a real block.
- Region coverage is re-validated server-side and the canonical spellings stored.
- `role` / `memberType` are derived: `doingBusiness === false` or an explicit
  `registrationType:'aspirant'` → `aspirant`; otherwise `business`.
- Status starts at `Pending-Block`.

### 5.6 Business profiles (companies) — mounted at `/`

⚠️ This router is mounted at the API root and applies `verifyToken` to itself,
which is why `/regions` must be registered before it.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/business-profiles` | 🔒 | Create. `multipart/form-data`, logo field name **`logo`** (≤10 MB). Required: business name, mobile, location. |
| GET | `/business-profiles/me` | 🔒 | The caller's newest company. 404 if none. |
| GET | `/business-profiles/all` | 🔒 | All of the caller's companies. |
| GET | `/business-profiles/discover` | 🔒 | **Network-wide directory.** `?q=&limit=` (default 200, max 500). Searches company `businessName`/`businessType` **and** product `name`/`category`/`sku`, and returns each company with its product list attached. |
| GET | `/business-profiles/:id` | 🔒 | One company. `id` may literally be `me`. |
| PUT | `/business-profiles/me` | 🔒 | Update the caller's company (multipart, `logo`). |
| PUT | `/business-profiles/:id` | 🔒 | Owner-scoped update. |
| DELETE | `/business-profiles/me` | 🔒 | |
| DELETE | `/business-profiles/:id` | 🔒 | |

Accepted body aliases (send either): `businessName` ↔ `organizationName`,
`mobileNumber` ↔ `phone`, `businessType` ↔ `businessTypes`
(a JSON-string array is parsed; the first element wins).
`isActive:false` delists the company from Discover without deleting it.

### 5.7 Products — `/products`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/products` | 🔒 | Create. multipart, image field name **`image`**. Attaches to `companyId`, or the caller's newest company if omitted. 404 if the caller has no company. |
| GET | `/products` | 🔒 | The caller's products. `?companyId=`. Populates `companyId → businessName, location, mobileNumber`. |
| GET | `/products/discover` | 🔒 | **Network-wide** product search. `?q=&companyId=&limit=` (max 300). Only `isActive:true`. Matches identity fields only (`name`, `category`, `sku`) — deliberately not `description`. |
| GET | `/products/stats` | 🔒 | Counts for the business dashboard. |
| GET | `/products/activities` | 🔒 | Recent activity feed. |
| GET | `/products/:id` | 🔒 | |
| PUT | `/products/:id` | 🔒 | multipart, `image` |
| DELETE | `/products/:id` | 🔒 | |

Static paths (`/discover`, `/stats`, `/activities`) are declared **before**
`/:id` — Express matches in order.

Product fields: `{ userId, companyId, name, description, category, price, stock,
sku (unique sparse), imageUrl, isFeatured, isActive, views }`.

> Product endpoints respond with a **bare** `{ success, data, count }` shape
> rather than the `ApiResponse` envelope. Unwrap defensively:
> `const payload = res.data?.data ?? res.data ?? []`.

### 5.8 Admin — `/admin` (all routes require a token)

**Tier dashboards** (geofenced to the caller's own region):

| Method | Path | Roles |
|---|---|---|
| GET | `/admin/block/dashboard` | `block_admin`, `super_admin` |
| GET | `/admin/district/dashboard` | `district_admin`, `super_admin` |
| GET | `/admin/state/dashboard` | `state_admin`, `super_admin` |
| GET | `/admin/super/dashboard` | `super_admin` |

Dashboard response shape (block shown; district adds `blocks[]`, state adds
`districts[]`):

```jsonc
{
  "stats": {
    "totalMembers": 12, "pendingApplications": 3, "approvedApplications": 8,
    "rejectedApplications": 1, "totalApplications": 12,
    "activeBusinesses": 5, "totalRevenue": 0,
    "blockName": "Andimadam", "districtName": "Ariyalur", "stateName": "Tamil Nadu"
  },
  "applicants": { "pending": [Applicant], "approved": [Applicant],
                  "rejected": [Applicant], "all": [Applicant] },
  "recentActivities": [ { "id","type","message","timestamp" } ]
}
```

If the admin's region cannot be resolved the response is an **empty dashboard**
with `scopeUnresolved: true` and a `message` telling them to ask the Super Admin
to set their region. Render that message — do not show zeros silently.

**The `Applicant` object** (produced by `buildApplicant`, the same shape every
admin screen renders):

```jsonc
{
  "id": "…", "applicationId": "…", "memberId": "…", "memberCode": "",
  "fullName": "", "email": "", "phone": "", "role": "Business Member",
  "doingBusiness": true, "gender": "",
  "block": "", "district": "", "state": "", "city": "",
  "status": "Pending-Block",        // NORMALIZED canonical value
  "rawStatus": "pending_block_approval",  // whatever the document holds
  "stage": "pending",               // pending|approved|rejected|upstream|closed
  "level": "block",
  "statusLabel": "Pending",
  "approvedByText": "Approved by Andimadam Block Admin",
  "orphaned": false, "owningTier": "block", "effectiveTier": "block",
  "fallbackReason": "",
  "submittedAt": "…", "blockApprovedAt": null,
  "districtApprovedAt": null, "stateApprovedAt": null,
  "rejectionReason": "", "rejectedBy": { "adminType": "", "rejectedAt": null },
  "personalDetails": { … }, "businessInfo": { … },
  "financialInfo": { … }, "declaration": { … }
}
```

**Super admin command centre:**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/super/overview` | Global, ungeofenced KPIs + bottleneck detection |
| GET | `/admin/super/search` | `?q=` — cross-entity search (limit 8) |
| GET | `/admin/super/applications` | Every application, filterable |
| GET | `/admin/super/directory` | Region directory with staffing counts |
| GET | `/admin/super/admins` | List admin accounts (each row annotated with `coAdmins`) |
| GET | `/admin/super/admins/regions` | Existing region-name suggestions for the create form |
| POST | `/admin/super/admins` | Create — `{ role, fullName, email, password (≥8), phoneNumber?, state, district?, block? }` |
| GET | `/admin/super/admins/:id/removal-preview` | What deleting this admin does to their queue |
| PUT | `/admin/super/admins/:id` | Update (region fields are editable) |
| DELETE | `/admin/super/admins/:id` | Permanent delete, everywhere |
| GET | `/admin/super/admins/bulk/template` | `{ headers, csv, maxRows }` |
| POST | `/admin/super/admins/bulk/validate` | `{ csv }` — dry run, writes nothing |
| POST | `/admin/super/admins/bulk` | `{ csv, sendEmails?, strict? }` — commit (max 5000 rows) |
| POST | `/admin/super/profile/photo` | multipart, field **`photo`** |

Route-order note: `/super/admins/regions`, `/super/admins/bulk/*` are declared
**before** `/super/admins/:id`, because a literal segment registered after a
parameterised one is never reached.

**Shared admin routes:**

| Method | Path | Roles |
|---|---|---|
| GET | `/admin/stats` | any admin |
| GET | `/admin/users` | any admin — `?page=&limit=` |
| PATCH | `/admin/users/:id/role` | `super_admin` |
| PATCH | `/admin/users/:id/toggle-status` | `super_admin` |
| POST | `/admin/users/:id/:action` | any admin — `action` ∈ `activate` \| `suspend` \| `delete` |
| GET | `/admin/analytics` | any admin — `?period=month`, geofenced |
| POST | `/admin/reports/generate` | any admin, geofenced |
| GET | `/admin/profile` | any signed-in admin — resolves via `admin.repository` |
| PUT | `/admin/profile` | `{ fullName?, email?, phoneNumber?, state?, district?, block? }`; reads the saved record back rather than echoing the request |

### 5.9 Events — `/events`

| Method | Path | Auth |
|---|---|---|
| GET | `/events` | 🔒 any user (drafts hidden from non-admins) |
| GET | `/events/:id` | 🔒 |
| POST | `/events` | 👤 `super_admin`, multipart field **`banner`** |
| PUT | `/events/:id` | 👤 `super_admin` |
| PATCH | `/events/:id/status` | 👤 `super_admin` — `{ status:'draft'\|'published' }` |
| DELETE | `/events/:id` | 👤 `super_admin` |

Fields: `{ title, description, startAt, endAt, venue, state, district, block,
bannerUrl, status, createdBy }`. Empty region fields mean "everywhere".

### 5.10 Notifications — `/notifications` (all 🔒)

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | `?page=&limit=` → `{ notifications, pagination, unread }` |
| PATCH | `/notifications/:id/read` | mark one read |
| PATCH | `/notifications/read-all` | mark all read |

The user is derived from the token — there is **no** `/notifications/:userId`.

### 5.11 Analytics — `/analytics`

Requires `district_admin`, `state_admin` or `super_admin`.

| Method | Path | Query |
|---|---|---|
| GET | `/analytics/user-growth` | `?period=30d` → daily counts |
| GET | `/analytics/applications` | grouped counts by status |
| GET | `/analytics/members` | `{ total, approved, byDistrict[] }` |

### 5.12 Audit — `/audit` (👤 `super_admin`, read-only)

| Method | Path |
|---|---|
| GET | `/audit` |
| GET | `/audit/counts` |

Append-only by design: entries are written from inside the actions themselves,
never over HTTP, and no route updates or deletes one.

### 5.13 Payments — `/payment` and `/webhook`

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/payment/create-request` | 🔒 | `{ amount, purpose, membershipType }` |
| GET | `/payment/status/:paymentRequestId` | 🔒 | — |
| POST | `/payment/renew` | 🔒 | `{ memberId, amount }` |
| POST | `/payment/complete` | 🔒 | `{ paymentId, paymentMethod, transactionId, status, membershipType }` |
| POST | `/webhook/instamojo` | 🔓 | Instamojo callback; always answers 200 to prevent retry storms |

Amount is validated against the membership type server-side:

```
starter 500 · intermediate 1000 · advanced 2000 · lifetime 2500 · aspirant 500
```

`/payment/complete` flips the member to `membershipStatus:'approved'` and stamps
`membershipActivatedAt`, `paymentId`, `lastPaymentDate`.

### 5.14 File uploads — the rules

| Endpoint | Field name | Limit | Filter |
|---|---|---|---|
| `POST /members/profile-photo` | `profilePhoto` | 5 MB | images only |
| `POST /business-profiles`, `PUT /business-profiles/*` | `logo` | 10 MB | — |
| `POST /products`, `PUT /products/:id` | `image` | 10 MB | — |
| `POST /events`, `PUT /events/:id` | `banner` | 5 MB | images only |
| `POST /admin/super/profile/photo` | `photo` | 5 MB | images only |

Files land in `backend/uploads/` and are served statically at
`<origin>/uploads/<filename>` — **no `/api/v1` prefix**.

**The database always stores a relative path** (`/uploads/company-logo-172….jpg`),
never an absolute URL. That is deliberate: an absolute URL built from
`req.get('host')` points at whatever host the *uploading* device dialled
(`localhost`, `10.0.2.2`, a stale LAN IP) and 404s for everyone else. The client
re-anchors it. See `resolveMediaUrl` in [§8.4](#84-resolving-image-urls).

**Do not set `Content-Type` manually when posting FormData** — let the browser
set the multipart boundary. With axios, pass the `FormData` and delete the
default header for that request.

---

## 6. The geofenced 3-tier approval workflow

### 6.1 State machine (strictly sequential)

```
submit ─► Pending-Block ─approve─► Pending-District ─approve─► Pending-State ─approve─► Approved
              │                          │                          │        (creates the member profile)
              └────────── reject ────────┴───────── reject ─────────┴──► Rejected
```

`Approved` and `Rejected` are terminal. The legal transitions live in
`ALLOWED_TRANSITIONS` in `application.service.js`:

```js
'Pending-Block'    : ['Pending-District', 'Rejected'],
'Pending-District' : ['Pending-State',    'Rejected'],
'Pending-State'    : ['Approved',         'Rejected'],
'Approved'         : [],
'Rejected'         : []
```

`PENDING` is a legacy synonym for `Pending-Block` and is handled everywhere
`Pending-Block` is.

### 6.2 Status vocabularies — always normalize

Three spellings exist in live data:

1. canonical — `Pending-Block`, `Pending-District`, `Pending-State`, `Approved`, `Rejected`
2. verbose snake_case — `pending_block_approval`, `pending_district_approval`, …
3. bare lowercase — `approved`, `rejected`, `submitted`, `blockapproved`, …

**Never compare `application.status` directly.** The server runs it through
`normalizeStatus()` (`modules/common/applicationStatus.js`) on both read and
write. Unknown values fall back to `Pending-Block` — an unrecognised application
is safest treated as still needing the first review.

On the website, read the **`status`** field of an `Applicant` (already
normalized) and use `rawStatus` only for debugging.

### 6.3 Bucket rules — the same application shows a different stage to each tier

| Tier | `pending` | `approved` | `rejected` |
|---|---|---|---|
| Block | `Pending-Block` / `PENDING` | `blockApprovedAt` set, or status past block | any rejection |
| District | `Pending-District` **only** | `districtApprovedAt` set, or `Pending-State`/`Approved` | `rejectedBy.adminType === 'DistrictAdmin'` |
| State | `Pending-State` **only** | `Approved` | `rejectedBy.adminType === 'StateAdmin'` |

Two extra stages exist for files a tier can *see* but not act on:

- **`upstream`** — still awaiting an earlier tier ("In Progress")
- **`closed`** — rejected by a different tier

They appear in the `all` bucket and in no action queue. The website's approval
queue should therefore render **4 tabs: Pending / Approved / Rejected / All**,
exactly like the mobile `ApprovalQueue` component.

> Never substring-match on the status string.
> `'Pending-District'.includes('pending')` is why the block queue once leaked
> downstream files.

### 6.4 Geofencing — reads *and* writes

Every dashboard query is scoped by the admin's own location via
`resolveAdminScope(user)` + `buildGeoFilter(field, value)`:

- Scope resolves from the **JWT first**, then falls back to the admin
  collections by email. If it cannot be resolved, the answer is **empty** —
  never a guessed default region.
- The geo filter matches three paths — `<field>`, `data.personalDetails.<field>`,
  `data.personal.<field>` — anchored, case-insensitive, with regex
  metacharacters escaped.
- **Reads are not enough:** `assertWithinScope()` re-checks the geofence on every
  approve/reject, so knowing an application id does not let an admin act outside
  their region → `403 This application belongs to a different block`.
  `super_admin` bypasses.

### 6.5 Orphan fallback routing

If the tier that owes a decision has **no active admin**, the file bubbles up to
the first tier above that does. This is computed **at read time** from live
staffing (`modules/common/tierRouting.js`), never by rewriting the stored status,
so the queue heals in both directions when an admin is added or removed.

The website should render the `orphaned` / `fallbackReason` fields on the
applicant card — an admin must never be asked to decide on another tier's file
without being told why it reached them:

> *"No active Block Admin for this region — escalated to the District tier"*

When such a file is approved, the acting tier **absorbs** the skipped steps
(they are stamped with real timestamps plus a `FallbackRouting` note), so one
approve advances the file properly instead of dropping it into the actor's own
queue.

### 6.6 Final approval is transactional

`commitFinalApproval()` writes the four member documents **and** the application
status flip inside one MongoDB transaction, with a compensating-delete fallback
for standalone servers. It creates/updates:

1. `users` (MemberDetails) — `profileCompleted:true`, `approvedBy`,
   `approvedBlock`, `approvedAt`, `membershipStatus:'pending'` (pending payment)
2. `additional form for bussiness 2` (BusinessInfo)
3. `additional form for financial 3` (MemberFinancialInfo)
4. `additional form for declaration 4` (MemberDeclaration)

Do not reorder it to save the application first: a partial write leaves an
application stuck in the terminal `Approved` state with no member record, and
terminal states refuse retries.

**After state approval the member is `Approved` but `membershipStatus:'pending'`
— they still have to pay.** The website's member dashboard must handle
"approved but unpaid" as its own state.

### 6.7 Audit trail

Every approve/reject writes an immutable `audit_logs` entry with denormalised
actor details (so the log still reads correctly after the admin is renamed or
deleted), plus `proxy:true` when a super admin acted in place of a tier.

---

## 7. Admin-first region architecture

The admin collections are the **single source of truth for geography**. Whatever
region names the Super Admin types become, on save, the options an applicant
sees. Nothing else decides which regions exist.

### 7.1 Selectability is bottom-up

```
a block is selectable    ⟸ ≥ 1 active block admin
a district is selectable ⟸ ≥ 1 selectable block
a state is selectable    ⟸ ≥ 1 selectable district
```

Bottom-up because it cannot produce a dead end. A state admin alone puts the
state in the hierarchy but gives an applicant nothing to pick beneath it.
**Creating a block admin is what opens a region for registration.**

### 7.2 Free-text regions, no enforced hierarchy

There is deliberately **no** requirement that a parent admin exists. Typing
"New Super Block" into a brand-new district in a brand-new state is a valid
one-step way to open that region. `admin.regions.js` resolves *spelling only*:

1. a region with that name already exists → reuse its exact spelling
2. the canonical India reference recognises it → use that spelling
3. otherwise → accept as typed, and report it in `regionsCreated`

That reconciliation is not cosmetic: `buildGeoFilter` matches with an anchored
regex, so "Tamil Nadu" and "tamil  nadu" would be two different regions, each
holding half of one queue.

### 7.3 Real staffing vs the legacy scaffold

`adminsdb` was pre-seeded with a placeholder admin for every region in India
(~7,700 records). Counting those as staffing would put all 6,966 blocks back in
the dropdowns. Every account this application creates stamps **`createdVia`**
(`super_admin_ui` / `bulk_csv` / `tn_pilot_seed` / `migrated_from_admins`); the
scaffold has none, so that field is the discriminator.

- Coverage, directory, hierarchy → **stamped records only**
- Login and delete → **every** record, scaffold included

### 7.4 What this means for the website

- Registration state/district/block pickers **must** call `/regions/tree` (or the
  three list endpoints), never a bundled JSON file.
- Handle `coverageAvailable:false` with a distinct empty state.
- Optionally call `/regions/validate` before submitting so the user sees the
  problem before the POST.
- Server-side re-validation on register and on application submit will reject an
  uncovered region with a specific, user-facing `400` message — surface it verbatim.

### 7.5 Migration commands (reference)

```bash
cd backend
node scripts/migrate-to-segregated-admins.js            # dry run
node scripts/migrate-to-segregated-admins.js --confirm  # apply
```

Five phases in this order because the extraction reads what the wipe destroys:
extract regions → back up → migrate real accounts → delete the scaffold → seed
the pilot. Generated credentials go to `backups/pilot-credentials-*.csv` and
exist nowhere else.

---

## 8. Building the website client (copy-paste code)

Everything in this section is new code that lives in the **website**, not the
backend. It mirrors `frontend/src/services/api.ts` and
`frontend/src/config/api.config.ts` one-for-one, swapping `AsyncStorage` for
`localStorage`.

### 8.1 Config — `src/config/api.config.ts`

```ts
const API_CONFIG = {
  development: { baseURL: 'http://localhost:5000/api/v1', timeout: 15000 },
  production:  { baseURL: 'https://actv-project.onrender.com/api/v1', timeout: 75000 },
};

const ENV = import.meta.env.DEV ? 'development' : 'production';
// Next.js:  const ENV = process.env.NODE_ENV === 'production' ? 'production' : 'development';

export const API_BASE_URL = API_CONFIG[ENV].baseURL;
export const API_TIMEOUT  = API_CONFIG[ENV].timeout;

/** Origin that serves /uploads — the base URL minus the /api/v1 suffix. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
```

The production timeout is long on purpose: the API is hosted on Render's free
tier and cold-starts take up to ~60 s. Show a "waking the server up" state
rather than failing fast.

### 8.2 The axios instance — `src/services/api.ts`

```ts
import axios, { AxiosError } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../config/api.config';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'activ_auth_token',
  USER_DATA:  'activ_user_data',
  USER_ROLE:  'activ_user_role',
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Let the browser set the multipart boundary itself.
  if (config.data instanceof FormData) delete config.headers['Content-Type'];

  return config;
});

// Clear the session on 401 — but never during a login/register attempt,
// or a wrong password would look like a session expiry.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthAttempt) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export default api;
```

### 8.3 Unwrapping responses defensively

The backend returns `{ success, statusCode, message, data }` from most routes
but a **bare** `{ success, data, count }` from the product routes. Always:

```ts
export const unwrap = <T,>(res: any, fallback: T): T =>
  (res?.data?.data ?? res?.data ?? fallback) as T;
```

### 8.4 Resolving image URLs

Stored values are relative (`/uploads/x.jpg`), but legacy rows hold absolute
URLs built from whatever host the uploading device used. Re-anchor anything
containing an `/uploads/` segment:

```ts
import { API_ORIGIN } from '../config/api.config';

export const resolveMediaUrl = (value?: string | null): string => {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  const i = raw.indexOf('/uploads/');
  if (i !== -1) return `${API_ORIGIN}${raw.slice(i)}`;

  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `${API_ORIGIN}/${raw.replace(/^\/+/, '')}`;
};
```

### 8.5 Auth context + login (the exact mobile behaviour)

```ts
export type UserRole =
  | 'member' | 'block_admin' | 'district_admin' | 'state_admin' | 'super_admin';

export const HOME_FOR_ROLE: Record<UserRole, string> = {
  member:         '/dashboard',
  block_admin:    '/admin/block',
  district_admin: '/admin/district',
  state_admin:    '/admin/state',
  super_admin:    '/admin/super',
};

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', {
    email: email.toLowerCase().trim(),
    password,
  });

  if (!res.data?.success) throw new Error(res.data?.message || 'Login failed');

  const { token, user, role } = res.data.data;
  const resolvedRole: UserRole = (role || user?.role || 'member') as UserRole;

  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user || {}));
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, resolvedRole);

  return { user, role: resolvedRole, home: HOME_FOR_ROLE[resolvedRole] ?? '/dashboard' };
}
```

Never store the user's plaintext password in the browser. (The mobile app keeps
one under `@activ_user_password` for a re-auth convenience; do **not** copy that
to the web.)

### 8.6 Session restore on page load

```ts
export function decodeJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

export async function restoreSession() {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (!token) return null;

  const claims = decodeJwt(token);
  if (!claims || (claims.exp && claims.exp * 1000 < Date.now())) {
    localStorage.clear();
    return null;
  }

  const role: UserRole = claims.role || 'member';

  // Verify against the server AND get fresh profile data.
  // Do NOT use /auth/me — see §4.6.
  const path = role === 'member' ? '/members/my-profile' : '/admin/profile';
  const res = await api.get(path);        // a 401 here is handled by the interceptor

  return { claims, role, profile: unwrap(res, {}) };
}
```

### 8.7 Route guards

```tsx
function RequireRole({ roles, children }: { roles: UserRole[]; children: JSX.Element }) {
  const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole | null;
  if (!role) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) return <Navigate to={HOME_FOR_ROLE[role] ?? '/dashboard'} replace />;
  return children;
}
```

Client-side guards are **UX only**. The server enforces `requireRole` on every
admin route and re-checks the geofence on every write, so a tampered
`localStorage` role gets a `403`, not data.

### 8.8 Uploading a file

```ts
export async function uploadProfilePhoto(file: File) {
  const form = new FormData();
  form.append('profilePhoto', file);          // field name must match exactly
  const res = await api.post('/members/profile-photo', form);
  return unwrap<{ profilePhoto: string }>(res, { profilePhoto: '' });
}

export async function createCompany(fields: Record<string, any>, logo?: File) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    form.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v ?? ''));
  });
  if (logo) form.append('logo', logo);
  return unwrap(await api.post('/business-profiles', form), null);
}
```

### 8.9 Defensive rendering rules (carried over from the mobile directive)

These exist because live API payloads routinely contain `null`. Apply them on
the website too:

- Never use `!` non-null assertions on API payloads.
- `(text || '').toLowerCase()`, `(items || []).map(...)`, `Number(value || 0)`.
- A default parameter (`fn = ''`) guards `undefined` only, **not `null`** — still
  write `(fullName || '')` inside.
- Unwrap envelopes as `res.data?.data ?? res.data ?? {}`.
- Every list needs a stable key with a fallback:
  `String(item?.id || item?._id || index)`.
- Debounce search inputs (rate limits, §2.4) and give every `useEffect` an
  explicit dependency array with condition guards.

---

## 9. Mobile screen → website page parity map

Build these pages and the website reaches feature parity with the app.

### 9.1 Public / auth

| Mobile screen | Website page | API calls |
|---|---|---|
| `OnboardingScreen`, `WelcomeScreen` | `/` landing | — |
| `LoginScreen` | `/login` | `POST /auth/login` → route by `data.role` |
| `RegistrationStep1Screen` | `/register` step 1 | — (collects name/email/password/phone) |
| `RegistrationStep2Screen` | `/register` step 2 | `GET /regions/tree`, then `POST /auth/register` |
| `ForgotPasswordScreen` | `/forgot-password` | *(no backend endpoint yet — show contact-support copy)* |

### 9.2 Member — application & profile

| Mobile screen | Website page | API calls |
|---|---|---|
| `PersonalDetailsFormScreen` | `/apply/personal` | `GET /regions/tree`, `PUT /members/profile` |
| `BusinessInformationFormScreen` | `/apply/business` | `GET /members/business-info`, `PUT /members/profile` |
| `FinancialComplianceFormScreen` | `/apply/financial` | `GET /members/financial-info`, `PUT /members/profile` |
| `DeclarationFormScreen` | `/apply/declaration` | `GET /members/declaration-info`, `PUT /members/profile`, then `POST /applications` |
| `ApplicationSubmittedScreen` | `/apply/submitted` | — |
| `ApplicationStatusScreen` | `/application/status` | `GET /applications/my-applications` — render the 3-tier timeline from `blockApprovedAt` / `districtApprovedAt` / `stateApprovedAt` / `rejectedBy` |
| `DashboardScreen` | `/dashboard` | `GET /members/my-profile`, `GET /applications/my-applications`, `GET /notifications` |
| `ProfileScreen`, `EditProfileScreen` | `/profile`, `/profile/edit` | `GET /members/my-profile`, `PUT /members/profile`, `POST /members/profile-photo` |
| `EditBusinessScreen` / `EditFinancialScreen` / `EditDeclarationScreen` | `/profile/business` etc. | the matching `GET /members/*-info` + `PUT /members/profile` |
| `NotificationScreen` | `/notifications` | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| `BrowseMembersScreen` | `/members` | `GET /members?page=&limit=` |

### 9.3 Member — payment & paid area

| Mobile screen | Website page | API calls |
|---|---|---|
| `CompleteMembershipScreen` | `/membership` | `POST /payment/create-request` |
| `PaymentGatewayScreen` / `MockPaymentScreen` | `/membership/pay` | redirect to Instamojo `payment_url` |
| `PaymentSuccessScreen` | `/membership/success` | `GET /payment/status/:id`, `POST /payment/complete` |
| `PaidDashboardScreen` / `PaidProfileScreen` / `PaidSettingsScreen` | `/dashboard` (paid variant) | gate on `membershipStatus === 'approved' \| 'active'` |

### 9.4 Business area

| Mobile screen | Website page | API calls |
|---|---|---|
| `BusinessDashboardScreen` | `/business` | `GET /business-profiles/me`, `GET /products/stats`, `GET /products/activities` |
| `ManageCompaniesScreen` | `/business/companies` | `GET /business-profiles/all` |
| `AddCompanyScreen` | `/business/companies/new` | `POST /business-profiles` (multipart `logo`) |
| `EditCompanyScreen` | `/business/companies/:id/edit` | `PUT /business-profiles/:id` |
| `ViewCompanyScreen`, `BusinessProfileViewScreen` | `/business/companies/:id` | `GET /business-profiles/:id` |
| `ProductsServicesScreen` | `/business/products` | `GET /products` |
| `AddProductScreen` | `/business/products/new` | `POST /products` (multipart `image`) |
| `DiscoverScreen` | `/discover` | `GET /business-profiles/discover?q=`, `GET /products/discover?q=` — **debounce the query** |
| `AnalyticsScreen` | `/business/analytics` | `GET /products/stats` |
| `SettingsScreen` | `/settings` | `PUT /members/profile` |

### 9.5 Admin area

| Mobile screen | Website page | API calls |
|---|---|---|
| `BlockDashboardScreen` | `/admin/block` | `GET /admin/block/dashboard` |
| `BlockApprovalsScreen` | `/admin/block/approvals` | same dashboard → `applicants.{pending,approved,rejected,all}`; act via `POST /applications/:id/block-review` |
| `BlockMembersScreen` | `/admin/block/members` | `GET /admin/users` |
| `BlockSettingsScreen` | `/admin/block/settings` | `GET /admin/profile`, `PUT /admin/profile` |
| `District*Screen` | `/admin/district/*` | `GET /admin/district/dashboard`, `POST /applications/:id/district-review` |
| `State*Screen` | `/admin/state/*` | `GET /admin/state/dashboard`, `POST /applications/:id/state-review` |
| `ApplicantDetailScreen` | `/admin/applicants/:id` | render the `Applicant` object from the dashboard payload; approve/reject inline |
| `SuperAdminActionHubScreen` | `/admin/super` | `GET /admin/super/overview`, `GET /admin/super/applications`, `GET /admin/super/search?q=` |
| `ManageAdminsScreen` | `/admin/super/admins` | `GET/POST/PUT/DELETE /admin/super/admins*`, bulk CSV endpoints |
| `ManageEventsScreen` | `/admin/super/events` | `GET/POST/PUT/PATCH/DELETE /events*` |
| `SystemScreen` | `/admin/super/system` | `GET /admin/super/directory`, `GET /audit`, `GET /audit/counts` |

### 9.6 The shared approval queue

All three tier dashboards render one shared component (`ApprovalQueue.tsx`) with
**4 buckets** and an **inline** reject form. Build the same on the web:

```
[ Pending (n) ] [ Approved (n) ] [ Rejected (n) ] [ All (n) ]

Card: fullName · block/district/state · statusLabel · approvedByText
      fallbackReason banner when `orphaned === true`
      [ Approve ]  [ Reject ▸ ]   ← Reject expands an inline reason textarea
```

Approve → `POST /applications/:id/{block|district|state}-review { action:'approve' }`
Reject → same endpoint with `{ action:'reject', rejectionReason }`
(or the tier-agnostic `/approve` / `/reject` if you prefer one code path).
Refetch the dashboard after either.

---

## 10. Traps, gotchas and known quirks

Read this list before writing website code. Every item is something that has
already caused a real bug.

1. **CORS.** Add the website origin to `CORS_ORIGIN`. Nothing works without it.
2. **`JWT_SECRET` must be identical** across every process. Different secrets =
   "logged in on mobile, rejected on web".
3. **`userId` in the JWT is `MemberDetails._id`**, not `MemberAuth._id`.
4. **Do not use `/auth/me`** for session restore. Use `/members/my-profile` or
   `/admin/profile`. (§4.6)
5. **`/uploads` has no `/api/v1` prefix.** Build image URLs from `API_ORIGIN`,
   not `API_BASE_URL`.
6. **Never store an absolute upload URL.** Store the relative `/uploads/…` path
   and re-anchor on read with `resolveMediaUrl`.
7. **Multipart field names are exact**: `profilePhoto`, `logo`, `image`,
   `banner`, `photo`. A mismatch means `req.file` is undefined and you get a 400.
8. **Do not set `Content-Type` on FormData requests** — the boundary must be
   browser-generated.
9. **Product routes return a bare envelope** (`{success, data, count}`), not the
   `ApiResponse` shape. Unwrap defensively everywhere.
10. **Never compare `application.status` directly** — normalize first, or use the
    already-normalized `status` field on the `Applicant` object.
11. **Never substring-match `'pending'`** on a status. Use exact matches or the
    server-provided `stage`.
12. **The registration/application region gate is server-enforced.** Populate
    dropdowns from `/regions/*`; surface the 400 message verbatim.
13. **`coverageAvailable:false` ≠ request failed.** Show a distinct empty state.
14. **Rate limits bite browsers.** Debounce search; guard React `StrictMode`
    double-effects.
15. **Route order matters** in `routes.js`: `/regions` must stay above the
    business router (mounted at `/` with its own `verifyToken`), or the public
    dropdowns 401.
16. **Approved ≠ paid.** After state approval `membershipStatus` is still
    `'pending'`. Gate paid features on `membershipStatus`, not on application status.
17. **Forms lock after saving** (`isLocked: true`). Render read-only when set.
18. **`PUT /members/profile` ignores empty strings** — a partial save cannot blank
    a field. To clear a value you need a real change through a supported path.
19. **Never write admin documents outside `admin.repository`** — the
    `password`/`passwordHash`, `phone`/`phoneNumber`, `isActive`/`active`
    translations fail silently.
20. **Unset `ADMIN_DEMO_PASSWORDS` in production.** It is a real authentication
    bypass and logs a warning on every boot and every use.
21. **Redis is off.** Anything relying on shared cache across processes will not
    behave as expected behind a load balancer.
22. **Two `Product` models exist.** The live one is `backend/src/models/Product.js`.
23. **Register does not return a top-level `role`** (login does). Read
    `data.user.role`.
24. **`refreshToken` is not returned by login.** On 401, route to login rather
    than attempting a refresh.
25. **Production error messages are masked.** Non-operational errors become
    `500 Internal Server Error` with no detail — check server logs, not the
    response body.

---

## 11. Verification checklist

Run these once the website is wired up. Every one must pass.

### 11.1 Backend tests

```bash
cd backend
npm run test:workflow        # 24 pure unit tests, no DB  (approval state machine)
npm run test:regions         # 51 pure unit tests, no DB  (region architecture)

PORT=5055 node src/server.js                     # spare port; 5000 is often taken
BASE_URL=http://localhost:5055 npm run test:e2e  # 41 tests against a live DB
```

The E2E suite seeds a synthetic region (`E2E Test State/District/Block`) tagged
with a run id, deletes everything it created, and asserts the real application
count is unchanged at the end. If that assertion fails, clean up before rerunning.

### 11.2 Cross-client parity — do this by hand

- [ ] Register a new member **on the mobile app** → log in with the same email
      and password **on the website**. Same profile, same application, same
      dashboard.
- [ ] Register a new member **on the website** → log in **on the mobile app**.
      Same result.
- [ ] Change the password on one client → the old password fails on **both**,
      the new one works on **both**.
- [ ] Upload a profile photo on one client → it renders on the other.
- [ ] Submit an application on the website → it appears in the correct block
      admin's Pending queue on the mobile app.
- [ ] Approve it as block admin on the mobile app → the website's application
      status timeline shows the block step complete and the file at
      `Pending-District`.

### 11.3 Website checklist

- [ ] `CORS_ORIGIN` contains every website origin (dev + prod).
- [ ] Every request carries `Authorization: Bearer <token>`.
- [ ] 401 clears storage and routes to `/login` — **except** during a login or
      register attempt.
- [ ] Session restore uses `/members/my-profile` or `/admin/profile`.
- [ ] Registration dropdowns come from `/regions/*`, never a bundled JSON file.
- [ ] Images go through `resolveMediaUrl`.
- [ ] Multipart field names match the table in §5.14.
- [ ] The approval queue renders 4 buckets and an inline (not modal) reject form.
- [ ] `orphaned` / `fallbackReason` is rendered on escalated applicant cards.
- [ ] Search inputs are debounced.
- [ ] No `!` non-null assertions on API payloads; all list/string/number access
      is guarded.
- [ ] Role guards exist client-side for UX, and every protected call still works
      correctly when the server returns 403.

---

## 12. What is NOT finished — gap audit

This section is the honest inventory. It was produced by cross-checking every
route declared in `backend/src` against every call the mobile app actually
makes. **Read it before you assume "the app does X, so the website will too".**
Several items below are broken *in the mobile app as well* — copying the app's
behaviour would copy the bug.

Legend: 🔴 broken today · 🟠 missing entirely · 🟡 works but has a caveat

### 12.1 ✅ FIXED — was broken, now implemented and verified

These five were live defects (four of them broke the mobile app too). They are
now fixed in `backend/src` and covered by 28 passing live-database checks.
See [§12.6](#126-changelog--what-was-implemented) for exactly what changed.

| # | Issue | Evidence | What the website must do |
|---|---|---|---|
| 1 | **Profile photo upload calls a route that does not exist.** The app posts to `/members/:id/photo` (`ENDPOINTS.MEMBERS.UPLOAD_PHOTO`, used in `EditProfileScreen.tsx:99` and `ProfileScreen.tsx:128`). The backend only declares `POST /members/profile-photo`. Every upload 404s. | `member.routes.js` has no `/:id/photo` | Call **`POST /members/profile-photo`** with field name `profilePhoto`. Optionally add an alias route on the backend so the app is fixed too. |
| 2 | **`GET /auth/me` is unreliable.** It looks up `MemberAuth.findById(userId)` but `userId` is `MemberDetails._id`; it only succeeds via a per-process in-memory cache that dies on restart and expires after 1 h. The app uses it in `BusinessDashboardScreen.tsx:88` and `BusinessProfileScreen.tsx:59`. | `auth.service.js → getCurrentUser`; Redis disabled in `config/redis.js` | Use **`GET /members/my-profile`** (members) / **`GET /admin/profile`** (admins). Never build session restore on `/auth/me`. |
| 3 | **`POST /payment/create-request` sends an empty phone to Instamojo.** It reads `req.user.fullName` and `req.user.phoneNumber`, but the JWT payload only carries `{ userId, email, role, block, district, state }`. So `buyerName` silently falls back to the email and `phone` is always `''`, while the request sets `send_sms: true`. | `payment.routes.js` vs `generateTokens()` in `auth.service.js` | **Backend fix needed:** load `MemberDetails` by `req.user.userId` and use its `fullName` / `phoneNumber`. Until then, payments will not reliably create. |
| 4 | **`POST /payment/complete` reads a claim that isn't in the token.** `req.user.id \|\| req.user._id` are both `undefined` (the claim is `userId`). It only succeeds because of the `email` branch of the `$or`. | `payment.routes.js` | Works, but is one refactor away from breaking. Prefer fixing the backend to `req.user.userId`. |
| 5 | **Browse Members is admin-only in practice.** `BrowseMembersScreen` defaults to `endpoint = '/admin/block/dashboard'`, which a plain `member` cannot call → `403`. | `BrowseMembersScreen.tsx:67` | For a member-facing directory on the web, use `GET /members?page=&limit=` — and read item 17 below first. |

### 12.2 🟠 Missing entirely — no endpoint exists

| # | Feature | Status | Impact on the website |
|---|---|---|---|
| 6 | ~~**Forgot password / reset password**~~ | ✅ **IMPLEMENTED.** Three endpoints, hashed single-use tokens, 1-hour expiry, works for members *and* admins, no account enumeration. **Requires working SMTP to deliver the mail.** | Build `/forgot-password` and `/reset-password` pages against §5.2. |
| 7 | ~~**Notifications are never created**~~ | ✅ **IMPLEMENTED.** Emitted on submit, each tier advance, rejection (with reason), final approval, and payment activation. Writes are non-throwing, so a notification failure can never fail an approval. | `GET /notifications` now returns real data. Build the bell + list against §5.10. |
| 8 | **Email verification / OTP** | None. Registration trusts the email address as typed. | No verification step available. |
| 9 | **Member-to-member connections** | `modules/common/connection.model.js` defines a full schema (`pending/accepted/rejected/blocked`) but **no route or service references it**. Dead code. | "Connect with member" cannot be built without new backend work. |
| 10 | **Generic activity feed** | `modules/common/activity.model.js` is defined and **never used**. `GET /products/activities` synthesises a feed from the products table instead. | Any "recent activity" beyond products needs new backend work. |
| 11 | **Member search** | `GET /members` takes arbitrary equality filters via query string but has **no `?q=` text search**. Only companies and products have `/discover`. | Implement member search client-side over a paged fetch, or add a backend endpoint. |
| 12 | **`/membership/plans`** | Referenced in `frontend/src/config/api.config.ts` but **does not exist**. The five plans and prices are hardcoded inside `payment.routes.js`. | Hardcode the same table on the website: `starter 500 · intermediate 1000 · advanced 2000 · lifetime 2500 · aspirant 500`. Keep them in one constant so they can't drift. |
| 13 | **Refresh tokens are never handed out** | `POST /auth/refresh` exists and works, but `login`/`register` return only `accessToken` as `token` — the `refreshToken` is generated and discarded. | Treat the 7-day access token as the whole session. On `401`, route to login. |
| 14 | **Application document uploads** | `Application.documents[]` is in the schema (`{name,url,type,uploadedAt}`) but **no endpoint writes to it**. | Attaching PAN/GST/Udyam proof files is not possible without new backend work. |
| 15 | **Report export (CSV/PDF)** | `POST /admin/reports/generate` deliberately returns `downloadUrl: null` and expects the client to render `rows` itself. | Build the export client-side from `rows`, or add backend file generation. |
| 16 | **Pagination on admin dashboards** | Dashboards fetch at most `APPLICANT_FETCH_LIMIT = 300` applications and **silently truncate** — no `total`, no cursor. | A block with >300 applications will show an incomplete queue with no warning. Either add server-side pagination or surface the cap in the UI. |

### 12.3 🟡 Works, but you must know this before going live on the public web

| # | Item | Detail |
|---|---|---|
| 17 | **`GET /members` is not geofenced and takes arbitrary filters** | Any authenticated user can page through **every** member and filter on any `users` field via the query string (`memberService.getMembers` passes `req.query` straight through). `aadhaarNumber` is `select:false` so it does not leak, but names, phone numbers, emails and regions do. This was low-exposure in a native app; on a website it is trivially discoverable. **Scope or gate this before launch.** |
| 18 | **`GET /admin/users` reads the wrong collection** | `adminService.getUsers` queries `User = auth.model` — the `auth` collection, which holds only `{ email, password, isActive, lastLogin }`. There are no names, roles or regions on those rows. A "User Management" page built on it will look almost empty. Use the tier dashboards' `applicants` array, or query `users` instead. |
| 19 | **Redis is disabled** | `config/redis.js` returns `null` immediately; everything falls back to an in-process `Map`. Cache is not shared across instances and dies on restart. If you scale the API to more than one process, behaviour that depends on cache (notably `/auth/me`) becomes non-deterministic. |
| 20 | **`ADMIN_DEMO_PASSWORDS` is a real auth bypass** | Off by default. If set, *any* admin account can be signed into with a shared password. It logs a warning at boot and on every use. **Must stay unset in production**, especially once there is a public web login form. |
| 21 | **Rate limit is per IP, 100 / 15 min** | An office or campus behind one NAT address shares that bucket. Browsers also burn it faster than phones (React `StrictMode`, search-as-you-type). Consider raising `RATE_LIMIT_MAX_REQUESTS` for web traffic, and debounce every search input. |
| 22 | **Helmet CSP is only enabled in production** | `contentSecurityPolicy: config.env === 'production'`. Fine, but means dev and prod behave differently — test the real CSP before launch. |
| 23 | **Production masks error detail** | Non-operational errors become a bare `500 Internal Server Error`. Debug from the server logs, not the response body. |
| 24 | **Two `Product` models exist** | `backend/src/models/Product.js` is the live one. `modules/common/product.model.js` is dead code with different field names (`status`, `featured`, no `stock`/`sku`). Build against the live one. |
| 25 | **`data.personal` vs `data.personalDetails`** | Both spellings exist in live application documents. `buildApplicant` and `buildGeoFilter` read both. If you write application data from the website, use **`data.personalDetails`**. |

### 12.4 ✅ What IS complete and will work on the website today

No caveats on these — build against them directly:

- **Auth**: register (with region gate), login for all five roles, logout, change password via `PUT /members/profile`.
- **The 3-tier approval workflow**: full state machine, status normalization across all three legacy vocabularies, per-tier bucketing, geofencing on both read and write, orphan fallback routing, transactional final approval, audit trail.
- **Regions**: `/regions/states|districts|blocks|tree|validate|geography`, derived live from the admin collections.
- **Admin dashboards**: block, district, state, super — including the full `Applicant` object.
- **Super admin**: overview, search, directory, admin CRUD, removal preview, bulk CSV validate/commit with per-row line numbers.
- **Business profiles & products**: full CRUD, image upload, and network-wide `/discover` for both.
- **Events**: full CRUD with draft/published gating.
- **Audit log**: list + counts.
- **Payments**: Instamojo integration is fully implemented including webhook signature verification — it needs real credentials **and** fix #3 above.
- **File uploads**: multer to `backend/uploads`, served statically, relative paths stored.

### 12.5 Recommended order of work

**Before the website can launch at all:**
1. Add the website origin to `CORS_ORIGIN` (§2.3). ← still outstanding
2. **Unset `ADMIN_DEMO_PASSWORDS`** (§12.7). ← still outstanding, and now urgent
3. Get SMTP actually delivering, or password reset silently goes nowhere (§12.7).
4. Scope or gate `GET /members` (#17). ← still outstanding

**~~Backend work that unblocks parity~~ — DONE:**
- ~~Fix the payment buyer name/phone lookup~~ ✅
- ~~Emit notifications on approve / reject / final approval / payment~~ ✅
- ~~Build forgot-password~~ ✅
- ~~Fix the photo upload route and `/auth/me`~~ ✅

**Still open, in priority order:**
5. Point `GET /admin/users` at the `users` collection (#18).
6. Add pagination, or a visible cap warning, to the admin dashboards (#16).
7. Optional: connections (#9), application document uploads (#14), member search (#11), report export (#15), a real `/membership/plans` endpoint (#12).

### 12.6 Changelog — what was implemented

Ten backend files changed. No frontend file was touched: every fix is
server-side, so the **already-shipped mobile app is repaired without a release**.

| File | Change |
|---|---|
| `modules/auth/auth.model.js` | Added `resetPasswordToken` / `resetPasswordExpires`, both `select:false` so a live reset token can never leak through a profile read. |
| `modules/auth/auth.service.js` | **Fixed `getCurrentUser`** (was querying `MemberAuth` with a `MemberDetails` id — now reads the database first and resolves admins via the repository). Added `requestPasswordReset`, `verifyResetToken`, `resetPassword`. |
| `modules/auth/auth.controller.js` | Three new handlers; `getCurrentUser` now receives the whole token so admins resolve by email claim. |
| `modules/auth/auth.validators.js` | `forgotPasswordValidator`, `resetPasswordValidator`. |
| `modules/auth/auth.routes.js` | `POST /auth/forgot-password`, `GET /auth/reset-password/verify`, `POST /auth/reset-password` — all behind `authLimiter`. |
| `modules/admin/admin.repository.js` | Added `findRawByResetToken`, so an admin's reset link is found in whichever of the two databases holds their account. |
| `core/utils/mailer.js` | Added `sendPasswordReset` (HTML + plaintext). Still never throws. |
| `modules/members/member.routes.js` | **Added the missing `POST /members/:id/photo`** the app has always called. Both photo routes now use `upload.any()`, so the field name (`photo` vs `profilePhoto`) no longer decides whether the upload works. |
| `modules/members/member.controller.js` | `uploadProfilePhoto` accepts the file from `req.file` *or* `req.files[0]`. |
| `modules/payment/payment.routes.js` | **Fixed the buyer lookup** — name and phone now come from the member profile, not from claims that were never in the token. **Fixed `req.user.id` → `req.user.userId`**, and an invalid id is now omitted from the query instead of being sent as `{_id: undefined}`. Emits an activation notification. |
| `modules/notifications/notification.service.js` | Added `safeCreate` — validates, never throws, logs and returns `null` on failure. |
| `modules/applications/application.service.js` | Added `notifyApplicant`, hooked into `recordReviewAudit` so all six review outcomes emit from one place, plus an acknowledgement on submit. |
| `.env.example` | Documented `PASSWORD_RESET_URL`. |

**Design notes worth knowing:**

- **`/auth/forgot-password` never reveals whether an address is registered.** It
  is public and unauthenticated; an endpoint that answered "no such account"
  would be an account-enumeration oracle. Unknown, inactive and known addresses
  all return the identical body.
- **Only a SHA-256 hash of the token is stored.** The raw token exists solely in
  the email, so a database dump yields no usable reset links. SHA-256 rather
  than bcrypt because the token is 32 bytes of CSPRNG output — there is nothing
  to brute-force, and a slow hash would be paid on every click.
- **Reset works for admins too.** Their credentials live in different
  collections with different field spellings; the write goes through
  `adminRepository.updateById`, which translates `passwordHash` correctly and
  also clears `mustResetPassword`.
- **A link works exactly once.** The token is cleared in the same write that
  sets the password.
- **`POST /members/:id/photo` ignores `:id`.** The photo always belongs to the
  authenticated caller — honouring the path parameter would let anyone
  overwrite another member's photo by editing a number in the URL.
- **Notifications are hooked into `recordReviewAudit`**, not into each of the six
  review outcomes, so there is one place to keep correct rather than six that
  can drift.

**Verification:** 24 workflow + 51 region unit tests still pass, plus 28 new
live-database checks covering token hashing, single use, expiry, enumeration
resistance, cold-cache `getCurrentUser`, and every notification event. The
verification fixture creates its own throwaway account and deletes it — it left
zero rows behind.

### 12.7 ⚠️ Two things to fix in your own `.env` right now

Both were observed in the live run:

1. **`ADMIN_DEMO_PASSWORDS` is set (2 shared passwords).** The server logs
   `SECURITY: ... Any admin account can be signed into with them` on every boot.
   Anyone who knows an admin's email address can sign in as them, which defeats
   the geofence entirely. This was survivable while the app was internal. **The
   moment a public website has a login form, it is a live vulnerability.**
   Unset it.

2. **SMTP is configured but delivery fails.** `EMAIL_HOST=smtp.gmail.com` and
   `EMAIL_USER` are set, but the send returned `Email delivery failed` — Gmail
   needs an **App Password**, not the account password, and only when 2FA is on.
   Until this works, `POST /auth/forgot-password` stores a valid token and
   returns success, but **no email arrives** — the mailer's failure is logged,
   never surfaced to the caller (by design, so the endpoint cannot be used to
   probe which addresses exist). Fix SMTP before relying on password reset.

Also set, for the website:

- `CORS_ORIGIN` is currently `http://localhost:3000,http://10.0.2.2:3000` —
  **add your website's dev and production origins.**
- `PASSWORD_RESET_URL` — optional; defaults to `FRONTEND_URL + /reset-password`.
  Set it if the website's reset page lives elsewhere.

---

*Source of truth: `backend/src` in this repository. Where this document and the
code disagree, the code wins — and this file should be corrected.*
