"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Votes waiting for the line to come back.
 *
 * A hall with fluctuating internet cannot stop taking votes, so a ballot
 * that can't be sent is written to disk and sent later. Two things make
 * that safe: every paper carries the reference the terminal gave it, so
 * the portal can recognise a second delivery of the same one and drop it;
 * and the file is replaced whole, by rename, so a power cut mid-write
 * leaves the old file rather than half a new one.
 *
 * What it holds is a voting slip and a list of choices. There is no name
 * in it, and nothing here can work out whose vote it is.
 */
class BallotQueue {
  constructor(filePath) {
    this.filePath = filePath;
    this.entries = null;
  }

  async load() {
    if (this.entries) return this.entries;
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      this.entries = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      // No file yet is the ordinary case on a fresh terminal. A corrupt
      // one is not something to crash a polling station over: it is
      // logged by the caller and set aside.
      if (err.code !== "ENOENT") this.corrupt = err;
      this.entries = [];
    }
    return this.entries;
  }

  async size() {
    return (await this.load()).length;
  }

  async all() {
    return [...(await this.load())];
  }

  async add(entry) {
    const entries = await this.load();
    if (entries.some((e) => e.clientRef === entry.clientRef)) return;
    entries.push(entry);
    await this.flush();
  }

  async remove(clientRef) {
    const entries = await this.load();
    const kept = entries.filter((e) => e.clientRef !== clientRef);
    if (kept.length === entries.length) return;
    this.entries = kept;
    await this.flush();
  }

  async flush() {
    const temp = `${this.filePath}.tmp`;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(temp, JSON.stringify(this.entries ?? [], null, 2), "utf8");
    await fs.rename(temp, this.filePath);
  }
}

module.exports = { BallotQueue };
