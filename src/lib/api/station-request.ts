import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authenticateStation } from "@/lib/services/polling-station-service";
import type { PollingStation } from "@/generated/prisma/client";

/**
 * The door the polling terminals come in by.
 *
 * A terminal is not a person and has no session: it identifies itself on
 * every request with the code and key it was registered with. The key is
 * held by the Electoral Commission's officer and typed in once when the
 * terminal is set up, so it never travels with the software.
 *
 * These endpoints are deliberately not open to browsers — no CORS headers,
 * because ASSN Ballot makes its calls from the desktop process rather than
 * from a web page, which is also what keeps the station key out of
 * anything a voter could open.
 */

export const STATION_CODE_HEADER = "x-station-code";
export const STATION_KEY_HEADER = "x-station-key";

export type StationRequest = { station: PollingStation } | { response: NextResponse };

export async function requireStation(request: NextRequest): Promise<StationRequest> {
  const station = await authenticateStation(
    request.headers.get(STATION_CODE_HEADER),
    request.headers.get(STATION_KEY_HEADER),
  );
  if (!station) {
    return {
      response: NextResponse.json(
        { ok: false, error: "This terminal is not registered, or its key has changed." },
        { status: 401 },
      ),
    };
  }
  return { station };
}

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}
