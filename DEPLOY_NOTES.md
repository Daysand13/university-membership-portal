# Deploying this update

One new migration this round:

```bash
npx prisma generate
npx prisma migrate dev
git add .
git commit -m "alumni network portal"
git push
```

## What's in this round: the Alumni Network & Member Portal

A full new module, built as its own account system (email + password login),
separate from the student membership portal (index number + phone-password
login), per your answer to my question — with an **automatic promotion
path** so it doesn't feel like a second, disconnected system in practice.

### How the two account types connect

- **Existing/future student members who graduate**: on a member's detail
  page in the admin panel, there's now a "Mark as Graduated" button. Clicking
  it creates their Alumni Portal account automatically (name, email, phone,
  and programme carried over from their student record), and emails them a
  link to set a password. They then sign in to the Alumni Portal with that
  same email — not their old index number.
- **Graduates from before this system existed**: they were never a student
  member here, so there's nothing to promote — they register directly at
  `/alumni` using the Register tab, with email + a password they choose
  themselves.

Both paths land in the same `AlumniProfile` table, and both use the same
sign-in form — the only difference is who initiated the account.

### Pages built (all from your structure)

- `/alumni` — the landing page, with your exact intro copy and a client-side
  Sign In / Register tab switcher (no page reload)
- `/alumni/forgot-password` and `/alumni/reset-password` (the latter also
  handles "set your initial password" after a graduation invite — same
  underlying token mechanism)
- `/alumni/dashboard` — greeting card, Edit Profile link, the three
  quick-nav cards (Directory, Mentorship Board, Upcoming Events), Log Out
- `/alumni/directory` — searchable; only shows alumni who've opted into
  directory visibility (the consent checkbox from registration controls
  this, and it's editable later)
- `/alumni/mentorship` — the "simple" version you asked for: lists alumni
  who've marked themselves willing to mentor, with a nudge to opt in if you
  haven't. No matching/request workflow — that can be a later addition if
  you want to go further.
- `/alumni/profile` — edit personal/professional info, the directory and
  mentorship toggles, and change password, all on one page
- `/admin/alumni` — admin list, with search, an active/suspended toggle, and
  delete (Super Admin only, same pattern as the existing member delete)

### Navigation (item 6)

- Alumni added to the hamburger menu
- The homepage's 4-box quick-links section is now 5 (Membership Portal,
  Resource Library, Elections, Donate, Alumni)

### Automated tests

Two real end-to-end tests were added (run against the actual database, not
mocked): self-registration → sign in, and the graduation-promotion flow
(mark graduated → account created with no usable password yet → confirmed
attempting to log in before setting one fails clearly). These will keep
passing on every future change, catching regressions automatically.

## Scoped out of this round (worth knowing)

- **Photo upload on the alumni profile isn't wired up yet** — the field
  exists in the database and displays if set (e.g. carried over from a
  promoted member's existing photo), but self-service upload wasn't built
  in this pass, to keep this round's scope manageable. Happy to add it next
  if wanted — it would reuse the same upload component already used
  elsewhere in the admin panel.
- **"Upcoming Events & Reunions" reuses the site's existing Events page**
  rather than a separate alumni-only events system — there was no
  indication a separate events model was needed, and this avoids
  duplicating content.
- **Mentorship stays list-only**, per your answer — no request/matching
  workflow.
