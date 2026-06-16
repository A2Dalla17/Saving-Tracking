"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/lib/hooks/use-admin";
import { useData } from "@/lib/hooks/use-data";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { ADMIN_EMAIL, MAX_PIN_ATTEMPTS } from "@/lib/constants";
import { t } from "@/lib/somali";

interface PinGuardProps {
  children: React.ReactNode;
  description?: string;
}

function PinGuardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pin-guard-shell flex w-full flex-col items-center justify-center min-h-[min(52vh,520px)] py-8">
      {children}
    </div>
  );
}

export function PinGuard({ children, description }: PinGuardProps) {
  const hydrated = useHydrated();
  const { isUnlocked, unlock, failedAttempts, isLocked, unlockWithRecovery, requestRecovery, lock } = useAdmin();
  const { settings } = useData();
  const [pin, setPin] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [verifyingRecovery, setVerifyingRecovery] = useState(false);

  useEffect(() => {
    return () => lock();
  }, [lock]);

  if (!hydrated) {
    return (
      <PinGuardShell>
        <p className="text-muted-foreground">{t.common.loading}</p>
      </PinGuardShell>
    );
  }

  if (isUnlocked) return <>{children}</>;

  const handleUnlock = () => {
    if (!pin) {
      setError(t.ledger.pinRequired);
      return;
    }
    const success = unlock(pin, settings.adminPin);
    if (!success) {
      const remaining = MAX_PIN_ATTEMPTS - failedAttempts - 1;
      if (remaining <= 0) {
        setError(t.recovery.lockedOut);
        setShowRecovery(true);
      } else {
        setError(`${t.ledger.pinIncorrect} (${remaining} isku day oo haray)`);
      }
      setPin("");
    }
  };

  const handleSendRecovery = async () => {
    setSendingRecovery(true);
    const result = await requestRecovery();
    setSendingRecovery(false);
    if (result.success) {
      toast.success(result.message);
      setShowRecovery(true);
    } else {
      toast.error(result.message);
    }
  };

  const handleVerifyRecovery = async () => {
    if (!recoveryCode) return;
    setVerifyingRecovery(true);
    const success = await unlockWithRecovery(recoveryCode);
    setVerifyingRecovery(false);
    if (success) {
      toast.success(t.recovery.success);
    } else {
      setError(t.recovery.invalidCode);
    }
  };

  if (isLocked || showRecovery) {
    return (
      <PinGuardShell>
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader>
          <CardTitle>{t.recovery.title}</CardTitle>
          <CardDescription>
            {t.recovery.desc} <strong>{ADMIN_EMAIL}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSendRecovery} variant="outline" className="w-full" disabled={sendingRecovery}>
            {sendingRecovery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {t.recovery.sendCode}
          </Button>
          <div className="space-y-2">
            <Label htmlFor="recovery">{t.recovery.enterCode}</Label>
            <Input
              id="recovery"
              placeholder="123456"
              maxLength={6}
              value={recoveryCode}
              onChange={(e) => {
                setRecoveryCode(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyRecovery()}
            />
            {error && <p className="text-sm text-card-foreground">{error}</p>}
          </div>
          <Button onClick={handleVerifyRecovery} className="w-full" disabled={verifyingRecovery}>
            {verifyingRecovery ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {t.recovery.verify}
          </Button>
        </CardContent>
      </Card>
      </PinGuardShell>
    );
  }

  return (
    <PinGuardShell>
    <Card className="w-full max-w-md animate-fade-in-up">
      <CardHeader>
        <CardDescription>{description ?? t.admin.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pin">{t.ledger.enterPin}</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder={t.ledger.pinPlaceholder}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          />
          {error && <p className="text-sm text-card-foreground">{error}</p>}
          {failedAttempts > 0 && (
            <p className="text-xs text-muted-foreground">
              {MAX_PIN_ATTEMPTS - failedAttempts} isku day oo haray
            </p>
          )}
        </div>
        <Button onClick={handleUnlock} className="w-full">
          <ShieldCheck className="h-4 w-4" />
          {t.ledger.unlock}
        </Button>
      </CardContent>
    </Card>
    </PinGuardShell>
  );
}
