"use client";

import { useEffect, useState } from "react";

/** True only after the client has mounted — keeps SSR and first client render identical. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
