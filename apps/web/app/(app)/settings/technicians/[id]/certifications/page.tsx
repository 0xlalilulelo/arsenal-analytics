'use client';
import { useState, use } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type CertStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

interface TechCert {
  id: string;
  certificationId: string;
  issuedAt: string;
  expiresAt: string | null;
  certificateUrl: string | null;
  status: CertStatus;
  certification: { code: string; name: string; requiresRenewal: boolean; renewalIntervalMonths: number | null };
}

interface Cert { id: string; code: string; name: string; }

const STATUS_VARIANT: Record<CertStatus, 'complete' | 'overdue' | 'open'> = {
  ACTIVE:  'complete',
  EXPIRED: 'overdue',
  REVOKED: 'open',
};

function useTechCerts(techId: string) {
  return useQuery({
    queryKey: ['tech-certs', techId],
    queryFn: async () => {
      const res = await fetch(`/api/technicians/${techId}/certifications`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<{ data: TechCert[] }>;
    },
  });
}

function useCatalog() {
  return useQuery({
    queryKey: ['certifications'],
    queryFn: async () => {
      const res = await fetch('/api/certifications');
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<{ data: Cert[] }>;
    },
  });
}

function useTechnician(id: string) {
  return useQuery({
    queryKey: ['technician', id],
    queryFn: async () => {
      const res = await fetch(`/api/technicians/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json() as Promise<{ data: { id: string; name: string } }>;
    },
  });
}

function AddCertDialog({ open, onClose, techId, catalog }: { open: boolean; onClose: () => void; techId: string; catalog: Cert[] }) {
  const qc = useQueryClient();
  const [certificationId, setCertificationId] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/technicians/${techId}/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId,
          issuedAt,
          expiresAt: expiresAt || undefined,
          certificateUrl: certificateUrl.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tech-certs', techId] });
      setCertificationId(''); setIssuedAt(''); setExpiresAt(''); setCertificateUrl('');
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Certification *</Label>
            <Select value={certificationId} onValueChange={setCertificationId}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {catalog.map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-mono">{c.code} — {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Issued On *</Label>
            <Input type="date" value={issuedAt} onChange={e => setIssuedAt(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Expires On (if applicable)</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Certificate URL (scan / blob link)</Label>
            <Input value={certificateUrl} onChange={e => setCertificateUrl(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="https://…" />
          </div>
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => mutateAsync()} disabled={isPending || !certificationId || !issuedAt}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TechCertificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: techData } = useTechnician(id);
  const { data: certsData, isLoading } = useTechCerts(id);
  const { data: catalogData } = useCatalog();

  const tech = techData?.data;
  const certs = certsData?.data ?? [];
  const catalog = catalogData?.data ?? [];

  const { mutateAsync: revoke } = useMutation({
    mutationFn: async (tcId: string) => {
      const res = await fetch(`/api/technicians/${id}/certifications/${tcId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVOKED' }),
      });
      if (!res.ok) throw new Error('Failed to revoke');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tech-certs', id] }),
  });

  const now = Date.now();

  function expiryWarning(expiresAt: string | null): null | 'warn' | 'expired' {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime();
    if (ms <= now) return 'expired';
    const days = Math.floor((ms - now) / 86400000);
    return days <= 30 ? 'warn' : null;
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={tech ? `${tech.name} — Certifications` : 'Certifications'}
        subtitle="Active certs with expiry dates and certificate uploads"
        actions={
          <div className="flex gap-2">
            <Link href="/settings/technicians">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />Back
              </Button>
            </Link>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />Add
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
        ) : certs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-content-muted">
              No certifications on file. Add one to enable task-level gating.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-surface-hover">
                  <tr className="text-left text-content-muted">
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Issued</th>
                    <th className="px-3 py-2 font-medium">Expires</th>
                    <th className="px-3 py-2 font-medium">Cert</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map(tc => {
                    const warn = expiryWarning(tc.expiresAt);
                    return (
                      <tr key={tc.id} className="border-b border-surface-hover/40 hover:bg-surface-hover/30">
                        <td className="px-3 py-2 font-mono font-semibold">{tc.certification.code}</td>
                        <td className="px-3 py-2">{tc.certification.name}</td>
                        <td className="px-3 py-2">
                          <Badge variant={STATUS_VARIANT[tc.status]} className="text-[10px]">{tc.status}</Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-content-muted">{formatDate(tc.issuedAt)}</td>
                        <td className={`px-3 py-2 font-mono ${warn === 'expired' ? 'text-intent-danger' : warn === 'warn' ? 'text-intent-warning' : 'text-content-muted'}`}>
                          {tc.expiresAt ? (
                            <span className="flex items-center gap-1">
                              {warn && <AlertTriangle className="h-3 w-3" />}
                              {formatDate(tc.expiresAt)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {tc.certificateUrl ? (
                            <a href={tc.certificateUrl} target="_blank" rel="noreferrer" className="text-intent-primary hover:underline inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" />View
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {tc.status === 'ACTIVE' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-content-muted hover:text-intent-danger" onClick={() => revoke(tc.id)} title="Revoke">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <AddCertDialog open={addOpen} onClose={() => setAddOpen(false)} techId={id} catalog={catalog} />
    </div>
  );
}
