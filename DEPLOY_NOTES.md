# Deploying this update

No database changes this round — just code:

```bash
git add .
git commit -m "dynamic email branding (name + logo), no more hardcoded Acme name"
git push
```

## What changed

1. **Email header/footer name** — every email (approval, rejection, password
   reset, etc.) now pulls the organization name from **Admin → Settings →
   Site Title**, instead of a hardcoded "Acme University Students'
   Association". If your Site Title is already set correctly there, emails
   will pick it up automatically on the next send — no further action
   needed.
2. **Email logo** — if you've uploaded a logo under **Admin → Settings**
   (the same logo that shows in your site header), emails now show that
   logo image instead of a plain solid-color bar. If no logo is set, it
   falls back to the plain color bar with the site title as text, same as
   before.
3. **"Log in to the Membership Portal" button going to the wrong URL** —
   this isn't a code bug, the code already builds this link from your
   `NEXT_PUBLIC_APP_URL` environment variable. **You need to update that
   variable in Vercel** to `https://assnuew.com` (it's likely still set to
   the old `.vercel.app` URL from before you connected the custom domain),
   then redeploy. Same applies to the password-reset link and the "Review
   Application" link in admin notification emails — they all use the same
   variable.

## One thing to check before you deploy

Go to **Admin → Settings** on the live site right now and confirm:
- **Site Title** is set to the association's real full name (this is what
  will appear in every email header/footer)
- A **logo** is uploaded, if you want emails to show it instead of the
  plain color bar

Both of these already exist as settings from earlier work — this round
just makes emails actually use them.
