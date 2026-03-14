'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <AlertTriangle className="h-10 w-10 text-intent-warning" />
        <p className="text-sm text-content-secondary">Invalid or missing reset token.</p>
        <a href="/forgot-password" className="text-xs text-intent-primary hover:underline">Request a new link</a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Reset failed'); return; }
      setDone(true);
      setTimeout(() => router.push('/sign-in'), 2500);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-intent-success" />
        <p className="text-sm text-content-secondary">Password updated! Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password" className="text-xs">New password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="mt-1.5 h-9"
          minLength={8}
          required
          autoFocus
        />
      </div>
      <div>
        <Label htmlFor="confirm" className="text-xs">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="mt-1.5 h-9"
          minLength={8}
          required
        />
      </div>
      {error && <p className="text-xs text-intent-danger">{error}</p>}
      <Button type="submit" className="w-full h-9 gap-2" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Set new password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-intent-primary/10 text-intent-primary">
            <Plane className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-content-primary">Set new password</h1>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Choose a new password</CardTitle>
            <CardDescription className="text-xs">Must be at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-content-muted mx-auto" />}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
