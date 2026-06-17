"use client";

import { Download, Share2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { useData } from "@/lib/hooks/use-data";
import { useAuth } from "@/lib/hooks/use-auth";
import { calculateMemberStats, calculateGroupStats } from "@/lib/calculations";
import { getPayingMembers, filterPayingPayments } from "@/lib/member-status";
import { resolveProfileMember } from "@/lib/resolve-profile-member";
import { downloadMemberPdf, shareMemberPdf } from "@/lib/pdf";
import { t } from "@/lib/somali";

export function MyStatementPortal() {
  const { members, payments, settings } = useData();
  const { user } = useAuth();

  const payingMembers = getPayingMembers(members);
  const payingPayments = filterPayingPayments(members, payments);
  const groupStats = calculateGroupStats(payingMembers, payingPayments, settings);
  const selectedMember = resolveProfileMember(members, user);
  const memberStats = selectedMember
    ? calculateMemberStats(selectedMember, payingPayments, groupStats.totalSavings, settings)
    : null;

  const handleDownload = () => {
    if (!memberStats || !user) {
      toast.error(t.myStatement.noMember);
      return;
    }
    downloadMemberPdf({
      memberStats,
      groupStats,
      generatedAt: new Date().toISOString(),
    });
    toast.success(t.myStatement.pdfDownloaded);
  };

  const handleShare = async () => {
    if (!memberStats || !user) {
      toast.error(t.myStatement.noMember);
      return;
    }
    try {
      await shareMemberPdf({
        memberStats,
        groupStats,
        generatedAt: new Date().toISOString(),
      });
      toast.success(t.myStatement.pdfReady);
    } catch {
      toast.error(t.common.error);
    }
  };

  return (
    <>
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t.myStatement.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedMember ? (
            <p className="text-lg font-heading font-semibold text-card-foreground">{selectedMember.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t.myStatement.noMember}</p>
          )}
        </CardContent>
      </Card>

      {memberStats ? (
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>{t.myStatement.yourStats}</CardTitle>
            <p className="text-lg font-heading font-bold text-card-foreground">{memberStats.member.name}</p>
            {memberStats.totalPaid === 0 && (
              <p className="text-sm text-muted-foreground">{t.myStatement.newAccountHint}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted border border-border">
                <p className="text-xs text-muted-foreground">{t.myStatement.totalPaid}</p>
                <CurrencyDisplay amount={memberStats.totalPaid} size="md" className="text-card-foreground" />
              </div>
              <div className="p-4 rounded-xl bg-muted border border-border">
                <p className="text-xs text-muted-foreground">{t.myStatement.yourShare}</p>
                <p className="font-mono-currency text-xl font-bold text-card-foreground">
                  {memberStats.sharePercent.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted border border-border">
                <p className="text-xs text-muted-foreground">{t.myStatement.yourDebt}</p>
                <CurrencyDisplay
                  amount={memberStats.debt}
                  size="md"
                  className="text-card-foreground"
                />
              </div>
              <div className="p-4 rounded-xl bg-muted border border-border">
                <p className="text-xs text-muted-foreground">{t.myStatement.monthsPaid}</p>
                <p className="font-mono-currency text-xl font-bold text-card-foreground">{memberStats.monthsPaid}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t.members.share}</span>
                <span className="font-semibold text-card-foreground">{memberStats.sharePercent.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(memberStats.sharePercent, 100)} />
              <p className="text-xs text-muted-foreground">
                {t.members.example}: {memberStats.monthsPaid} bil × ${settings.monthlyFee} = {memberStats.sharePercent.toFixed(1)}% kooxda
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleDownload} variant="gold" className="flex-1">
                <Download className="h-4 w-4" />
                {t.myStatement.downloadPdf}
              </Button>
              <Button onClick={handleShare} variant="outline" className="flex-1">
                <Share2 className="h-4 w-4" />
                {t.myStatement.shareWhatsapp}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t.common.loading}
          </CardContent>
        </Card>
      )}

    </>
  );
}
