import { createHash as nodeHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Sha256, base64ToBytes, sha256Hex } from "../src/update/sha256";

/**
 * The hash that decides whether a downloaded APK is installed.
 *
 * Wrong in one direction it rejects every good update; wrong in the other
 * it accepts a bad one. Neither would be obvious from using the app, so it
 * is checked against the published vectors and against Node's own crypto.
 */

const bytes = (text: string) => new TextEncoder().encode(text);

describe("SHA-256", () => {
  it("matches the vectors in the standard", () => {
    // FIPS 180-4, the two worked examples.
    expect(sha256Hex(bytes("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex(bytes(""))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex(bytes("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("agrees with Node on a million characters", () => {
    // The standard's third vector, and the one that catches a length
    // counter that overflows or a block boundary handled wrongly.
    const million = bytes("a".repeat(1_000_000));
    expect(sha256Hex(million)).toBe(nodeHash("sha256").update(million).digest("hex"));
  });

  it("gives the same answer however the input is broken up", () => {
    // Which is the whole point: an APK arrives in chunks, and the chunk
    // size must not change the result.
    const data = randomBytes(300_000);
    const expected = nodeHash("sha256").update(data).digest("hex");

    for (const chunk of [1, 63, 64, 65, 1000, 4096, 99_991]) {
      const hash = new Sha256();
      for (let at = 0; at < data.length; at += chunk) {
        hash.update(new Uint8Array(data.subarray(at, Math.min(at + chunk, data.length))));
      }
      expect(hash.digestHex(), `chunked by ${chunk}`).toBe(expected);
    }
  });

  it("handles the lengths where padding changes shape", () => {
    // 55 and 56 bytes straddle the point where the length no longer fits
    // in the final block and a second one is needed.
    for (const length of [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128]) {
      const data = randomBytes(length);
      expect(sha256Hex(new Uint8Array(data)), `${length} bytes`).toBe(
        nodeHash("sha256").update(data).digest("hex"),
      );
    }
  });

  it("notices a single flipped bit", () => {
    const data = randomBytes(10_000);
    const before = sha256Hex(new Uint8Array(data));
    data[5000] ^= 0x01;
    expect(sha256Hex(new Uint8Array(data))).not.toBe(before);
  });
});

describe("reading base64 back to bytes", () => {
  it("round-trips whatever it is given", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 100, 3 * 1024]) {
      const data = randomBytes(length);
      const base64 = data.toString("base64");
      expect(Buffer.from(base64ToBytes(base64)).equals(data), `${length} bytes`).toBe(true);
    }
  });

  it("ignores the line breaks a file read may include", () => {
    const data = randomBytes(600);
    const wrapped = data.toString("base64").replace(/(.{76})/g, "$1\n");
    expect(Buffer.from(base64ToBytes(wrapped)).equals(data)).toBe(true);
  });
});
