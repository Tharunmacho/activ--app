# ACTIV — React Native Engineering Directive

## Repo layout

| Path | What it is |
|---|---|
| `frontend/` | The React Native app (RN 0.8x, TypeScript). **This is the mobile codebase.** |
| `backend/` | Node/Express + MongoDB API (`/api/v1`) |
| `docs/` | Specifications, workflow and API documentation |

App entry: `frontend/App.tsx` → root `NativeStackNavigator`. Member area is
`frontend/src/navigation/MemberBottomTabs.tsx`. All HTTP goes through the single
axios instance in `frontend/src/services/api.ts` (timeout from
`frontend/src/config/api.config.ts`).

Verify with `cd frontend && npx tsc --noEmit` — this must return **0 errors**.

---

# CRASH-PROOF & ANR-PREVENTION DIRECTIVE

The app must NEVER crash (JS or native process exit), NEVER freeze (ANR), and
must hold pixel-perfect layout alignment across Android API 28–36 and iOS.
These five rules are mandatory for every modification, refactor, and new feature.

## RULE 1 — Defensive coding, zero null crashes (JS safety)

1. Never use the non-null assertion `!` on objects, store items, or API
   payloads. Use optional chaining with a fallback:
   `const userId = user?.id || user?._id || '';`
2. Never call string/array/object methods directly on raw state:
   - Strings — `(text || '').toLowerCase()`, `(id || '').slice(-6)`
   - Arrays — `(items || []).map(...)`, `(items || []).filter(...)`
   - Numbers — `Number(value || 0)`
3. Every form input and screen must handle `null`/`undefined` initial state
   without throwing a runtime `TypeError`.
4. A default parameter (`fn = ''`) only guards `undefined`, **not `null`**.
   API fields are routinely `null`, so still write `(fullName || '')` inside.
5. Unwrap API envelopes defensively — this backend returns both
   `{ success, data }` and bare objects:
   `const payload = res.data?.data || res.data || {};`

## RULE 2 — Android 14/15/16 window & native modal safety

1. Never render a raw RN `<Modal transparent>` inside a deep sub-tab view or a
   nested navigation container on Android — this throws WindowManager
   `BadTokenException` and kills the process on API 36.
2. For in-screen popups or edit views inside tabs use an **inline expandable
   card** (`isEditing && <View>…</View>`) or navigate to a dedicated Stack
   screen. `BlockAdminDashboardScreen`'s "Edit Profile" is the reference
   implementation of this pattern.
3. A `<Modal>` at the top level of a plain Stack screen is acceptable. Always
   pass `onRequestClose`.
4. Wrap every native module call (image picker, camera, storage, permissions)
   in `try…catch` and verify the function exists first:
   ```ts
   try {
     if (typeof launchImageLibrary === 'function') {
       launchImageLibrary({ mediaType: 'photo' }, callback);
     }
   } catch (err) {
     console.warn('Native module call safely caught:', err);
   }
   ```

## RULE 3 — UI thread & ANR prevention

1. No infinite `useEffect` state-update loops. Every `useEffect` needs an
   explicit dependency array and condition guards.
2. All HTTP goes through `src/services/api.ts`, which carries a mandatory
   timeout. Never call bare `axios.*` or `fetch` from a screen.
3. Every `FlatList` needs `keyExtractor` (with a fallback key —
   `String(item?.id || item?._id || index)`), `initialNumToRender={10}` and
   `maxToRenderPerBatch={10}`.
4. Wrap heavy data transformations and list filtering in `useMemo` /
   `useCallback`.

## RULE 4 — Safe area & header alignment

1. Never double-wrap in `<SafeAreaView edges={['top']}>` when the parent
   navigator screen already applies safe-area insets.
2. Embedded tab screens (e.g. `BrowseMembersScreen` rendered inside
   `BlockAdminDashboardScreen`) must use a plain `<View style={{ flex: 1 }}>`
   so their header aligns with the dashboard title.
3. Filter pills use a responsive flex row (`flexDirection: 'row'`, `flex: 1`,
   `gap: 4`) so all tabs (Pending / Approved / Rejected / All) fit side by side
   without overflowing or scrolling off-screen.

## RULE 5 — Global exception interception & recovery

1. `(globalThis as any).ErrorUtils.setGlobalHandler` stays registered in
   `App.tsx` to intercept uncaught JS exceptions and suppress process exit.
2. Major navigation stacks stay wrapped in `<ErrorBoundary>`
   (`src/components/ErrorBoundary.tsx`) so display errors render a fallback UI
   instead of closing the app.

---

---

# GEOFENCED 3-TIER APPROVAL WORKFLOW

## State machine (strictly sequential)

```
submit ─► Pending-Block ─approve─► Pending-District ─approve─► Pending-State ─approve─► Approved
              │                          │                          │            (creates member profile)
              └────────── reject ────────┴───────── reject ─────────┴──► Rejected
```

`Approved` and `Rejected` are terminal. The legal transitions live in
`ALLOWED_TRANSITIONS` in `backend/src/modules/applications/application.service.js`
— update that table, never bypass it. `PENDING` is a legacy synonym for
`Pending-Block` and must be handled everywhere `Pending-Block` is.

