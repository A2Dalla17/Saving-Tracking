"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <html lang="so">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>AC7 Group — khalad app</h2>
        <p style={{ color: "#555", marginBottom: "1rem" }}>
          Browser-ka ama Firebase connection ayaa fashilmay. Dib u cusbooneysii bogga.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            background: "#0f2744",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Dib u fur
        </button>
      </body>
    </html>
  );
}
