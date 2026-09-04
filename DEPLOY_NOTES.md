# Deploying this update

No database changes this round — just code:

```bash
git add .
git commit -m "fix member deletion leaving orphaned application, allow deleting rejected/suspended applications"
git push
```

## Issue (a) — the real bug

Confirmed by writing a test that reproduces it exactly: deleting a member
only ever deleted the `Member` row. The original `MembershipApplication`
record — the one with the same index number — was never touched, and
`indexNumber` is a unique column. So the database still considered that
index number "taken" even though the member was gone, and any new
application with the same index number got rejected with exactly the
message you saw.

**Fix**: `deleteMember` now deletes the member's original application in
the same transaction (order matters — the member row references the
application, so it has to go first). This is now covered by an automated
test: submit → approve → delete → resubmit with the same index number, and
confirm it succeeds. That test is in the zip and will keep passing on every
future change, so this can't silently regress again.

## Item (c) — delete rejected/suspended applications

Added a delete button on the Membership Applications list, but **only** for
applications currently in Rejected or Suspended status — Pending,
Under Review, and Approved applications can't be deleted this way (Approved
ones are tied to a live member; delete the member instead, which now also
cleans up its application per the fix above). This is enforced on the
server, not just hidden in the UI, so it can't be bypassed by, say, editing
the request directly.

## Best practices note (as requested)

The general lesson here: whenever a "delete" affects a record with fields
also enforced as unique elsewhere in the system (index numbers, emails,
usernames), deleting only the "surface" record isn't enough — anything
that shares that unique value has to be cleaned up in the same transaction,
or the deletion becomes only cosmetic from the database's point of view.
Worth checking for this same pattern anywhere else records get deleted.

---

**Not included yet**: the Alumni Network & Member Portal (item b) — that's
a large, separate feature (its own sign-in/registration, a member
directory, mentorship board, and nav integration) that deserves its own
focused round rather than being rushed in alongside this fix. Let me know
when you're ready and I'll build it out properly.
