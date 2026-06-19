'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrateSession = useAppStore((s) => s.hydrateSession);
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const token = searchParams.get('token');
  const linkError = searchParams.get('error');
  const tokenError = linkError || !token ? t.login.resetLinkInvalid : '';
  const error = submitError || tokenError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 6) {
      setSubmitError(t.login.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError(t.login.passwordMismatch);
      return;
    }

    setIsLoading(true);
    setSubmitError('');

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setSubmitError(resetError.message ?? t.login.resetFailed);
        return;
      }

      const { data: session } = await authClient.getSession();
      if (session?.user?.emailVerified) {
        await hydrateSession();
        toast.success(t.login.resetSuccess);
        router.replace('/');
        return;
      }

      toast.success(t.login.resetVerifyRequired);
      router.replace('/?verifyAfterReset=1');
    } catch {
      setSubmitError(t.login.resetFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.login.resetPasswordTitle}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.login.resetPasswordSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t.login.newPassword}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.login.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={isLoading || !token}>
            {isLoading ? t.login.resettingPassword : t.login.resetPasswordAction}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => router.replace('/')}
          className="text-sm text-[oklch(0.55_0.18_250)] hover:underline"
        >
          {t.login.backToSignIn}
        </button>
      </div>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
