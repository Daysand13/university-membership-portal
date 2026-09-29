/**
 * SHA-256, a chunk at a time.
 *
 * An APK is tens of megabytes and a phone with 2GB of RAM should not hold
 * it all in memory to hash it — nor can expo-crypto hash a file, only a
 * string. So this is the algorithm itself, fed in pieces.
 *
 * It is a boring, well-specified thing, and the tests check it against
 * FIPS 180-4's own vectors and against Node's crypto. Getting it subtly
 * wrong would mean either rejecting every good download or accepting a
 * bad one, and neither would be obvious.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export class Sha256 {
  private h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  private buffer = new Uint8Array(64);
  private bufferLength = 0;
  private bytesHashed = 0;
  private readonly w = new Uint32Array(64);

  update(bytes: Uint8Array): this {
    this.bytesHashed += bytes.length;
    let offset = 0;

    // Finish whatever part-block is left over from last time.
    if (this.bufferLength > 0) {
      const needed = Math.min(64 - this.bufferLength, bytes.length);
      this.buffer.set(bytes.subarray(0, needed), this.bufferLength);
      this.bufferLength += needed;
      offset = needed;
      if (this.bufferLength === 64) {
        this.compress(this.buffer, 0);
        this.bufferLength = 0;
      }
    }

    while (offset + 64 <= bytes.length) {
      this.compress(bytes, offset);
      offset += 64;
    }

    if (offset < bytes.length) {
      this.buffer.set(bytes.subarray(offset), 0);
      this.bufferLength = bytes.length - offset;
    }
    return this;
  }

  digestHex(): string {
    const bitLength = this.bytesHashed * 8;

    // Padding: a 1 bit, then zeros, then the length as 64 bits big-endian.
    const padded = new Uint8Array(this.bufferLength <= 55 ? 64 : 128);
    padded.set(this.buffer.subarray(0, this.bufferLength), 0);
    padded[this.bufferLength] = 0x80;

    const lengthOffset = padded.length - 8;
    // JavaScript numbers hold a file size comfortably; the high word is
    // only non-zero above 512 petabytes.
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    padded[lengthOffset] = (high >>> 24) & 0xff;
    padded[lengthOffset + 1] = (high >>> 16) & 0xff;
    padded[lengthOffset + 2] = (high >>> 8) & 0xff;
    padded[lengthOffset + 3] = high & 0xff;
    padded[lengthOffset + 4] = (low >>> 24) & 0xff;
    padded[lengthOffset + 5] = (low >>> 16) & 0xff;
    padded[lengthOffset + 6] = (low >>> 8) & 0xff;
    padded[lengthOffset + 7] = low & 0xff;

    for (let offset = 0; offset < padded.length; offset += 64) this.compress(padded, offset);

    let out = "";
    for (const word of this.h) out += word.toString(16).padStart(8, "0");
    return out;
  }

  private compress(block: Uint8Array, offset: number): void {
    const w = this.w;
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = ((block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = this.h;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    this.h[0] = (this.h[0] + a) >>> 0;
    this.h[1] = (this.h[1] + b) >>> 0;
    this.h[2] = (this.h[2] + c) >>> 0;
    this.h[3] = (this.h[3] + d) >>> 0;
    this.h[4] = (this.h[4] + e) >>> 0;
    this.h[5] = (this.h[5] + f) >>> 0;
    this.h[6] = (this.h[6] + g) >>> 0;
    this.h[7] = (this.h[7] + h) >>> 0;
  }
}

/** The whole of a small input, in one call. */
export function sha256Hex(bytes: Uint8Array): string {
  return new Sha256().update(bytes).digestHex();
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 to bytes, without depending on a global atob. */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const length = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(length);

  let byte = 0;
  let bits = 0;
  let written = 0;
  for (const character of clean) {
    const value = BASE64.indexOf(character);
    if (value === -1) continue;
    byte = (byte << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[written++] = (byte >> bits) & 0xff;
    }
  }
  return out.subarray(0, written);
}
