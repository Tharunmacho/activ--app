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

# ADMIN-FIRST REGION ARCHITECTURE

The admin collections are the single source of truth for geography and routing.
Whatever region names the Super Admin types become, on save, the options an
applicant sees. Nothing else decides which regions exist.

## 1. Segregated storage — one collection per tier

Writes go to `adminsdb`, split by tier:

```
block admins    -> adminsdb.blockadmins
district admins -> adminsdb.districtadmins
state admins    -> adminsdb.stateadmins
```

`admin.repository.js` is the **only** module allowed to read or write them.
Nothing is written to the old unified `admins` collection any more; reads still
include it, because it holds accounts that predate the split and an account that
can authenticate must be visible to the code deciding whether it may.

Two field-name traps live behind that repository, and both fail *silently*:

| canonical (what callers pass) | unified `admins` | segregated per-tier |
|---|---|---|
| `passwordHash` | `password` | `passwordHash` |
| `phoneNumber` | `phone` | `phoneNumber` |
| `active` | `isActive` | `active` |

`toTierDocument()` and `translateUpdate()` are the translation layer. Writing the
wrong spelling makes Mongoose strict mode drop the path — the account ends up
with no credential and nothing reports an error. Never hand-write an admin
document outside the repository.

A tier never stores a region below its own level: updating a state admin
`$unset`s district and block, so an empty string cannot leak into the region
tree.

## 2. Free-text regions — no parent hierarchy

There is deliberately **no** requirement that a parent admin exists. Typing
"New Super Block" into a brand-new district in a brand-new state is a valid,
one-step way to open that region for registration. `admin.regions.js` resolves
*spelling only*, in this order:

1. a region with that name already exists → reuse its exact spelling
2. the canonical India reference recognises it → use that spelling
3. otherwise → accept as typed, and report it in `regionsCreated`

That reconciliation is not cosmetic. `buildGeoFilter` matches an admin's region
against an application's with an anchored regex, so "Tamil Nadu" and
"tamil  nadu" are two different regions, each holding half of one queue.

Region fields are editable on create **and** edit, at every tier. Renaming a
block here renames it for applicants too.

## 3. Applicant dropdowns are derived, live

`RegistrationStep2Screen` and `PersonalDetailsFormScreen` call
`GET /regions/{states,districts,blocks,tree}` — never the bundled
`locations_nested.json`. Selectability is bottom-up:

```
a block is selectable    <- >= 1 active block admin
a district is selectable <- >= 1 selectable block
a state is selectable    <- >= 1 selectable district
```

Bottom-up because it cannot produce a dead end. A state admin alone puts the
state in the hierarchy but gives an applicant nothing to pick beneath it;
**creating a block admin is what opens a region for registration.**

`authService.register()` and `applicationService.createApplication()` re-check
coverage server-side and store the canonical spelling the admin database
returns.

### That pruning belongs to registration and nowhere else

`GET /regions/tree` answers in two scopes, and reading the wrong one **deletes
real regions from the answer with nothing on screen to say so**:

| | what it holds | who reads it |
|---|---|---|
| `selectable` (default) | the pruned tree above | registration, applicant dropdowns |
| `?include=all` | every region any admin account names, with staffing counts | content targeting, admin tooling |

`getTree({ prune: false })` is the second. A state carrying only a state admin
appears there with an empty `districts` array — it is a real audience (that
admin, and every member standing in the state) and reaching them does not
require a block admin to exist first.

This was the super admin's event picker showing one state on a platform with
two: the second had a state admin and no blocks, the picker was reading the
applicant tree, and the editor's reasonable conclusion was that the account they
had just created had not saved. **Ask which question the caller is asking before
reusing this tree.**

`activApi.getRegionTree(force, include)` keeps one cache slot per scope. A
single slot let the two evict each other, which would put an unreachable state
into an applicant's dropdown — the exact dead end the pruning exists to prevent.
`invalidateRegionCache()` clears both.

## 4. Separating real staffing from the legacy scaffold

`adminsdb` was pre-seeded with a placeholder admin for every region in India
(~7,700 records, all active, one shared bcrypt hash). Counting those as staffing
would put all 6,966 blocks back in the dropdowns.

Every account this application creates stamps **`createdVia`**
(`super_admin_ui` / `bulk_csv` / `tn_pilot_seed` / `migrated_from_admins`). The
scaffold has none, so that field is the discriminator. It is transitional: once
the migration has run, nothing lacks the stamp.

