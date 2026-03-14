'use client';
import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/rbac';

type InviteDetails = {
  email: string;
  role: string;
  orgName: string;
  expiresAt: string;
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['invite', token],
    queryFn: async () => {
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Invalid invite');
      return res.json() as Promise<{ data: InviteDetails }>;
    },
  });

  const { mutateAsync: accept, isPending, error: acceptError } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to accept invite');
      return res.json();
    },
    onSuccess: () => {
      setAccepted(true);
      setTimeout(() => router.push('/sign-in'), 2500);
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-intent-warning mb-2" />
            <CardTitle>Invalid or Expired Invite</CardTitle>
            <CardDescription>{(error as Error)?.message ?? 'This invite link is no longer valid.'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => router.push('/sign-in')}>Go to Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inv = data.data;

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-intent-success mb-2" />
            <CardTitle>Account Created!</CardTitle>
            <CardDescription>
              Welcome to {inv.orgName}. Redirecting you to sign in…
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-2xl font-bold mb-1">✈ Arsenal Analytics</div>
          <CardTitle className="mt-4">Accept Your Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join <strong>{inv.orgName}</strong> as a{' '}
            <strong>{ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS] ?? inv.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={inv.email} disabled className="mt-1.5 h-8 text-sm font-mono text-content-muted" />
          </div>
          <div>
            <Label htmlFor="invite-name" className="text-xs">Your Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="First Last"
              className="mt-1.5 h-8 text-sm"
              autoFocus
            />
          </div>

          {acceptError && (
            <p className="text-xs text-intent-danger">{(acceptError as Error).message}</p>
          )}

          <Button
            className="w-full"
            onClick={() => accept()}
            disabled={isPending || !name.trim()}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept &amp; Create Account
          </Button>

          <p className="text-center text-xs text-content-muted">
            Already have an account?{' '}
            <a href="/sign-in" className="text-intent-primary hover:underline">Sign in</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
