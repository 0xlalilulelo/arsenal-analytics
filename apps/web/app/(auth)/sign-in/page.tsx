'use client';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, Loader2 } from 'lucide-react';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const registered = searchParams.get('registered');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {registered && (
        <p className="text-xs text-intent-success bg-intent-success/10 border border-intent-success/20 rounded-md px-3 py-2">
          Account created! Sign in below.
        </p>
      )}
      <div>
        <Label htmlFor="email" className="text-xs">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="mt-1.5 h-9"
          autoComplete="email"
          required
          autoFocus
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs">Password</Label>
          <a href="/forgot-password" className="text-xs text-intent-primary hover:underline">
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="mt-1.5 h-9"
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="text-xs text-intent-danger">{error}</p>}
      <Button type="submit" className="w-full h-9 gap-2" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-intent-primary/10 text-intent-primary">
            <Plane className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-content-primary">Arsenal Analytics</h1>
            <p className="text-sm text-content-muted">Aviation MRO Financial Platform</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-content-muted mx-auto" />}>
              <SignInForm />
            </Suspense>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-content-muted">
          New shop?{' '}
          <a href="/sign-up" className="text-intent-primary hover:underline">Create an account</a>
        </p>
      </div>
    </div>
  );
}
