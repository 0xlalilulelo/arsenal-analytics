'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2, Loader2, Award } from 'lucide-react';

const WO_TYPES = ['SCHEDULED', 'AOG', 'INSPECTION', 'UNSCHEDULED'] as const;
type WOType = typeof WO_TYPES[number];

interface Cert {
  id: string;
  code: string;
  name: string;
  issuingAuthority: string | null;
  requiresRenewal: boolean;
  renewalIntervalMonths: number | null;
  _count: { technicianCerts: number; taskRequirements: number };
}

interface TaskReq {
  id: string;
  workOrderType: WOType | null;
  taskPattern: string | null;
  required: boolean;
  certification: { id: string; code: string; name: string };
}

function useCerts() {
  return useQuery({
    queryKey: ['certifications'],
    queryFn: async () => {
      const res = await fetch('/api/certifications');
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<{ data: Cert[] }>;
    },
  });
}

function useTaskReqs() {
  return useQuery({
    queryKey: ['task-cert-requirements'],
    queryFn: async () => {
      const res = await fetch('/api/task-cert-requirements');
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<{ data: TaskReq[] }>;
    },
  });
}

function AddCertDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: '', name: '', issuingAuthority: '', requiresRenewal: false, renewalIntervalMonths: '12',
  });
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:                  form.code.trim(),
          name:                  form.name.trim(),
          issuingAuthority:      form.issuingAuthority.trim() || undefined,
          requiresRenewal:       form.requiresRenewal,
          renewalIntervalMonths: form.requiresRenewal ? parseInt(form.renewalIntervalMonths) || null : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certifications'] });
      setForm({ code: '', name: '', issuingAuthority: '', requiresRenewal: false, renewalIntervalMonths: '12' });
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div>
            <Label className="text-xs">Code *</Label>
            <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="mt-1.5 h-8 text-sm font-mono" placeholder="A&P" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Issuing Authority</Label>
            <Input value={form.issuingAuthority} onChange={e => setForm(p => ({ ...p, issuingAuthority: e.target.value }))} className="mt-1.5 h-8 text-sm" placeholder="FAA" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1.5 h-8 text-sm" placeholder="Airframe & Powerplant Mechanic" />
          </div>
          <div className="col-span-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requiresRenewal} onChange={e => setForm(p => ({ ...p, requiresRenewal: e.target.checked }))} />
              <span className="text-xs">Requires periodic renewal</span>
            </label>
          </div>
          {form.requiresRenewal && (
            <div>
              <Label className="text-xs">Renewal Interval (months)</Label>
              <Input type="number" min="1" value={form.renewalIntervalMonths} onChange={e => setForm(p => ({ ...p, renewalIntervalMonths: e.target.value }))} className="mt-1.5 h-8 text-sm font-mono" />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => mutateAsync()} disabled={isPending || !form.code.trim() || !form.name.trim()}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRequirementDialog({ open, onClose, certs }: { open: boolean; onClose: () => void; certs: Cert[] }) {
  const qc = useQueryClient();
  const [certId, setCertId] = useState('');
  const [woType, setWoType] = useState<WOType | ''>('');
  const [taskPattern, setTaskPattern] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/task-cert-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId: certId,
          workOrderType:   woType || undefined,
          taskPattern:     taskPattern.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-cert-requirements'] });
      setCertId(''); setWoType(''); setTaskPattern('');
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Task Requirement</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Certification *</Label>
            <Select value={certId} onValueChange={setCertId}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {certs.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.code} — {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Work Order Type (optional)</Label>
            <Select value={woType} onValueChange={(v: string) => setWoType(v as WOType | '')}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="Any WO type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">Any</SelectItem>
                {WO_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Task Pattern (optional — substring match on task description)</Label>
            <Input value={taskPattern} onChange={e => setTaskPattern(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" placeholder="e.g. engine run-up" />
          </div>
          <p className="text-xs text-content-muted">At least one of WO Type or Task Pattern is required.</p>
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => mutateAsync()} disabled={isPending || !certId || (!woType && !taskPattern.trim())}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CertificationsPage() {
  const qc = useQueryClient();
  const [addCertOpen, setAddCertOpen] = useState(false);
  const [addReqOpen, setAddReqOpen] = useState(false);
  const [deleteCertId, setDeleteCertId] = useState<string | null>(null);
  const [deleteReqId, setDeleteReqId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data: certsData, isLoading: certsLoading } = useCerts();
  const { data: reqsData, isLoading: reqsLoading } = useTaskReqs();
  const certs = certsData?.data ?? [];
  const reqs = reqsData?.data ?? [];

  const { mutateAsync: deleteCert, isPending: deletingCert } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/certifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to delete');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certifications'] });
      setDeleteCertId(null);
      setDeleteError('');
    },
    onError: (e) => setDeleteError((e as Error).message),
  });

  const { mutateAsync: deleteReq } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/task-cert-requirements/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-cert-requirements'] });
      setDeleteReqId(null);
    },
  });

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Certifications"
        subtitle="Catalog · Task requirements · Technician tracking"
        actions={
          <Link href="/settings">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />Back
            </Button>
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="catalog">
          <TabsList>
            <TabsTrigger value="catalog" className="text-xs">Certification Catalog</TabsTrigger>
            <TabsTrigger value="requirements" className="text-xs">Task Requirements</TabsTrigger>
          </TabsList>

          {/* ── Catalog tab ─────────────────────────────────────────────────── */}
          <TabsContent value="catalog" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-content-muted">
                Define the certifications your org tracks. These are referenced when assigning technicians to tasks.
              </p>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddCertOpen(true)}>
                <Plus className="h-3.5 w-3.5" />Add Certification
              </Button>
            </div>
            {certsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
            ) : certs.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Award className="h-8 w-8 mx-auto text-content-muted mb-2" />
                  <p className="text-sm text-content-muted">No certifications defined. Add one to get started.</p>
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
                        <th className="px-3 py-2 font-medium">Authority</th>
                        <th className="px-3 py-2 font-medium">Renewal</th>
                        <th className="px-3 py-2 font-medium text-right">Techs</th>
                        <th className="px-3 py-2 font-medium text-right">Req rules</th>
                        <th className="px-3 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {certs.map(cert => (
                        <tr key={cert.id} className="border-b border-surface-hover/40 hover:bg-surface-hover/30">
                          <td className="px-3 py-2 font-mono font-semibold">{cert.code}</td>
                          <td className="px-3 py-2">{cert.name}</td>
                          <td className="px-3 py-2 text-content-muted">{cert.issuingAuthority ?? '—'}</td>
                          <td className="px-3 py-2">
                            {cert.requiresRenewal
                              ? <Badge variant="in-progress" className="text-[10px]">Every {cert.renewalIntervalMonths}mo</Badge>
                              : <span className="text-content-muted">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{cert._count.technicianCerts}</td>
                          <td className="px-3 py-2 text-right font-mono">{cert._count.taskRequirements}</td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDeleteError(''); setDeleteCertId(cert.id); }}>
                              <Trash2 className="h-3.5 w-3.5 text-content-muted" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Requirements tab ────────────────────────────────────────────── */}
          <TabsContent value="requirements" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-content-muted">
                Define which certifications are required to be assigned to a task. Matched by WO type or task-description substring.
              </p>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddReqOpen(true)}>
                <Plus className="h-3.5 w-3.5" />Add Requirement
              </Button>
            </div>
            {reqsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
            ) : reqs.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-xs text-content-muted">
                  No task requirements defined.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-surface-hover">
                      <tr className="text-left text-content-muted">
                        <th className="px-3 py-2 font-medium">Certification</th>
                        <th className="px-3 py-2 font-medium">WO Type</th>
                        <th className="px-3 py-2 font-medium">Task Pattern</th>
                        <th className="px-3 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reqs.map(req => (
                        <tr key={req.id} className="border-b border-surface-hover/40 hover:bg-surface-hover/30">
                          <td className="px-3 py-2 font-mono font-semibold">{req.certification.code}</td>
                          <td className="px-3 py-2">
                            {req.workOrderType
                              ? <Badge variant="default" className="text-[10px]">{req.workOrderType}</Badge>
                              : <span className="text-content-muted">Any</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-content-muted">{req.taskPattern ?? '—'}</td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteReqId(req.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-content-muted" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddCertDialog open={addCertOpen} onClose={() => setAddCertOpen(false)} />
      <AddRequirementDialog open={addReqOpen} onClose={() => setAddReqOpen(false)} certs={certs} />

      {/* Delete cert confirm */}
      <AlertDialog open={!!deleteCertId} onOpenChange={(v: boolean) => { if (!v) { setDeleteCertId(null); setDeleteError(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete certification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the certification from the catalog.
              This will fail if any technicians hold it or tasks reference it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-xs text-intent-danger">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCert}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); deleteCert(deleteCertId!); }}
              disabled={deletingCert}
              className="bg-intent-danger text-white hover:bg-intent-danger/90"
            >
              {deletingCert && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete requirement confirm */}
      <AlertDialog open={!!deleteReqId} onOpenChange={(v: boolean) => { if (!v) setDeleteReqId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this requirement?</AlertDialogTitle>
            <AlertDialogDescription>Tasks matching this rule will no longer require the certification at assignment time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); deleteReq(deleteReqId!); }} className="bg-intent-danger text-white hover:bg-intent-danger/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
