'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane } from 'lucide-react';

export default function SignUpPage() {
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, email, password }),
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
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-intent-primary/10 text-intent-primary">
            <Plane className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-content-primary">Create your shop account</h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Shop registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs">Shop Name</Label>
                <Input value={shopName} onChange={e => setShopName(e.target.value)} className="mt-1.5 h-9" placeholder="e.g. Apex Aviation Services" required />
              </div>
              <div>
                <Label className="text-xs">Your Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 h-9" required />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 h-9" minLength={8} required />
              </div>
              {error && <p className="text-xs text-intent-danger">{error}</p>}
              <Button type="submit" className="w-full h-9" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
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