- Coverage, directory, hierarchy → stamped records only.
- Login and delete → **every** record, scaffold included. An account that can
  sign in must be findable, and a delete that misses one leaves a live credential.

`ADMIN_COUNT_UNSTAMPED_AS_STAFFING=true` disables the filter.

## 4b. The region field suggests all of India, at every level

`suggestRegions` returns six lists: `states`/`districts`/`blocks` (what is
staffed) and a `reference*` counterpart for each (the canonical India dataset,
scoped by the state and district already chosen). **All six have been in the
response since it was written**; the Manage Admins screens read only
`referenceStates` and hardcoded `[]` for the other two, so District and Block
suggested nothing on a state nobody had staffed yet and every name had to be
typed from memory.

That matters more than a convenience, because `buildGeoFilter` matches with an
anchored regex: a typo is not a harmless duplicate, it is a region whose queue
nothing else can see. `RegionInput` therefore also runs a bounded
Levenshtein pass (`editDistance`, budget `min(3, len/4)`) **only when the
substring pass finds nothing**, so "karanataka" offers Karnataka instead of
offering to create a 37th state. Live data already contains one such region,
created exactly that way.

The `+` stays: the dataset is a good reference, not a census, and a real block
it does not list must still be staffable.

## 5. Orphan fallback: ownership is derived, never rewritten

With no enforced hierarchy this carries more weight than before — a block admin
can exist under a district with no district admin. `common/tierRouting.js`
computes ownership at read time from live staffing:

- `owningTier(app)` — the tier the status names.
- `effectiveTier(app, coverage)` — the first tier at or above it with an admin;
  `'super'` when none, so an application is never unreachable.
- `absorbedTiers(app, actingTier)` — the steps the acting tier must complete.

Deriving it means the queue heals **both ways**. A stored status flip would move
files permanently past a tier, and a replacement admin would inherit an empty
queue for a region full of unreviewed applicants.

`classifyForLevel(app, level, coverage)` takes coverage as an optional third
argument; `null` means "unknown staffing" and disables fallback entirely — an
unknown is not "nobody is there". `applicationService.resolveTierAction()` +
`stampAbsorbedTiers()` let one approve advance an escalated file properly
instead of dropping it into the actor's own queue.

## 6. Load balancing

Nothing is assigned to an admin id; queries are geofenced by region string. Many
admins on one region therefore share one queue by construction. `listAdmins`
annotates each row with `coAdmins` and the UI says so.

## Migration

```bash
cd backend
node scripts/migrate-to-segregated-admins.js            # dry run
node scripts/migrate-to-segregated-admins.js --confirm  # apply
```

Five phases, in this order because the extraction reads what the wipe destroys:
extract the Tamil Nadu regions → back everything up → migrate the real accounts
out of `admins` into the per-tier collections → delete the scaffold → seed the
Tamil Nadu pilot as real stamped accounts with per-account passwords.

Generated credentials are written to `backups/pilot-credentials-*.csv` and exist
nowhere else. `--state "Kerala"` pilots a different state; `--skip-seed` migrates
and wipes without seeding.

## Route ordering trap

`businessRoutes` is mounted at `/` and calls `router.use(verifyToken)` inside
itself, making it a **catch-all auth gate for every route registered after it**
in `routes.js`. The public `/regions` mount must stay above it, or the
registration dropdowns get 401 and come back empty.

## The adminsdb connection

`adminsDb.ensureReady()` — not `isReady()` — is what the repository awaits.
`isReady()` is false both when the connection has failed *and* when it has never
been opened, so a caller that checks it before calling `getConnection()` never
opens anything. That deadlock made every admin creation report "adminsdb is
unavailable". The connection is also warmed at boot in `server.js`.

## Bulk CSV onboarding

`POST /admin/super/admins/bulk/validate` (dry run) then `/bulk` (commit).
Processed tier by tier and written to one collection per tier. No parent is
required — a lone `block_admin` row for a brand-new state is valid and opens
that region. What the pass enforces is one spelling per region across the file.
Invalid rows are reported with their spreadsheet line number and skipped.

## Authentication

The universal fallback password is env-gated and off by default:
`ADMIN_DEMO_PASSWORDS` is a comma-separated list accepted for any admin account.
It exists only while the pre-seeded demo admins are in use, logs a warning at
boot and on every use, and should be unset once the migration has run. A
plaintext-stored password is still comparable but is upgraded to bcrypt on the
way through, so each such account is plaintext for exactly one more login.

## Tests

