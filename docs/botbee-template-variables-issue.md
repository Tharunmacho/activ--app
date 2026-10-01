# BotBee support request — template body variables are not substituted on API sends

**Account:** ACTIV India · `phone_number_id` **642450735629232** (+91 81222 82309)
**Endpoint:** `POST https://app.botbee.io/api/v1/whatsapp/send/template`
**Date raised:** 7 September 2026

---

## Summary

Template messages sent through the API are **delivered successfully but every body
variable arrives as a literal `-`**. The API reports success — HTTP 200,
`status: "1"`, and a real `wa_message_id` — so there is no error to act on.

We are not asking how to send a template; that works. We are asking **what
request parameter carries the variable VALUES**, because none of the ones we
have tried are read.

## Expected vs actual

Template `activ_reg_welcome` (id **438417**, Approved, en_US):

```
Body         Welcome to ACTIV, #first_name#! Your account is ready. ...
variable_map {"header":[],"body":{"1":"#first_name#"},"button":[]}
```

Request (token redacted):

```json
{
  "apiToken": "<redacted>",
  "phone_number_id": "642450735629232",
  "phone_number": "919092317264",
  "template_id": "438417",
  "template_name": "activ_reg_welcome",
  "language": "en_US",
  "first_name": "Tharun",
  "custom_fields": { "first_name": "Tharun" },
  "template_data": ["Tharun"]
}
```

Response:

```json
{"status":"1","wa_message_id":"wamid.HBgMOTE5MDkyMzE3MjY0...","message":"Template message has been sent successfully."}
```

Delivered to the handset:

```
Welcome to ACTIV, -! 🎉
```

Expected `Welcome to ACTIV, Tharun!`.

## What we have already tried

**1. Request parameters — roughly 40 shapes, all delivered `-`.**

`template_data` (array, comma string, object with `"1"` keys, object with `"#1#"`
keys), `body_params`, `params`, `variables`, `custom_data`, `values`,
`placeholders`, `attributes`, `custom_fields` (object and with `#` markers),
`data`, `template_variable`, `body_variables`, Meta-style `components`,
`variable_map` both flat (`{"1":"x"}`) and nested
(`{"header":[],"body":{"1":"x"},"button":[]}`, as object and as JSON string),
and bare top-level keys `"1"` and `"#1#"`.

A single message was sent carrying a **different marker value under each**
candidate key simultaneously. It rendered `-`, so no key was read.

**2. Custom fields on the subscriber.**

The custom fields (`first_name`, `status`, `amount`, `event`, `date`) were
created on the account. `POST /api/v1/whatsapp/subscriber/update` answers
`status: "1"` for `custom_fields: {"first_name":"Tharun"}`, but reading the
subscriber back with `/api/v1/whatsapp/subscriber/get` returns
`"custom_fields": null` — the value is not stored. Array forms
(`[{name,value}]`, `[{key,value}]`, `[{field,value}]`), a JSON string, and the
keys `custom_field_values` / `fields` / `attributes` all behave the same.

By contrast `first_name` at the top level of the same request **does** persist
and is visible on read-back, so the endpoint itself works.

**3. A system field, confirmed stored, still rendered `-`.**

We set the subscriber's `first_name` to a distinctive value, confirmed via
`/subscriber/get` that it was stored, then sent template 438417 (bound to
`#first_name#`) with no variable values in the payload at all. The message
still delivered `-`. **This is the key data point: even a stored system field
is not substituted on an API send.**

**4. Both binding styles.**

Templates bound to `#1#` (fields named `1`, `2`, `3`) and templates bound to
`#first_name#` / `#status#` behave identically.

**5. A second endpoint.**

`POST /api/v1/whatsapp/send/template/message` exists and validates the mobile
number, but answers `"WhatsApp account not found."` for every account
identifier we tried: `phone_number_id`, `phoneNumberID`, `phoneNumberId`,
`whatsapp_account_id`, `account_id`.

**6. "Sync Templates" in the dashboard — no effect.**

We clicked **Sync Templates** on the Message Templates screen. Afterwards the
template records were byte-identical: same `updated_at` timestamps
(`2026-09-07 05:45:34` etc.), same `variable_map`, `map_needed` still `0`. A
send issued immediately afterwards still delivered `-` in every slot.

**7. Template Variables registered in the dashboard — no effect.**

We created the variables under **Message Templates -> Variables** so they exist
as account-level entities. The template records were again unchanged (same
`updated_at`, same `variable_map`, `map_needed` still `0`), and a send issued
immediately afterwards still delivered `-` in every slot.

At this point every configuration surface BotBee exposes for this — template
body, variable binding, subscriber custom fields, account-level template
variables, and the Sync Templates action — has been set correctly and none of
them changes the delivered message.

## Note

Other templates on this same account are bound to named fields and are
understood to render correctly — `zoommeet` (226990) `#name#`/`#topic#`/`#date#`,
`meet_confirm` (391903), `ccmsg` (435543). Those are used from the dashboard
rather than through this API, which raises our main question below.

## Questions

1. **What is the correct request parameter** for supplying body variable values
   to `/api/v1/whatsapp/send/template`? A single working example for template
   438417 would resolve this entirely.
2. **Does substitution require the values to be set on the subscriber first?**
   If so, which API sets a custom field value — `/subscriber/update` accepts
   `custom_fields` and reports success but does not store it.
3. **Does variable substitution work only for dashboard campaigns**, and not for
   API sends? If that is the case please confirm it, so we can plan accordingly.
4. **Is `/api/v1/whatsapp/send/template/message` the correct endpoint** for
   template sends with variables, and what account identifier does it expect?

## Impact

This is a membership platform. Every lifecycle message — account created,
application approved, payment due, event reminder — currently reaches members
with `-` where their name, status and amount should be. We are holding the
rollout on the answer.
