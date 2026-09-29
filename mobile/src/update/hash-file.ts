import { File } from "expo-file-system";
import { Sha256 } from "./sha256";

/**
 * Hashing a file on disk.
 *
 * Kept apart from the algorithm itself, which has no business knowing what
 * a file is — and which could not be tested at all while it imported one,
 * since pulling in expo-file-system drags the whole of React Native along.
 *
 * Read as a stream rather than into memory: an APK is tens of megabytes
 * and a phone with 2GB of RAM should not hold it all at once to check it.
 */
export async function createHash(uri: string): Promise<string> {
  const file = new File(uri);
  const hash = new Sha256();

  const reader = file.readableStream().getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) hash.update(value);
    }
  } finally {
    reader.releaseLock();
  }

  return hash.digestHex();
}