```bash
cd backend
npm run test:regions    # 51 pure unit tests, no DB
npm run test:workflow   # 24 pure unit tests, no DB
```


---

# REGION-TARGETED EVENTS

## Five independent gates, five different questions

None of these substitutes for another. They were collapsed into fewer fields
twice, and both times an event ended up on a page it did not belong on.

| Field | Question | Enforced in |
|---|---|---|
| `status` | is it written yet? | everywhere |
| `audience` | is it a membership benefit? | `event.service`, `cms.service` |
| `channel` | which site was it authored for? | `onboardingVisibility` |
| `targets` | who, geographically, is it for? | `regionMatch` |
| `showOnOnboarding` | is the public allowed to read it? | `onboardingVisibility` |

`audience: 'paid'` used to do `channel`'s job by accident. It held only while an
event was ALSO restricted to paying members — the moment one was aimed at a
block and opened to everyone there, which is the normal case, it appeared on a
national marketing page.

## Targeting is a LIST, and both representations must agree

`targets: [{ state, district, block }]`. Empty means everyone; a scope is read
left to right, so `{ state: 'Kerala' }` is the whole of Kerala.

The legacy top-level `state`/`district`/`block` are still written, **mirrored
from the first entry of `targets` on every write**, because the mobile app reads
them. They describe one region out of however many, so:

- Never decide anything from the mirror alone. An event aimed at four blocks
  whose first entry was cleared looks untargeted through the three fields and
  is not. `isUntargeted()` checks both.
- Never send the mirror from a client. `eventDetailUpdates` and
  `sanitize` derive it; a stale trio from a form overwrites the mirror the
  server just computed.

Matching is `regionMatch.js` — anchored, case-insensitive, whitespace-tolerant,
metacharacters escaped, because region names are free text a Super Admin typed.
`EventsExplorer` normalises the same way in the browser (`norm()`); the two must
agree or the public page and the dashboards disagree about which events are in a
district.

## Who sees an event

- **Members and tier admins** — `multiTargetViewerClause(context)` in
  `event.service.listEvents`, and `multiTargetsViewer(doc, context)` on the
  detail path to close the direct link. `super_admin` is exempt; every other
  admin is filtered by their own patch, because a block admin's dashboard should
  show what their block is expected to attend.
- **The onboarding site** — `events/onboardingVisibility.js`, below.

## `onboardingVisibility.js` — one rule, two shapes

The onboarding site is the only surface with no viewer, so it decides per event
rather than per reader. Two ways to qualify, both positive:

```
showOnOnboarding: true                      the super admin posted it there
channel: 'public' AND untargeted            the CMS's own programme
```

`onboardingClause()` is the Mongo filter for the grid; `isOnboardingContent(doc)`
is the same rule against one loaded document, for `/events/:id`. **They must
agree.** They were written inline and separately first, and diverged on a
document with no `channel` key: the clause withheld it and the predicate — which
helpfully defaulted the field to `'public'` — served it. A rule the grid applies
and a URL walks around is not a rule. `tests/cms-content.test.js` asserts every
case against both shapes and asserts that they match.

Never write this as `channel: { $ne: 'members' }`. `$ne` admits any row that
never named a channel — one written by an older build, a script, or a path
nobody has thought about — and that failure lands in public. Requiring the
marker means an unmarked row is simply not listed. Rows predating the field were
stamped by `scripts/backfill-event-channel.js`.

`audience: 'paid'` disqualifies regardless, checked by the callers.

## The editor form mirrors the rule, in the browser

`EventsManager.isOnPublicSite(e)` is the browser's copy of
`isOnboardingContent`. It reads the EVENT's `channel`, not the surface the
editor is standing on, because the same event opens from both screens and "can
the public read this" is a fact about the event.

It cannot be `e.showOnOnboarding === true`. The flag postdates every row in the
collection, so an untargeted CMS event — public, via its channel — reads back
`false`, and a form trusting the flag tells the editor their live event is
private. Both `channel` and `showOnOnboarding` are therefore mapped out of
`toEvent` and `pickEventDetail`.

## Where the control appears, and where it must not

`EventsManager` serves two surfaces off `channel`:

| | CMS → Events | Super Admin → Events |
|---|---|---|
| `channel` | `public` | `members` |
| Section copy | shown | hidden (`showSectionCopy` follows `channel`) |
| Onboarding choice | only once regions are set | always |
| Default answer | on | off |

