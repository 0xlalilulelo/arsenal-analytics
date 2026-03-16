'use client';
import { useState } from 'react';
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
import { useCustomers } from '@/hooks/useAnalytics';
import { Search, Loader2, Plane, ChevronRight, Plus, Pencil } from 'lucide-react';

type AircraftRow = {
  id: string;
  nNumber: string;
  make: string;
  model: string;
  serial: string;
  year: number | null;
  ttsn: number | null;
  engineTtsn: number | null;
  customer: { id: string; name: string } | null;
  _count: { workOrders: number };
};

function useAircraft(search?: string) {
  return useQuery({
    queryKey: ['aircraft', search],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      const res = await fetch(`/api/aircraft?${p}`);
      if (!res.ok) throw new Error('Failed to load aircraft');
      return res.json();
    },
  });
}

const EMPTY_FORM = {
  nNumber: '', customerId: '', make: '', model: '', serial: '',
  year: '', ttsn: '', engineTtsn: '', propTtsn: '',
};

function AircraftFormDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: AircraftRow | null;
}) {
  const qc = useQueryClient();
  const { data: custData } = useCustomers('');
  const customers: { id: string; name: string }[] = custData?.data ?? [];

  const [form, setForm] = useState(existing ? {
    nNumber: existing.nNumber,
    customerId: existing.customer?.id ?? '',
    make: existing.make,
    model: existing.model,
    serial: existing.serial,
    year: existing.year?.toString() ?? '',
    ttsn: existing.ttsn?.toString() ?? '',
    engineTtsn: existing.engineTtsn?.toString() ?? '',
    propTtsn: '',
  } : EMPTY_FORM);
  const [error, setError] = useState('');

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const url = existing ? `/api/aircraft/${existing.id}` : '/api/aircraft';
      const method = existing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to save aircraft');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aircraft'] });
      setForm(EMPTY_FORM);
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const isEdit = !!existing;
  const canSubmit = form.nNumber.trim() && form.make.trim() && form.model.trim() && form.serial.trim() && (isEdit || form.customerId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${existing?.nNumber}` : 'Add Aircraft'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div>
            <Label className="text-xs">N-Number *</Label>
            <Input value={form.nNumber} onChange={f('nNumber')} className="mt-1.5 h-8 text-sm font-mono uppercase" placeholder="N12345" autoFocus={!isEdit} disabled={isEdit} />
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Input type="number" value={form.year} onChange={f('year')} className="mt-1.5 h-8 text-sm font-mono" placeholder="1978" />
          </div>
          <div>
            <Label className="text-xs">Make *</Label>
            <Input value={form.make} onChange={f('make')} className="mt-1.5 h-8 text-sm" placeholder="Cessna" />
          </div>
          <div>
            <Label className="text-xs">Model *</Label>
            <Input value={form.model} onChange={f('model')} className="mt-1.5 h-8 text-sm" placeholder="172S" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Serial Number *</Label>
            <Input value={form.serial} onChange={f('serial')} className="mt-1.5 h-8 text-sm font-mono" placeholder="17280123" />
          </div>
          {!isEdit && (
            <div className="col-span-2">
              <Label className="text-xs">Owner / Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm(p => ({ ...p, customerId: v }))}>
                <SelectTrigger className="mt-1.5 h-8 text-sm">
                  <SelectValue placeholder="Select customer…" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">TTSN (h)</Label>
            <Input type="number" step="0.1" min="0" value={form.ttsn} onChange={f('ttsn')} className="mt-1.5 h-8 text-sm font-mono" placeholder="3200.0" />
          </div>
          <div>
            <Label className="text-xs">Engine TTSN (h)</Label>
            <Input type="number" step="0.1" min="0" value={form.engineTtsn} onChange={f('engineTtsn')} className="mt-1.5 h-8 text-sm font-mono" placeholder="1450.0" />
          </div>
        </div>
        {error && <p className="text-xs text-intent-danger mt-1">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm" className="h-8 text-xs gap-1.5"
            disabled={!canSubmit || isPending}
            onClick={() => mutateAsync()}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Aircraft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AircraftPage() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editAircraft, setEditAircraft] = useState<AircraftRow | null>(null);
  const { data, isLoading } = useAircraft(search || undefined);
  const aircraft: AircraftRow[] = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Aircraft"
        subtitle="Fleet registry and airframe tracking"
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Add Aircraft
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Aircraft', value: aircraft.length, color: 'text-content-primary' },
            { label: 'Active WOs', value: aircraft.reduce((s, a) => s + (a._count?.workOrders ?? 0), 0), color: 'text-intent-primary' },
            { label: 'With TTSN', value: aircraft.filter(a => a.ttsn != null).length, color: 'text-intent-success' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`font-mono text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
          <Input
            placeholder="Search by N-Number, make, model…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
          </div>
        )}

        {!isLoading && aircraft.length === 0 && (
          <div className="rounded-lg border border-surface-hover p-12 text-center text-sm text-content-muted">
            No aircraft found.
          </div>
        )}

        <div className="rounded-lg border border-surface-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-hover bg-surface-panel">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">N-Number</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Make / Model</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Year</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Serial</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">TTSN</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Eng. TTSN</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Owner</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">WOs</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {aircraft.map((a) => (
                <tr key={a.id} className="hover:bg-surface-hover/30 group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Plane className="h-3.5 w-3.5 text-intent-primary shrink-0" />
                      <span className="font-mono font-bold text-intent-primary text-sm">{a.nNumber}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-content-primary">{a.make}</p>
                    <p className="text-xs text-content-muted">{a.model}</p>
                  </td>
                  <td className="py-3 px-4 text-xs text-content-secondary">{a.year ?? '—'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-content-muted">{a.serial}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-content-primary">
                    {a.ttsn != null ? `${a.ttsn.toLocaleString()}h` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-content-secondary">
                    {a.engineTtsn != null ? `${a.engineTtsn.toLocaleString()}h` : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-content-secondary">
                    {a.customer?.name ?? '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    {a._count?.workOrders > 0
                      ? <span className="text-intent-primary">{a._count.workOrders}</span>
                      : <span className="text-content-muted">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-content-muted hover:text-content-primary"
                        onClick={() => setEditAircraft(a)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/aircraft/${a.id}`} className="flex items-center text-xs text-content-muted hover:text-content-primary">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AircraftFormDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <AircraftFormDialog open={!!editAircraft} onClose={() => setEditAircraft(null)} existing={editAircraft} />
    </div>
  );
}
