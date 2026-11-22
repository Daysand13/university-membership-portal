import { createHash } from "node:crypto";

/**
 * Who signed an APK.
 *
 * Android only installs an update signed with the same key as the app
 * already on the phone, and that key is what makes a build the
 * association's. So before any build is published through the release
 * route, its signing certificate is read and compared with the
 * association's own; a build signed by anybody else is refused, however it
 * was obtained.
 *
 * Reads the APK Signature Scheme v2/v3 block, which sits just before the
 * ZIP central directory:
 *   https://source.android.com/docs/security/features/apksigning/v2
 * Plain parsing of bytes; nothing is executed or unpacked.
 */

/** The association's app signing certificate (SHA-256 of its DER encoding), as in every build since 1.0.0. */
export const ASSOCIATION_SIGNING_CERT_SHA256 = "416822c9109b7043399ab8aeaf4100f393cc8af67259b823bc16742e1dc15e86";

const V2_BLOCK_ID = 0x7109871a;
const V3_BLOCK_ID = 0xf05368c0;
const MAGIC = "APK Sig Block 42";

export class ApkSignatureError extends Error {}

function lengthPrefixed(buffer: Buffer, offset: number): { value: Buffer; next: number } {
  if (offset + 4 > buffer.length) throw new ApkSignatureError("The signing block is cut short.");
  const length = buffer.readUInt32LE(offset);
  const start = offset + 4;
  if (start + length > buffer.length) throw new ApkSignatureError("The signing block is cut short.");
  return { value: buffer.subarray(start, start + length), next: start + length };
}

/** The first signer's certificate in a v2 or v3 block. */
function firstCertificate(block: Buffer): Buffer {
  const signers = lengthPrefixed(block, 0).value;
  const signer = lengthPrefixed(signers, 0).value;
  const signedData = lengthPrefixed(signer, 0).value;
  const digests = lengthPrefixed(signedData, 0);
  const certificates = lengthPrefixed(signedData, digests.next).value;
  return lengthPrefixed(certificates, 0).value;
}

/**
 * SHA-256 of the signing certificate in each scheme the APK carries.
 * Throws if the file isn't a ZIP, or carries no v2/v3 signature.
 */
export function apkSigningCertificates(apk: Buffer): { v2?: string; v3?: string } {
  // End of central directory: 22 bytes, plus a comment of up to 65535.
  let eocd = -1;
  for (let i = apk.length - 22; i >= Math.max(0, apk.length - 22 - 65535); i -= 1) {
    if (apk.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ApkSignatureError("That file isn't an APK (no ZIP directory).");

  const centralDirectory = apk.readUInt32LE(eocd + 16);
  if (centralDirectory < 32 || centralDirectory > eocd) throw new ApkSignatureError("That APK's ZIP directory is damaged.");
  if (apk.toString("latin1", centralDirectory - 16, centralDirectory) !== MAGIC) {
    throw new ApkSignatureError("That APK has no v2/v3 signature.");
  }
  const blockSize = Number(apk.readBigUInt64LE(centralDirectory - 24));
  const blockStart = centralDirectory - blockSize - 8;
  if (blockStart < 0) throw new ApkSignatureError("That APK's signing block is damaged.");

  const found: { v2?: string; v3?: string } = {};
  let offset = blockStart + 8;
  const end = centralDirectory - 24;
  while (offset + 12 <= end) {
    const pairLength = Number(apk.readBigUInt64LE(offset));
    const id = apk.readUInt32LE(offset + 8);
    const value = apk.subarray(offset + 12, offset + 8 + pairLength);
    offset += 8 + pairLength;
    if (id !== V2_BLOCK_ID && id !== V3_BLOCK_ID) continue;
    const digest = createHash("sha256").update(firstCertificate(value)).digest("hex");
    found[id === V2_BLOCK_ID ? "v2" : "v3"] = digest;
  }
  if (!found.v2 && !found.v3) throw new ApkSignatureError("That APK has no v2/v3 signature.");
  return found;
}

/** Whether every signature the APK carries is the association's. */
export function isSignedByAssociation(apk: Buffer, expected: string = ASSOCIATION_SIGNING_CERT_SHA256): boolean {
  const certs = apkSigningCertificates(apk);
  return Object.values(certs).every((cert) => cert === expected);
}
