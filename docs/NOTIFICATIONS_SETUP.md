# Email & WhatsApp notifications — setup

Everything is wired. Paste the credentials into `backend/.env`, restart, and
messages start going out. Nothing else needs to change.

Until the credentials are real, every send is **logged and skipped** — it never
throws, so no registration, approval or payment can fail because mail is down.
Super Admin → Notifications says so on screen rather than reporting success.

---

## 1. Paste the credentials

`backend/.env` already contains the block below with placeholder values. Replace
the three marked `your_..._here`:

```env
EMAIL_USER=events@activ.org.in
EMAIL_PASS=your_email_app_password_here     # ← replace

BOTBEE_API_TOKEN=your_botbee_api_token_here          # ← replace
BOTBEE_PHONE_NUMBER_ID=your_botbee_phone_number_id_here   # ← replace
```

A value still reading `your_..._here` counts as **absent**. That is deliberate:
a half-filled `.env` that reports itself configured fails on every send against
a mailbox that does not exist.

**Gmail:** `EMAIL_PASS` must be a 16-character App Password from
<https://myaccount.google.com/apppasswords>. An account password is rejected
with `535 Invalid login`.

Then restart the backend.

## 2. Prove it works

```bash
cd backend
node scripts/test-notifications.js               # every check, sends nothing
node scripts/test-notifications.js --send-email you@example.com
node scripts/test-notifications.js --send-whatsapp 9876543210
```

The first command is safe to run against production. It verifies the SMTP
handshake and credentials, prints the exact BotBee HTTP request, resolves the
regional Reply-To against a real application in the database, and writes a
rendered sample email to `backend/logs/sample-notification-email.html`.

Super Admin → **Notifications** does the same from the browser, including a
one-click test send.

## 3. Create the WhatsApp templates on BotBee

WhatsApp only allows a pre-approved template to *start* a conversation. Create
these four on the BotBee dashboard. **Names and parameter order must match
exactly** — templates are positional (`{{1}}`, `{{2}}`), so a template registered
with its variables in a different order sends a grammatically correct sentence
with the wrong facts in it, and reports no error.

| Template | Body |
|---|---|
| `activ_registration_welcome` | Welcome to ACTIV, {{1}}! Your account is ready. Complete your membership application to begin the review. Reply HELP for support. |
| `activ_status_update` | Hello {{1}}, your ACTIV application status is now: {{2}} — {{3}}. Reply STATUS for details. |
| `activ_payment_request` | Hello {{1}}, your ACTIV membership payment of {{2}} is pending. Complete it to activate your membership. |
| `activ_event_reminder` | Hello {{1}}, a reminder about {{2}} on {{3}}. Reply EVENTS for the full programme. |

`node scripts/test-notifications.js --templates` prints this list with each
parameter described.

## 4. Register the inbound webhook

On BotBee, set the webhook URL to:

```
<BACKEND_URL>/api/v1/notifications/botbee/webhook
```

and the verify token to whatever `BOTBEE_WEBHOOK_VERIFY_TOKEN` is set to in
`.env`. The handshake is **refused** if the token is missing or wrong — an open
webhook is not a safe default.

---

## How the regional Reply-To works

An applicant in *Ambattur, Thiruvallur, Tamil Nadu* gets:

```
From:     "ACTIV Ambattur Block Office" <events@activ.org.in>
Reply-To: r.kumar@activ.org.in          ← their Block Admin's real address
```

The Reply-To is the **actual registered email of the admin account** governing
that region, read from `adminsdb` at send time. The applicant hits Reply and
reaches the person holding their file.

**Why `From` is not `block.ambattur@activ.org.in`.** A mail provider will only
send from an address the authenticated account owns. Gmail answers `553` for an
unverified alias, and a host that does accept it produces an SPF/DMARC
misalignment that files the message in spam. `Reply-To` carries no such
requirement — it is a routing hint to the reader's client, not a claim of
identity. So the region goes in the display name and the reply still lands in the
right inbox, with no aliases to create first.

Once every `district.*` / `block.*@activ.org.in` alias exists **and** is verified
as a send-as identity on the account, set `EMAIL_USE_REGIONAL_FROM=true` to move
the region into the From address too.