## Geofencing

Every dashboard query is scoped by the admin's own location via
`resolveAdminScope(user)` + `buildGeoFilter(field, value)` in
`admin.service.js`. Scope resolves from the JWT first, then falls back to the
`admins` collection by email. Rules:

- Location claims (`block`, `district`, `state`) MUST be included in the token
  payload at every `generateTokens()` call site, or admins silently inherit the
  hardcoded default and see the wrong region's applications.
- The geo filter matches three paths (`<field>`, `data.personalDetails.<field>`,
  `data.personal.<field>`), anchored and case-insensitive, with regex
  metacharacters escaped.
- Reads are not enough: `assertWithinScope()` re-checks the geofence on every
  approve/reject, so knowing an application id doesn't let an admin act outside
  their region. `super_admin` bypasses.

## Bucket rules (per tier)

The same application shows a **different stage to each tier**. Use
`classifyForLevel(application, level)` — never substring-match on the status
string (`'Pending-District'.includes('pending')` is why the block queue used to
leak downstream files).

| Tier | `pending` | `approved` | `rejected` |
|---|---|---|---|
| Block | `Pending-Block` / `PENDING` | `blockApprovedAt` set, or status past block | any rejection |
| District | `Pending-District` only | `districtApprovedAt` set, or `Pending-State`/`Approved` | `rejectedBy.adminType === 'DistrictAdmin'` |
| State | `Pending-State` only | `Approved` | `rejectedBy.adminType === 'StateAdmin'` |

Two extra stages exist for files a tier can see but not act on: `upstream`
(awaiting an earlier tier) and `closed` (rejected by a different tier). They
appear in `all` and in no action queue. A new stage means updating
`STAGE_ACCENTS` in `applicantStyles.ts` — the `Record<ApplicantStage, …>` type
will catch it.

`rejectedAt` lives at `rejectedBy.rejectedAt` in the schema. A top-level
`application.rejectedAt = …` is silently dropped by Mongoose.

## Endpoints

- `POST /applications/:id/block-review` · `/district-review` · `/state-review`
  — body `{ action: 'approve' | 'reject', rejectionReason? }`. Role-gated.
- `POST /applications/:id/approve` · `/reject` — tier-agnostic aliases; the
  caller's role selects the tier.

## Status vocabularies — always normalize

Three spellings exist in live data: canonical (`Pending-Block`), verbose
snake_case (`pending_block_approval`), and bare lowercase (`approved`).
**Never compare `application.status` directly.** Run it through
`normalizeStatus()` from `src/modules/common/applicationStatus.js` first, on
both read and write paths. Skipping this puts legacy rows in the wrong queue or
makes them permanently unactionable.

## Collection names and key fields (both are counter-intuitive)

The member models write to legacy, human-named collections, and the key field
differs per model. Getting either wrong fails **silently** — Mongoose strict
mode drops unknown paths without error.

| Model | Collection | Key field |
|---|---|---|
| MemberDetails | `web users` | `userId` |
| BusinessInfo | `additional form for bussiness 2` (sic) | `userId` |
| MemberFinancialInfo | `additional form for financial 3` | `memberId` |
| MemberDeclaration | `additional form for declaration 4` | `userId` (unique index) + `memberId` |

`additional form for declaration 4` carries a UNIQUE index on `userId`. Any
document written without it lands as `userId: null`, and a unique index permits
exactly one null — so the second such write ever attempted fails with E11000.
Always populate `userId`.

## Final approval is transactional

`commitFinalApproval()` writes the four member documents *and* the application
status flip inside one MongoDB transaction (with a compensating-delete fallback
for standalone servers). Do not reorder it to save the application first: a
partial write leaves an application stuck in the terminal `Approved` state with
no member record, unrecoverable because terminal states refuse retries.

## Frontend

All three admin dashboards render `src/components/ApprovalQueue.tsx` (shared,
4 buckets, inline reject form — no native `<Modal>`, per Rule 2).

## Tests

```bash
cd backend
npm run test:workflow                                   # 24 pure unit tests, no DB
PORT=5055 node src/server.js                            # spare port; 5000 is often taken
BASE_URL=http://localhost:5055 npm run test:e2e         # 41 tests against a live DB
```

The E2E suite seeds a synthetic region (`E2E Test State/District/Block`) tagged
with a run id and deletes everything it created, so it is safe against the
shared Atlas cluster. It asserts the real application count is unchanged at the
end — if that assertion ever fails, clean up before re-running.

---

## Checklist for every edit

- [ ] Behaves correctly with missing/null user state (`user = null`)
- [ ] No unguarded `.length`, `.slice()`, `.map()`, `.charAt()`, `.toLowerCase()`
- [ ] No `!` non-null assertions
- [ ] All native/API calls inside `try…catch`
- [ ] No raw transparent `<Modal>` nested in a sub-tab
- [ ] `cd frontend && npx tsc --noEmit` returns 0 errors
