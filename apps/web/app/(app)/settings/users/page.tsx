'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users, UserPlus, Mail, Clock, ShieldCheck, Loader2, Trash2, CheckCircle2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, UserRole } from '@/lib/rbac';

type OrgUser = {
  id: string; name: string | null; email: string; role: string; createdAt: string;
  technicianProfile: { id: string; certifications: string[] } | null;
};
type PendingInvite = { id: string; email: string; role: string; createdAt: string; expiresAt: string };

const ROLE_BADGE_VARIANT: Record<string, string> = {
  OWNER: 'bg-intent-gold/20 text-intent-gold border-intent-gold/30',
  MANAGER: 'bg-intent-primary/20 text-intent-primary border-intent-primary/30',
  ACCOUNTANT: 'bg-intent-success/20 text-intent-success border-intent-success/30',
  PARTS_CLERK: 'bg-intent-warning/20 text-intent-warning border-intent-warning/30',
  TECHNICIAN: 'bg-surface-hover text-content-secondary border-surface-hover',
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_BADGE_VARIANT[role] ?? ROLE_BADGE_VARIANT.TECHNICIAN;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {ROLE_LABELS[role as UserRole] ?? role}
    </span>
  );
}

function InviteDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('TECHNICIAN');
  const [done, setDone] = useState(false);

  const { mutateAsync: invite, isPending, error } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to send invite');
      return res.json();
    },
    onSuccess: () => {
      setDone(true);
      onSuccess();
      setTimeout(() => { setOpen(false); setDone(false); setEmail(''); setRole('TECHNICIAN'); }, 1500);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle2 className="h-10 w-10 text-intent-success" />
            <p className="text-sm text-content-secondary">Invite sent to {email}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="invite-email" className="text-xs">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tech@example.com"
                className="mt-1.5 h-8 text-sm"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1.5 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).filter(r => r !== 'OWNER').map(r => (
                    <SelectItem key={r} value={r}>
                      <span className="font-medium">{ROLE_LABELS[r]}</span>
                      <span className="text-content-muted ml-2 text-xs">{ROLE_DESCRIPTIONS[r]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-content-muted">{ROLE_DESCRIPTIONS[role as UserRole]}</p>
            </div>

            {error && <p className="text-xs text-intent-danger">{(error as Error).message}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => invite()} disabled={isPending || !email.trim()}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Mail className="h-3.5 w-3.5" /> Send Invite
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UsersSettingsPage() {
  const qc = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<OrgUser | null>(null);
  const [savingRoleFor, setSavingRoleFor] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users-settings'],
    queryFn: () => fetch('/api/users').then(r => r.json()) as Promise<{
      data: { users: OrgUser[]; invites: PendingInvite[] };
    }>,
  });

  const { mutateAsync: changeRole } = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      setSavingRoleFor(id);
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSettled: () => {
      setSavingRoleFor(null);
      void qc.invalidateQueries({ queryKey: ['users-settings'] });
    },
  });

  const { mutateAsync: removeUser, isPending: removing } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      setRemoveTarget(null);
      qc.invalidateQueries({ queryKey: ['users-settings'] });
    },
  });

  const users = data?.data?.users ?? [];
  const invites = data?.data?.invites ?? [];

  return (
    <div className="flex flex-col h-full">
      <Topbar title="User Management" subtitle="Invite team members and manage their roles" />

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-6">
        {/* Active Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-content-muted" />
                <CardTitle className="text-sm">Team Members</CardTitle>
                <span className="text-xs text-content-muted">({users.length})</span>
              </div>
              <InviteDialog onSuccess={() => qc.invalidateQueries({ queryKey: ['users-settings'] })} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center py-10 text-sm text-content-muted">No users yet.</p>
            ) : (
              <div className="divide-y divide-surface-hover">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-6 py-3 hover:bg-surface-hover/30 transition-colors">
                    {/* Avatar */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-card text-xs font-bold text-content-primary border border-surface-hover">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-content-primary truncate">{u.name ?? '—'}</p>
                      <p className="text-xs text-content-muted truncate">{u.email}</p>
                      {u.technicianProfile?.certifications?.length ? (
                        <p className="text-xs text-content-muted">{u.technicianProfile.certifications.join(', ')}</p>
                      ) : null}
                    </div>

                    {/* Role selector */}
                    <div className="flex items-center gap-2">
                      {u.role === 'OWNER' ? (
                        <RoleBadge role="OWNER" />
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(role: string) => changeRole({ id: u.id, role })}
                          disabled={savingRoleFor === u.id}
                        >
                          <SelectTrigger className="h-7 text-xs w-36 border-surface-hover">
                            {savingRoleFor === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ROLE_LABELS) as UserRole[]).filter(r => r !== 'OWNER').map(r => (
                              <SelectItem key={r} value={r} className="text-xs">
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {u.role !== 'OWNER' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-content-muted hover:text-intent-danger"
                          onClick={() => setRemoveTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-content-muted" />
                <CardTitle className="text-sm">Pending Invitations</CardTitle>
                <span className="text-xs text-content-muted">({invites.length})</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-surface-hover">
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-4 px-6 py-3">
                    <Mail className="h-4 w-4 text-content-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content-primary truncate">{inv.email}</p>
                      <p className="text-xs text-content-muted">
                        Expires {formatDate(inv.expiresAt)}
                      </p>
                    </div>
                    <RoleBadge role={inv.role} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Reference */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-content-muted" />
              <CardTitle className="text-sm">Role Permissions Reference</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-surface-hover">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
                <div key={role} className="flex items-start gap-4 px-6 py-3">
                  <div className="w-28 shrink-0 pt-0.5">
                    <RoleBadge role={role} />
                  </div>
                  <p className="text-xs text-content-muted">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(v: boolean) => { if (!v) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name ?? removeTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{removeTarget?.email}</strong> from the organization.
              Their work orders and labor entries will remain. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-danger hover:bg-intent-danger/90"
              onClick={() => removeTarget && removeUser(removeTarget.id)}
              disabled={removing}
            >
              {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