**Escalation.** There is no requirement in this platform that a parent admin
exists — a block can be staffed with no district admin above it. So the resolver
walks *outward*: block → district → state → `EMAIL_SUPPORT_ADDRESS`. A member is
never told to contact nobody. Super Admin → Notifications → the routing preview
endpoint shows the resolved chain for any region, and flags a rung that is a
derived fallback rather than a real staffed account.

## The WhatsApp bot

A member messages the ACTIV number:

| They send | They get |
|---|---|
| `STATUS` | Their application's current stage, reference and region — plus the payment link when it is approved |
| `HELP` | Their Block Admin's name, email and phone, with District and State listed as escalation |
| `EVENTS` | The next five events targeted at their region |
| anything else | A menu of the three |

**A number registered against more than one member gets none of it.** Phone
numbers carry no unique index on this data and one live number is shared by four
member rows — `auth.service` already refuses phone-number login for exactly this
reason. The bot replies that it cannot tell which account is theirs and routes
them to sign in instead. It never picks a row and reads a stranger's application
status out loud.

## If BotBee's API differs from the built-in defaults

The request shape is configuration, not code:

```env
BOTBEE_TEMPLATE_ENDPOINT=/api/v1/whatsapp/send-template
BOTBEE_TEXT_ENDPOINT=/api/v1/whatsapp/send-message
BOTBEE_AUTH_STYLE=both        # bearer | header | body | both
```

`node scripts/test-notifications.js --whatsapp` prints the exact URL, headers and
body that will be sent, with the token redacted. Compare it against BotBee's docs
and correct the `.env` line — no code change, no deploy.

`both` is the default: the token is sent as a Bearer header, an `X-API-Key`
header *and* a body field, which satisfies whichever convention the account uses.

---

## What fires when

| Event | Bell | Email | WhatsApp | Triggered from |
|---|:-:|:-:|:-:|---|
| `ACCOUNT_REGISTERED` | ● | ● | ● | `auth.service.register` |
| `APPLICATION_SUBMITTED` | ● | ● | ● | `application.service.createApplication` |
| `STAGE_CHANGED` | ● | ● | ● | `application.service.notifyApplicant` |
| `CORRECTION_REQUESTED` | ● | ● | ● | `application.service.notifyApplicant` |
| `APPLICATION_APPROVED` | ● | ● | ● | `application.service.notifyApplicant` |
| `PAYMENT_REQUIRED` | | ● | ● | available; not yet auto-triggered |
| `PAYMENT_SUCCESS` | | ● | ● | available; not yet auto-triggered |
| `MEMBERSHIP_ACTIVATED` | ● | ● | ● | `payment.routes` `/complete` |
| `EVENT_REGISTERED` | ● | ● | ● | `event.service.register` |
| `EVENT_REMINDER` | ● | ● | ● | available; needs a scheduler |

The copy for every one of them lives in
`backend/src/modules/notifications/notificationTemplates.js` — one place, so the
bell, the email and the WhatsApp message cannot end up saying three different
things about the same event.

`PAYMENT_REQUIRED` and `EVENT_REMINDER` are written and tested but nothing calls
them yet: the first needs a decision about *when* to chase an approved applicant
who has not paid, and the second needs a scheduled job. Both are one
`dispatchLifecycleEvent` call away.

## Files

```
backend/src/modules/notifications/
  notification.service.js       dispatchLifecycleEvent + oversight queries
  notificationTemplates.js      what each event says, on all three channels
  email.service.js              SMTP, regional addressing, HTML shell
  botbee.service.js             outbound WhatsApp, .env-driven request shape
  botbeeWebhook.service.js      inbound bot: STATUS / HELP / EVENTS
  botbeeWebhook.routes.js       the unauthenticated webhook (mounted separately)
  regionalContacts.service.js   region → the admin who governs it
  notificationLog.model.js      the delivery audit trail
  notification.routes.js        member notifications + Super Admin oversight

backend/scripts/test-notifications.js    the diagnostics
website/src/features/admin/super-admin/pages/Notifications.tsx
```

**Route ordering matters.** `botbeeWebhook.routes.js` is mounted in `routes.js`
*above* `businessRoutes`, which is mounted at `/` and calls `verifyToken`
internally — making it a catch-all auth gate for everything registered after it.
BotBee holds no ACTIV token, so mounted below that line every inbound message
would get a 401: the bot goes silent, BotBee's dashboard shows failing
deliveries, and nothing here logs anything because the request never arrives.
Same trap as `/regions` and `/cms`.
