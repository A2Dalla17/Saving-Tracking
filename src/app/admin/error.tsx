"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/somali";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page error:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <h2 className="text-lg font-semibold text-card-foreground">Admin — khalad server</h2>
      <p className="text-sm text-muted-foreground">
        Cache-ka Next.js wuu burburay (OneDrive). PowerShell ku qor:{" "}
        <code className="text-xs bg-muted px-1 rounded">npm run dev:win</code> kadib dib u fur
        /admin.
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="gold" onClick={() => reset()}>
          {t.common.loading}
        </Button>
        <Button variant="outline" onClick={() => window.location.assign("/dashboard")}>
          Dashboard
        </Button>
      </div>
    </div>
  );
}
