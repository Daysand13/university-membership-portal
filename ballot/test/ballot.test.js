"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { CountdownAnnouncer } = require("../src/lib/announcements");
const { BallotQueue } = require("../src/lib/queue");
const { ServerClock } = require("../src/lib/clock");
const { createPortalClient, OfflineError } = require("../src/lib/portal");

const minutes = (n) => n * 60_000;

test("the countdown says each milestone once, on the way down", () => {
  const announcer = new CountdownAnnouncer();
  assert.equal(announcer.tick(minutes(180)), null);
  assert.equal(announcer.tick(minutes(121)), null);
  assert.equal(announcer.tick(minutes(120)), "time_2hours");
  assert.equal(announcer.tick(minutes(119)), null, "not twice");
  assert.equal(announcer.tick(minutes(60)), "time_1hour");
  assert.equal(announcer.tick(minutes(40)), "time_40min");
  assert.equal(announcer.tick(minutes(2)), "time_2min");
});

test("a terminal switched on late doesn't recite the announcements it missed", () => {
  const announcer = new CountdownAnnouncer();
  assert.equal(announcer.tick(minutes(25)), null, "nothing owed on first sight");
  assert.equal(announcer.tick(minutes(20)), "time_20min");
});

test("two milestones crossed in one gap say the more urgent of them", () => {
  const announcer = new CountdownAnnouncer();
  announcer.tick(minutes(45));
  // Forty and thirty both went by in the gap; thirty is the one worth saying.
  assert.equal(announcer.tick(minutes(28)), "time_30min");
  assert.equal(announcer.tick(minutes(27)), null);
});

test("the end is announced once, and an extension brings the countdown back", () => {
  const announcer = new CountdownAnnouncer();
  announcer.tick(minutes(3));
  assert.equal(announcer.tick(0), "election_ended");
  assert.equal(announcer.tick(0), null);
  // The commission adds half an hour after the bell.
  assert.equal(announcer.reopen(minutes(30)), null);
  assert.equal(announcer.tick(minutes(20)), "time_20min");
});

test("the queue keeps ballots across a restart, and never twice", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "assn-ballot-"));
  const file = path.join(dir, "queued.json");

  const queue = new BallotQueue(file);
  await queue.add({ clientRef: "LIB-1-a", token: "t1", choices: [] });
  await queue.add({ clientRef: "LIB-1-a", token: "t1", choices: [] });
  await queue.add({ clientRef: "LIB-1-b", token: "t2", choices: [] });
  assert.equal(await queue.size(), 2);

  const afterRestart = new BallotQueue(file);
  assert.equal(await afterRestart.size(), 2);

  await afterRestart.remove("LIB-1-a");
  assert.deepEqual((await new BallotQueue(file).all()).map((e) => e.clientRef), ["LIB-1-b"]);

  await fs.rm(dir, { recursive: true, force: true });
});

test("a terminal with no queue file yet is simply empty", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "assn-ballot-"));
  const queue = new BallotQueue(path.join(dir, "nothing-here.json"));
  assert.equal(await queue.size(), 0);
  await fs.rm(dir, { recursive: true, force: true });
});

test("the clock runs on the portal's time, not the machine's", () => {
  const clock = new ServerClock();
  const machineNow = Date.now();
  // This workstation is an hour behind.
  clock.sync(new Date(machineNow + 3_600_000).toISOString());
  const remaining = clock.msUntil(new Date(machineNow + 3_600_000 + 600_000).toISOString());
  assert.ok(Math.abs(remaining - 600_000) < 1000, `expected about ten minutes, got ${remaining}`);
});

test("every call carries the terminal's code and key", async () => {
  let seen = null;
  const portal = createPortalClient({
    baseUrl: "https://example.test/",
    stationCode: "LIB-1",
    stationKey: "SECRET",
    fetchImpl: async (url, options) => {
      seen = { url, options };
      return { status: 200, json: async () => ({ ok: true, serverTime: "2026-11-14T08:00:00.000Z" }) };
    },
  });

  await portal.getSchedule();
  assert.equal(seen.url, "https://example.test/api/v1/elections/schedule");
  assert.equal(seen.options.headers["x-station-code"], "LIB-1");
  assert.equal(seen.options.headers["x-station-key"], "SECRET");
});

test("a refusal and a dead line are told apart", async () => {
  const rejected = createPortalClient({
    baseUrl: "https://example.test",
    stationCode: "LIB-1",
    stationKey: "WRONG",
    fetchImpl: async () => ({ status: 401, json: async () => ({ ok: false, error: "not registered" }) }),
  });
  await assert.rejects(() => rejected.getSchedule(), (err) => err.name === "StationRejectedError");

  const offline = createPortalClient({
    baseUrl: "https://example.test",
    stationCode: "LIB-1",
    stationKey: "SECRET",
    fetchImpl: async () => {
      throw new Error("ENOTFOUND");
    },
  });
  await assert.rejects(() => offline.getSchedule(), (err) => err instanceof OfflineError);
});

test("the portal's own answer isn't lost behind the HTTP status", async () => {
  const portal = createPortalClient({
    baseUrl: "https://example.test",
    stationCode: "LIB-1",
    stationKey: "SECRET",
    fetchImpl: async () => ({ status: 200, json: async () => ({ ok: true, status: "ALREADY_VOTED" }) }),
  });

  const result = await portal.castVote({ token: "t", clientRef: "r", choices: [] });
  assert.equal(result.httpStatus, 200);
  assert.equal(result.status, "ALREADY_VOTED");
});
