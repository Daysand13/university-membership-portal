"use client";

import { useEffect } from "react";
import { installFormSafety } from "@/lib/client/form-safety";

/** Mounted once in the root layout; see lib/client/form-safety.ts. */
export function FormSafety() {
  useEffect(() => installFormSafety(), []);
  return null;
}