Section copy is the onboarding page's furniture and belongs to the CMS. The
onboarding choice is hidden in the CMS while an event is untargeted because the
answer can only be yes; it appears the moment a region is picked, because a
targeted event that is not opted in **drops off the public grid**, and that used
to happen silently from a screen whose only visible effect was three ticked
boxes.

## Nothing on the event form is required

Not the title, not the date. An event is written over several sittings, and a
form that refuses to save without a date is a form with `TBC` typed into it.
`status` carries readiness; the fields carry what is known.

So `title` and `startAt` have no `required` on the schema, and neither write
path (`cms.service.createEvent`, `event.service.createEvent`) rejects a blank
one. A **malformed** date is still an error — "not a date I can read" and "no
date yet" are different answers, and `sanitize` keeps them apart.

The consequence every reader has to carry:

- `startAt: null`, never the epoch. `listEvents` sorts on it, and a missing date
  standing in as 1970 files an unscheduled announcement at the far end of the
  past. **Undated events lead the upcoming list** — something with no date has
  not happened.
- A blank title renders as *Untitled event*, not as `—` or an empty heading.
  Both read as a broken row rather than as information.
- An undated card says "Date to be confirmed". Omitting the date block leaves a
  card that looks like the others minus a corner, which reads as a render fault.

## Pick-one is a radio group, not two toggles — `CmsChoice`

Three card pairs had been written separately (audience, region mode, onboarding)
and all three were two `aria-pressed` buttons. Styling derived from one boolean
made them *look* exclusive; they were not. Two pressed-state buttons are two
independent on/off controls: assistive tech announces each as separately
switchable, the keyboard tabs through them as two stops, and nothing on the card
says "one of these" the way a radio mark does. An editor reporting that both
could be selected was reading the control correctly — only the paint disagreed.

`CmsChoice` in `CmsUI.tsx` is the one implementation: `role="radiogroup"`,
`role="radio"` + `aria-checked`, a drawn radio mark, roving tabindex and arrow
keys per the WAI-ARIA pattern. Options are **data, not children**, so the group
owns that keyboard behaviour — three call sites passing JSX is three chances to
leave the roving tabindex out of one.

Use it for any exactly-one-of choice. Never render one as two `aria-pressed`
buttons again.

### First ask whether it IS exactly-one-of. Three times it was not.

`CmsCheck` is the sibling: one card, on or off. A pair of radio cards claims the
unticked option is a real alternative that the ticked one replaces, and both
times that claim was false.

**The onboarding pair was a lie about the data.** "Keep it inside the
association" against "Post it in the onboarding events section" read as an
either/or, and posting publicly never took the event off the member dashboards —
`event.service.listEvents` does not read `showOnOnboarding` at all. Members in
the targeted regions receive it either way. It is one checkbox now, with the
unconditional half stated above it as a fact rather than offered as an option
nobody can turn off.

**The region pair forced a choice where none was needed.** "Everyone in the
association" and "Only chosen regions" are two checkboxes in the original card
treatment (`CmsModeCard`), and **either, both or neither may be ticked**:

| reachEveryone | targets | who receives it |
|---|---|---|
| on | — | every member, wherever they are |
| off | ticked | only members inside them |
| **on** | **ticked** | everyone. The regions stay ticked and stay SAVED, and are not narrowing anything |
| off | none | everyone — an empty target list has always meant this |

**`reachEveryone` IS A FIELD ON THE EVENT, and it had to become one.** It was
`targets.length === 0`, so ticking the first card could only be saved by
throwing the second card's regions away — and reopening the event handed the
editor a blank tree and asked them to pick their regions again, every time.
Storing both answers is what makes the four rows above survive a save.

Everything that decides an audience reads the two TOGETHER, and all of it must
agree: `event.service.listEvents` (an `$or` with the target clause), its
single-event twin, `onboardingVisibility.isUntargeted`, and `toEvent.targetLabel`
— which returns empty for a `reachEveryone` event, because printing the
remembered regions would tell a member it was aimed at a district it is not
narrowed to.

The test for which control to reach for: if the two labels can be true at the
same time it is a checkbox — one each, not a pair. Reach for `CmsChoice` only
when the states are exclusive *in the data*.

### Registration offers every region, and validates to the depth given

`getStates`/`getDistricts`/`getBlocks` read `include=all`, not the pruned tree.
The pruning rule is sound for deciding what "staffed" means; as the answer to
*which states exist* it hid a state the Super Admin had just created, and the
applicant saw one state on a platform with two.

