"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f8fb", color: "#131b23" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 32,
              textAlign: "center",
            }}
          >
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#5b6b7c", marginTop: 8, lineHeight: 1.6 }}>
              We hit an unexpected error. This has been logged — please try reloading the page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: 20,
                background: "#24266b",
                color: "#ffffff",
                fontWeight: 600,
                padding: "10px 22px",
                borderRadius: 6,
                border: "none",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
