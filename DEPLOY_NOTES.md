# Deploying this update

No database changes this round — just code, plus one new dependency
(@react-pdf/renderer, for the PDF export). npm install picks that up
automatically.

```bash
npm install
git add .
git commit -m "form review step, gender restriction, admin filters/delete/PDF export, formal emails"
git push
```

## What's in this round

1. **Form preview before submission** — both the undergraduate and
   postgraduate registration forms now have a "Review Application" step.
   Clicking it validates everything first (any missing/invalid field stops
   it right there), then shows a full read-only summary — including a
   thumbnail of the passport picture and the medical report's filename —
   with "Edit Application" (goes back, nothing is lost) and "Confirm &
   Submit" buttons.
2. **Gender restricted to Male/Female** in the form. The database itself
   still technically allows other values (so nothing breaks for any old
   records), this is a form-level restriction only.
3. **More professional emails** — every email (approval, rejection,
   password reset, profile update, admin notifications) now reads more
   formally, with a proper salutation and sign-off.
4. **Admin member filters** at `/admin/members` — department, programme,
   membership type, gender, undergraduate/postgraduate, campus, status, and
   a date range, all combinable, all reflected in the URL so a filtered view
   can be bookmarked or shared with another admin.
5. **Admin delete** — Super Admins can delete a member directly from the
   list (with a confirmation prompt). This is permanent and does not touch
   their original application record, only the member account itself.
   Logged in the Audit Log.
6. **PDF export** — "Export PDF" on the members page generates a formatted
   PDF of exactly what's currently on screen (respects every active
   filter). Un-filtered, it exports the full member list.

## A judgment call worth knowing about

The PDF export **does not include "Category of Special Needs"** (disability
category) — that's sensitive, health-adjacent information, and since it
wasn't one of the filters you asked for, I left it out of the exported
document by default to avoid it ending up in something that gets printed or
forwarded. Let me know if you'd actually like it included and I'll add it.
