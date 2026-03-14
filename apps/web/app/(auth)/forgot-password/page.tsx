'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-intent-primary/10 text-intent-primary">
            <Plane className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-content-primary">Reset your password</h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Forgot password</CardTitle>
            <CardDescription className="text-xs">
              Enter your email and we&apos;ll send a reset link if an account exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-intent-success" />
                <p className="text-sm text-content-secondary">
                  If <strong>{email}</strong> is registered, a reset link is on its way.
                </p>
                <a href="/sign-in" className="text-xs text-intent-primary hover:underline mt-2">
                  Back to sign in
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-xs">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1.5 h-9"
                    placeholder="you@shop.com"
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-xs text-intent-danger">{error}</p>}
                <Button type="submit" className="w-full h-9 gap-2" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-content-muted">
          <a href="/sign-in" className="text-intent-primary hover:underline">Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
