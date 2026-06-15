"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { useData } from "@/lib/hooks/use-data";
import { isFirebaseConfigured } from "@/lib/firebase";
import { t } from "@/lib/somali";

export default function LoginPage() {
  const { login } = useAuth();
  const { members, loading } = useData();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cloudMode = isFirebaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(identifier, password, members);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error ?? t.common.error);
    }
    setSubmitting(false);
  };

  if (!cloudMode && loading) {
    return <p className="text-muted-foreground">{t.common.loading}</p>;
  }

  return (
    <Card className="w-full max-w-md animate-fade-in-up shadow-xl border-brand/10">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 relative h-16 w-16">
          <Image src="/logo.png" alt="AC7 Group" fill className="object-contain" priority />
        </div>
        <CardTitle className="text-brand text-2xl">{t.appName}</CardTitle>
        <CardDescription>{t.login.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.login.identifier}</Label>
            <Input
              placeholder={t.login.identifierPlaceholder}
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t.login.password}</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" variant="gold" disabled={submitting}>
            <LogIn className="h-4 w-4" />
            {submitting ? t.common.loading : t.login.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
