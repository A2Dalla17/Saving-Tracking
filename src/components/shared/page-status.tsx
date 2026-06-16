"use client";

import { t } from "@/lib/somali";

interface PageStatusProps {
  message?: string;
  className?: string;
}

export function PageStatus({ message, className = "" }: PageStatusProps) {
  return (
    <p className={`text-muted-foreground ${className}`.trim()}>{message ?? t.common.loading}</p>
  );
}

export function PageLoading({ message }: { message?: string }) {
  return <PageStatus message={message} className="py-4 text-muted-foreground" />;
}
