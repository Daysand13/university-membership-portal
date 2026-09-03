# Deploying this update

Same routine, one new migration:

```bash
npx prisma generate
npx prisma migrate dev
git add .
git commit -m "email audit logging, retries, profile-update confirmation emails"
git push
```

## What was already working (before this round)

Worth knowing, since the request read like a from-scratch build: most of this
was already live —

- Approval emails, with index number + phone-number-as-temporary-password
- Rejection emails
- Full forgot-password flow: verify email exists, send a 30-minute expiring
  reset link, never reveal whether an email is registered (anti-enumeration)
- RESEND_API_KEY read from environment variables, never hardcoded
- Passwords hashed, temporary passwords forced to be changed on first login

## What was actually missing, now added

1. **Profile-update confirmation emails.** Updating your info on
   `/membership/dashboard` (phone, address, emergency contact, etc.) now
   sends a confirmation email listing exactly what changed. If nothing
   actually changed, no email is sent.
2. **Retries.** Every email now retries automatically up to 3 times with a
   short backoff if Resend's API has a transient failure, before being
   marked failed.
3. **Audit logging.** Every email attempt — sent, failed, or skipped because
   no API key is configured (local dev) — is now recorded in a new
   `email_logs` table: recipient, subject, template name, status, and
   attempt count. View it at **Admin → Email Logs** (Super Admin only). This
   is separate from your existing Audit Log, which tracks admin actions
   (approvals, rejections) rather than the emails themselves.

## Folder structure (for reference)

```
src/lib/email/
  client.ts       — sendEmail(): retry logic + audit logging, talks to Resend
  templates.ts    — every email's subject + HTML, one function per email type
src/lib/services/membership-service.ts  — calls sendEmail() at each lifecycle point
src/app/admin/(dashboard)/email-logs/page.tsx — the new admin viewer
prisma/schema.prisma — EmailLog model + EmailStatus enum
```

## Security notes

- The Resend API key lives only in Vercel's environment variables (and your
  local `.env`, which is gitignored) — never in code, never in the
  repository.
- Email sending failures are swallowed inside `sendEmail()` and logged, by
  design — an approval or password reset always completes even if the email
  provider is down; the admin can see the failure in Email Logs and manually
  follow up rather than the whole action failing.
- The forgot-password endpoint always behaves identically whether or not the
  email is registered, so it can't be used to check who has an account.