Showing it is safe because **the application still routes**: a node is in that
tree only because a live admin names it, and `tierRouting.effectiveTier` walks
up to the first tier that has an admin (`super` when none does). A file lodged
in a state with no block admin lands in the state admin's queue.

`regionService.validateRegion` therefore:

- reads the **unpruned** tree — validating against a narrower list than the
  dropdown offers is how a form rejects its own suggestion;
- requires the **state**, and checks district and block **only when given**, so
  a state with nothing beneath it is a complete answer;
- still refuses an unknown name at any level, and refuses a block without its
  district;
- returns `''` for the levels not given. Empty is meaningful — `buildGeoFilter`
  reads a missing level as "not narrowed to one", which is exactly the case.

### The bell shows 24 hours, and rows are marked read one at a time

`FEED_WINDOW_MS` in `MemberTopBar`. Older items live on `/member/events` and
`/member/updates`, which the panel's two footer links reach; the empty state
names the window, because an empty bell beside a full events page otherwise
reads as a bell that has stopped working. An item with **no** usable date is
kept — a missing timestamp is missing information, not proof of age.

Opening the panel no longer marks everything read. It used to, which made the
unread dots decorative and left a per-row control nothing to do. Reading is now
deliberate: the tick on a row, the header button for all of them.

Read state has two halves and needs both. `seenAt` is one timestamp — "anything
older is old news". The dismissed-id set is "I have dealt with THIS one", which
has to survive a newer item pushing the timestamp forward. Stored notifications
are also marked on the server (`markNotificationRead`); events and updates have
no per-member row to mark — one record is read by thousands — so local is the
only place that answer can live.

## Booleans arrive as strings

The CMS posts `multipart/form-data` whenever a banner is attached, and every
field of a multipart body is a string. `showOnOnboarding === true` alone makes
the flag survive a text-only save and vanish on any save with an image. Always
`=== true || === 'true'`, as `registrationEnabled` does.

An absent field means UNTOUCHED, not false — on both the CMS and `/events`
write paths — so re-saving from a screen that does not render the control cannot
clear what the other screen set.

## Tests

```bash
cd backend
npm run test:cms        # includes the onboarding-visibility unit section, no DB
```


---

---

# MEMBERSHIP PRICING — THE SUPER ADMIN OWNS IT

The price of a membership used to be a frozen object literal in
`payment/membershipPlans.js`. Raising the aspirant fee meant a code change and a
deploy. It is rows in `membershipPlans` now, edited at **Super Admin →
Membership**.

## Two decisions, and they are separate

| | what it answers | where |
|---|---|---|
| `amountPaise` | what it costs | the plan row |
| `minYears` / `maxYears` | which commencement year earns it | the plan row |
| `audience` | company plan, or the aspirant one | the plan row |
| `showAllPlans` | offer the band's plan, or all of them | `membershipSettings` singleton |

An applicant is shown the **one** plan their commencement year earns them. A
company trading two years is a Starter member; offering them the ₹20,000 tier
invites a payment that has to be refunded. `showAllPlans` restores the
pick-freely arrangement for an association that wants it — one switch, not a
second screen.

## THE PRICE SHOWN AND THE PRICE CHARGED ARE ONE LOOKUP

`paymentOrder.createOrder` calls `membershipplan.service.getPlanForPayment`, the
same service the membership screen resolves through. **Never give payment its
own copy of the price.** The first time the two disagreed, the screen would
advertise ₹5,000 while the card was debited ₹2,000 and nothing would report it.

The client still sends only `planId` and never an amount, so nothing a client
sends can change what is taken.

## Bands are half-open — `[minYears, maxYears)`

"0 to 5" and "5 to 10" read as touching to a person and as overlapping to a
computer. With the top exclusive, a company at exactly five years lands in the
second band and in **only** one band. `maxYears: null` is the open-ended top
band — null and not a sentinel like 999, which is a number somebody eventually
edits.

The Super Admin screen computes the gaps and overlaps and names them, because
four rows in a table do not show that nothing covers 8–10 years. An applicant no
band covers is shown **every** plan rather than none — a blank screen with a Pay
button on it is the worse failure.

## Units: paise stored, rupees everywhere else

The collection stores `amountPaise` — money in a floating-point field is money
that eventually rounds wrong. Rupees are what an editor types and what the
gateway is handed. `membershipplan.service` is the only place that converts.

## Seeding, and why it can run on every read

`ensureSeeded` inserts only keys that are **absent**, from the frozen table. It
cannot overwrite a price the Super Admin has set: once a key exists, the frozen
table is dead to it. Without it, the first deploy would show an applicant no
plans at all — the authority having moved to a collection nobody had written.

