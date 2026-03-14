'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Registration failed');
    } else {
      router.push('/sign-in?registered=1');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-intent-primary/10 text-intent-primary">
            <Plane className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-content-primary">Arsenal Analytics</h1>
            <p className="text-sm text-content-muted">Create your shop account</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Shop registration</CardTitle>
            <CardDescription className="text-xs">
              You&apos;ll be the account owner and can invite your team after sign-up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Shop / MRO Name</Label>
                <Input
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="mt-1.5 h-9"
                  placeholder="e.g. Apex Aviation Services"
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Your Full Name</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1.5 h-9"
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Work Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1.5 h-9"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="mt-1.5 h-9"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-content-muted">Minimum 8 characters</p>
              </div>
              <div>
                <Label className="text-xs">Confirm password</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="mt-1.5 h-9"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              {error && <p className="text-xs text-intent-danger">{error}</p>}
              <Button
                type="submit"
                className="w-full h-9 gap-2 mt-1"
                disabled={loading || !shopName.trim() || !name.trim() || !email.trim() || !password}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-content-muted">
          Already have an account?{' '}
          <a href="/sign-in" className="text-intent-primary hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
