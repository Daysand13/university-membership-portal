# Deploying this update

One new migration this round:

```bash
npx prisma generate
npx prisma migrate dev
git add .
git commit -m "add rate limiting and accessible bot protection"
git push
```

## What's in this round

Following up on the security discussion — added the two things flagged as
genuinely missing, in a way that doesn't ask anything of your members,
including those using screen readers or other assistive technology.

### Rate limiting

Every sensitive or abusable action now has a limit on how often it can be
attempted:

- Logins (admin, student member, alumni) — limited both by IP address and
  by the specific account being targeted, so someone can't brute-force a
  known email/index number even by spreading attempts across many IPs.
  Limits are deliberately generous on the IP side (e.g. 40 login attempts
  per 10 minutes for members) since a campus network can have many
  different real students behind the same shared IP.
- Forgot-password requests — limited by IP and by the email being
  targeted, so someone can't spam a specific person with reset-link
  emails.
- Contact form, enrollment applications, and alumni registration — limited
  by IP to stop scripted spam, again set generously (30 enrollment
  submissions/hour per IP) to comfortably allow a busy registration day on
  a shared campus network.

This is backed by your existing database, not a new external service — no
new account or signup needed.

### Bot protection — no CAPTCHA, by design

Given your point about visually impaired and Deaf members — this uses two
signals that require **zero interaction from anyone, disabled or not**:

1. A hidden field real visitors never see or reach (hidden from screen
   readers too, via `aria-hidden` and being unreachable by keyboard tab
   order) — simple bots that fill in every field on a page trip this
   instantly.
2. Timing — if a form is submitted less than 2 seconds after it loaded,
   that's essentially certain to be a script, not a person reading and
   filling in a form.

Deliberately **not** using anything like Google reCAPTCHA or Cloudflare
Turnstile, even their "invisible" versions — those score risk based on
behavioral signals like mouse movement, and people using screen readers or
switch-access devices often don't produce the "normal" patterns those
systems expect, which can get real, legitimate visitors incorrectly
flagged. The approach here can't do that, since it doesn't look at
*how* anyone interacts at all.

When something is flagged as a likely bot, the response pretends success
(no error, nothing suspicious shown) while quietly not saving anything —
this avoids teaching a bot exactly what tripped it, which would just
invite it to adjust and try again.

### Verified with real tests, not just by inspection

Added 7 new automated tests confirming both features actually work as
described (honeypot detection, timing detection, per-key rate limits, and
that different limits don't interfere with each other) — these run as
part of the existing test suite and will keep passing on every future
change.