The frozen table survives as the seed and as the fallback for
`getPlanForPayment`, so an unseeded database cannot take checkout down.

## No price is ever hardcoded in a client. None.

Every fallback table in the website is gone — `COMPANY_PLANS`, `ASPIRANT_PLAN`,
`legacyPlans`, and the `planAmount = 2000` defaults on the receipt. A fallback
price is a WRONG price the moment the Super Admin edits one, and each of those
sat on a screen with a Pay button or a receipt under it.

What replaced them:

- `resolvePlanEligibility` returns `plans: []` and `failed: true`. The plans
  screen renders "could not load the prices" with a retry, and — separately —
  "no plans are available" for an empty list from a healthy server. Different
  situations, different sentences; only one is worth retrying.
- `MembershipPlans` starts with `selectedPlan: null`. The project builds with
  **`strictNullChecks: false`**, so the compiler will not catch a null
  dereference here: the guard returning early before any `selectedPlan.x` read,
  and the guard in `handlePayment`, are load-bearing.
- The receipt prints `money(value)` — a dash when nothing was recorded. A
  guessed amount on a receipt tells a member who paid ₹10,000 that they paid
  ₹2,000, in writing, on the page they screenshot.
- `PaymentRegistration` resolves the aspirant price live before handing it to
  the gateway.

`BusinessForm` shows the resolved band under the commencement-year field
(`PlanHint`) — fetched, never computed from a local table, and hedged with
"confirmed at the payment step" because a figure on a form reads as a promise.

Still hardcoded, and left alone deliberately: the `validAmounts` table in
`payment.routes.js` (`POST /payment/create-request`). The website does not use
that route — it goes through `/payment/order` — and changing it would alter what
the mobile app can submit. Fold it into the service when mobile is next touched.

## Retire, never delete

A paid membership points at its plan; deleting the row makes the receipt point
at nothing. `isActive: false` takes it off every applicant listing and out of
`getPlanForPayment`, while the editor still sees it — you cannot turn back on
something you cannot see.

## Endpoints

```
GET  /membership/plans              public   every active plan (mobile ships against this)
GET  /membership/plans/mine         member   the plans THIS applicant is offered
GET  /admin/super/membership/plans  super    all plans + settings, retired included
POST /admin/super/membership/plans  super
PUT  /admin/super/membership/plans/:key
DELETE .../plans/:key               super    retires
PUT  /admin/super/membership/settings
```

`/settings` is declared **before** `/plans/:key` — Express matches in order, and
a literal behind a parameter route is a literal the parameter captures.

The band is resolved **server-side**, from `BusinessInfo.businessCommencementYear`
(keyed by `userId` — see the collection table above, where the wrong key returns
null and nothing reports it). Resolving it in the browser would make the price a
client's opinion, and the two clients would drift the moment one shipped a
different threshold.

`features/member/membershipPlans.ts` keeps the shipped table as a **last-resort
fallback for a failed call only**. A member on that screen is trying to pay;
showing them nothing is worse than showing the released prices.


## Checklist for every edit

- [ ] Behaves correctly with missing/null user state (`user = null`)
- [ ] No unguarded `.length`, `.slice()`, `.map()`, `.charAt()`, `.toLowerCase()`
- [ ] No `!` non-null assertions
- [ ] All native/API calls inside `try…catch`
- [ ] No raw transparent `<Modal>` nested in a sub-tab
- [ ] `cd frontend && npx tsc --noEmit` returns 0 errors
- [ ] Region names come from the admin collections, never a static list
- [ ] Admin documents are written only through `admin.repository` (field names!)
- [ ] Any new `classifyForLevel` / review path threads `coverage` through
- [ ] Event visibility decided through `onboardingVisibility` / `regionMatch`,
      never a fresh inline condition — and both shapes of the rule updated
- [ ] A pick-one choice uses `CmsChoice`, an addition uses `CmsCheck`, and a
      state that is just the absence of another is text, not a second card
- [ ] Region lists use the tree scope the caller needs, and anything that
      validates a region reads the SAME scope the dropdown offered
- [ ] Event audience read from `reachEveryone` AND `targets`, never one alone
- [ ] A membership price is read through `membershipplan.service`, never copied
      into the payment path or hardcoded in a client
- [ ] `cd website && npx tsc --noEmit -p tsconfig.app.json` returns 0 errors
      (the bare `tsc --noEmit` there checks nothing)
