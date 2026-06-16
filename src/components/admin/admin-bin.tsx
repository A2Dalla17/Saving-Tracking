"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatDateTime } from "@/lib/calculations";
import { t } from "@/lib/somali";
import type { ArchivedMemberRecord } from "@/types";

function reasonLabel(reason: ArchivedMemberRecord["reason"]): string {
  return reason === "auto_removed" ? t.admin.reasonAuto : t.admin.reasonAdmin;
}

export function AdminBin() {
  const { bin, restoreFromBin } = useData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (record: ArchivedMemberRecord) => {
    const msg = t.admin.confirmRestore.replace("{name}", record.member.name);
    if (!confirm(msg)) return;

    setRestoringId(record.id);
    try {
      await restoreFromBin(record.id);
      toast.success(t.admin.restored.replace("{name}", record.member.name));
    } catch {
      toast.error(t.common.error);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          {t.admin.binTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t.admin.binSubtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {bin.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t.admin.binEmpty}</p>
        ) : (
          bin.map((record) => {
            const expanded = expandedId === record.id;
            return (
              <div key={record.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-card-foreground">{record.member.name}</p>
                    <p className="text-sm text-muted-foreground">{record.member.email ?? record.member.phone ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.admin.archivedAt}: {formatDateTime(record.archivedAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.admin.archivedReason}: {reasonLabel(record.reason)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedId(expanded ? null : record.id)}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {expanded ? t.admin.hideDetails : t.admin.viewDetails}
                    </Button>
                    <Button
                      size="sm"
                      variant="gold"
                      disabled={restoringId === record.id}
                      onClick={() => handleRestore(record)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t.admin.restore}
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t.members.totalPaid}</p>
                      <p className="font-medium">{formatCurrency(record.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.profile.monthlyRequired}</p>
                      <p className="font-medium">{formatCurrency(record.member.monthlyFee ?? 55)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.profile.annualTarget}</p>
                      <p className="font-medium">{formatCurrency(record.member.annualTarget ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.members.joinDate}</p>
                      <p className="font-medium">{new Date(record.member.joinDate).toLocaleDateString("so-SO")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.admin.paymentsSaved}</p>
                      <p className="font-medium">{record.payments.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.admin.chatsSaved}</p>
                      <p className="font-medium">{record.chats.length}</p>
                    </div>
                    {record.payments.length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground mb-1">{t.timeline.title}</p>
                        <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
                          {record.payments.slice(0, 10).map((p) => (
                            <li key={p.id} className="flex justify-between gap-2">
                              <span>{p.month}</span>
                              <span>{formatCurrency(p.amount)} — {formatDateTime(p.paidAt)}</span>
                            </li>
                          ))}
                          {record.payments.length > 10 && (
                            <li className="text-muted-foreground">+{record.payments.length - 10} kale...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
