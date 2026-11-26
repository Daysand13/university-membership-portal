/**
 * Where a link from the website lands in the app.
 *
 * Notifications and emails name website paths. Some of those are screens
 * the app has; the rest are not, and sending the router to a path it has
 * no screen for shows a dead "page not found". So each path is either
 * turned into the app's own screen or opened on the website — never
 * dropped.
 *
 * Calls are always the website's: the meeting runs there.
 */

export type Destination = { kind: "app"; route: string } | { kind: "web"; path: string };

const MENTORSHIP = /^\/(?:membership\/dashboard|alumni)\/mentorship\/([A-Za-z0-9_-]+)(\/call)?\/?$/;
const SAME_IN_APP = /^\/(news|events)\/([A-Za-z0-9_-]+)\/?$/;

export function destinationFor(path: string): Destination {
  const clean = path.split(/[?#]/)[0];

  const same = SAME_IN_APP.exec(clean);
  if (same) return { kind: "app", route: `/${same[1]}/${same[2]}` };

  const mentorship = MENTORSHIP.exec(clean);
  if (mentorship) {
    return mentorship[2] ? { kind: "web", path } : { kind: "app", route: `/mentorship/${mentorship[1]}` };
  }
  if (/^\/(?:membership\/dashboard|alumni)\/mentorship\/?$/.test(clean)) return { kind: "app", route: "/mentorship" };
  if (/^\/membership\/dashboard\/announcements\/?$/.test(clean) || /^\/alumni\/announcements\/?$/.test(clean)) {
    return { kind: "app", route: "/announcements" };
  }
  if (/^\/membership\/dashboard\/dues\/?$/.test(clean)) return { kind: "app", route: "/dues" };
  if (/^\/(?:membership\/dashboard|alumni)\/profile\/?$/.test(clean)) return { kind: "app", route: "/profile" };
  if (/^\/membership\/dashboard\/id-card\/?$/.test(clean)) return { kind: "app", route: "/id-card" };
  if (/^\/membership\/dashboard\/support(?:\/.*)?$/.test(clean)) return { kind: "app", route: "/support" };
  if (/^\/membership\/dashboard\/rights\/new\/?$/.test(clean)) return { kind: "app", route: "/barrier-reports/new" };
  if (/^\/membership\/dashboard\/rights(?:\/.*)?$/.test(clean)) return { kind: "app", route: "/barrier-reports" };
  if (/^\/(?:membership\/dashboard\/)?elections\/?$/.test(clean)) return { kind: "app", route: "/elections" };

  return { kind: "web", path };
}
