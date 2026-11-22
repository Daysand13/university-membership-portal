# Website and app: what each can do

Status as of 22 November 2026 (app 1.2.0, website at the same commit).

The app and the website use one backend and one database. Every app screen
calls `/api/v1/app/*`, and those routes call the same services the website's
pages and forms call: the same checks, the same emails and the same rate
limits. Nothing is copied, and nothing can drift out of step.

**Key**

- ✅ The app does it on its own screen.
- 🌐 The app opens it on the website.
- — Not in the app.

## Account

| | Website | App |
| --- | --- | --- |
| Join (student, graduate, patron) | ✅ | ✅ |
| Sign in, including people with more than one portal | ✅ | ✅ |
| Sign out, and sign out other phones | ✅ | ✅ |
| Forgotten password | ✅ | ✅ The app sends the link; the new password is set on the website. **New.** |
| Change password | ✅ | 🌐 |
| View and edit profile | ✅ | 🌐 Next to build. |

## Students

| | Website | App |
| --- | --- | --- |
| Dashboard | ✅ | ✅ |
| Announcements | ✅ | ✅ |
| News, events, library | ✅ | ✅ |
| Dues: what is owed, what was paid | ✅ | ✅ |
| Dues: paying | ✅ Paystack | 🌐 Kept to one payment path on purpose: one place for receipts and webhooks. |
| Elections: what is on, candidates, results the commission releases | ✅ | ✅ |
| Voting | At the ASSN Ballot terminal only | At the terminal only, by the association's decision |
| Mentorship: mentors, conversation, sending messages | ✅ | ✅ **New** |
| Mentorship: calls | ✅ | 🌐 Opens the call on the website; a phone notification says when someone is calling. **New.** |
| Mentorship: asking for a mentor, booking a session | ✅ | 🌐 |
| ID card | ✅ | 🌐 Next to build. |
| Support requests | ✅ | 🌐 Next to build. |
| Barrier reports | ✅ | 🌐 Next to build. |
| Academic records, letters, CV, study groups | ✅ | 🌐 |

## Graduates

| | Website | App |
| --- | --- | --- |
| Dashboard, announcements, events | ✅ | ✅ |
| Alumni directory | ✅ | ✅ |
| Mentorship: students, conversation, messages | ✅ | ✅ **New** |
| Mentorship: calls | ✅ | 🌐 **New** |
| Opportunities, career, CV, letters, further studies, giving, records | ✅ | 🌐 |

## Patrons

| | Website | App |
| --- | --- | --- |
| Join, sign in | ✅ | ✅ |
| News, events, announcements, library | ✅ | ✅ |
| Advocacy, documents, finances, messages, membership | ✅ | 🌐 |

## Administrators

The admin dashboard is not in the app, and that is a recommendation, not an
oversight:

- Admin work is mostly long forms, tables and file uploads: reviewing
  applications, recording payments, running elections.
- The admin pages pass the responsive audit at phone and tablet sizes
  (360px to 915px, portrait and landscape). An officer on a phone can use
  them in the browser today.
- Every admin permission is checked on the server, page by page. A second
  admin surface would be a second place for a permission to be missed.

If a mobile admin task proves common, for example approving a membership
application, it can be added to the app as one screen behind the same
capability check.

## How a notification finds its screen

Notifications carry a website path. `src/push/routes.ts` turns each path
into a screen the app has (news, events, mentorship, dues, announcements,
elections), or opens it on the website. A notification never lands on a
dead screen. Calls always open on the website, where the meeting runs.

## Next, in order

1. Profile: view and edit contact details.
2. Support requests: list and new.
3. ID card: show it, offline.
4. Barrier reports: list and new.
5. Booking a mentorship session.

Each needs one or two `/api/v1/app` routes over the existing services, and
one screen.
