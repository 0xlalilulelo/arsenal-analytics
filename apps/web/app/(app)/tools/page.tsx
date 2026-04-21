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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Wrench, Loader2, AlertTriangle, CalendarClock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

type ToolStatus = 'AVAILABLE' | 'CHECKED_OUT' | 'CALIBRATION_DUE' | 'OUT_OF_SERVICE' | 'LOST';
type ToolOwnership = 'COMPANY' | 'EMPLOYEE';

interface ToolRow {
  id: string;
  assetTag: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  ownership: ToolOwnership;
  status: ToolStatus;
  calibrationRequired: boolean;
  calibrationIntervalMonths: number | null;
  lastCalibratedAt: string | null;
  nextCalibrationDue: string | null;
  bin: string | null;
  ownerTechnician: { id: string; name: string } | null;
  checkouts: Array<{
    id: string;
    checkedOutAt: string;
    dueBackAt: string | null;
    technician: { id: string; name: string };
    workOrder: { id: string; number: string } | null;
  }>;
}

const STATUS_VARIANT: Record<ToolStatus, 'complete' | 'in-progress' | 'awaiting-parts' | 'open' | 'overdue'> = {
  AVAILABLE:       'complete',
  CHECKED_OUT:     'in-progress',
  CALIBRATION_DUE: 'overdue',
  OUT_OF_SERVICE:  'open',
  LOST:            'open',
};

function useTools(params: { status?: string; dueWithinDays?: number; q?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.dueWithinDays != null) qs.set('dueWithinDays', String(params.dueWithinDays));
  if (params.q) qs.set('q', params.q);
  return useQuery({
    queryKey: ['tools', params],
    queryFn: async () => {
      const res = await fetch(`/api/tools?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to load tools');
      return res.json() as Promise<{ data: ToolRow[] }>;
    },
  });
}

function AddToolDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    assetTag: '', name: '', manufacturer: '', modelNumber: '', serialNumber: '',
    ownership: 'COMPANY' as ToolOwnership,
    calibrationRequired: false,
    calibrationIntervalMonths: '12',
    lastCalibratedAt: '',
    bin: '', notes: '',
  });
  const [error, setError] = useState('');

  const { mutateAsync: create, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetTag:                  form.assetTag.trim().toUpperCase(),
          name:                      form.name.trim(),
          manufacturer:              form.manufacturer.trim() || undefined,
          modelNumber:               form.modelNumber.trim() || undefined,
          serialNumber:              form.serialNumber.trim() || undefined,
          ownership:                 form.ownership,
          calibrationRequired:       form.calibrationRequired,
          calibrationIntervalMonths: form.calibrationRequired && form.calibrationIntervalMonths
            ? parseInt(form.calibrationIntervalMonths)
            : undefined,
          lastCalibratedAt: form.calibrationRequired && form.lastCalibratedAt
            ? form.lastCalibratedAt
            : undefined,
          bin:   form.bin.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to add tool');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
      setForm({
        assetTag: '', name: '', manufacturer: '', modelNumber: '', serialNumber: '',
        ownership: 'COMPANY', calibrationRequired: false,
        calibrationIntervalMonths: '12', lastCalibratedAt: '', bin: '', notes: '',
      });
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Tool</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div>
            <Label className="text-xs">Asset Tag *</Label>
            <Input value={form.assetTag} onChange={set('assetTag')} className="mt-1.5 h-8 text-sm font-mono" placeholder="TRQ-001" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Ownership</Label>
            <Select value={form.ownership} onValueChange={(v: string) => setForm(p => ({ ...p, ownership: v as ToolOwnership }))}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY" className="text-xs">Company</SelectItem>
                <SelectItem value="EMPLOYEE" className="text-xs">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={set('name')} className="mt-1.5 h-8 text-sm" placeholder="Torque wrench, 10–150 ft-lb" />
          </div>
          <div>
            <Label className="text-xs">Manufacturer</Label>
            <Input value={form.manufacturer} onChange={set('manufacturer')} className="mt-1.5 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Model #</Label>
            <Input value={form.modelNumber} onChange={set('modelNumber')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Serial #</Label>
            <Input value={form.serialNumber} onChange={set('serialNumber')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Bin / Location</Label>
            <Input value={form.bin} onChange={set('bin')} className="mt-1.5 h-8 text-sm font-mono" placeholder="Crib A-4" />
          </div>
          <div className="col-span-2 border-t border-surface-hover pt-3 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.calibrationRequired}
                onChange={e => setForm(p => ({ ...p, calibrationRequired: e.target.checked }))}
              />
              <span className="text-xs">Requires periodic calibration</span>
            </label>
          </div>
          {form.calibrationRequired && (
            <>
              <div>
                <Label className="text-xs">Interval (months)</Label>
                <Input type="number" min="1" value={form.calibrationIntervalMonths} onChange={set('calibrationIntervalMonths')} className="mt-1.5 h-8 text-sm font-mono" />
              </div>
              <div>
                <Label className="text-xs">Last Calibrated</Label>
                <Input type="date" value={form.lastCalibratedAt} onChange={set('lastCalibratedAt')} className="mt-1.5 h-8 text-sm font-mono" />
              </div>
            </>
          )}
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={set('notes')} className="mt-1.5 h-8 text-sm" />
          </div>
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => create()}
            disabled={isPending || !form.assetTag.trim() || !form.name.trim()}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Tool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function calibrationCell(tool: ToolRow): { label: string; cls: string } {
  if (!tool.calibrationRequired) return { label: '—', cls: 'text-content-muted' };
  if (!tool.nextCalibrationDue) return { label: 'Never calibrated', cls: 'text-intent-warning' };
  const dueMs = new Date(tool.nextCalibrationDue).getTime();
  const nowMs = Date.now();
  const days = Math.floor((dueMs - nowMs) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: 'text-intent-danger' };
  if (days <= 14) return { label: `${days}d`, cls: 'text-intent-warning' };
  return { label: formatDate(tool.nextCalibrationDue), cls: 'text-content-muted' };
}

export default function ToolsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  const [showDueSoon, setShowDueSoon] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTools({
    status: statusFilter === '_all' ? undefined : statusFilter,
    dueWithinDays: showDueSoon ? 30 : undefined,
    q: search || undefined,
  });
  const tools = data?.data ?? [];

  const dueCount = tools.filter(t => {
    if (!t.calibrationRequired || !t.nextCalibrationDue) return false;
    const diff = new Date(t.nextCalibrationDue).getTime() - Date.now();
    return diff <= 14 * 86400000;
  }).length;
  const checkedOutCount = tools.filter(t => t.status === 'CHECKED_OUT').length;
  const availableCount = tools.filter(t => t.status === 'AVAILABLE').length;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Tool Crib"
        subtitle="Calibrated tools · Checkouts · Certifications"
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Add Tool
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Total Tools</p>
              <p className="font-mono text-2xl font-bold text-content-primary mt-1">{tools.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Available</p>
              <p className="font-mono text-2xl font-bold text-intent-success mt-1">{availableCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Checked Out</p>
              <p className="font-mono text-2xl font-bold text-intent-primary mt-1">{checkedOutCount}</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer ${dueCount > 0 ? 'border-intent-warning/40 hover:bg-intent-warning/5' : ''}`}
            onClick={() => dueCount > 0 && setShowDueSoon(s => !s)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-content-muted">Calibration Due ≤ 14d</p>
                {dueCount > 0 && <AlertTriangle className="h-3.5 w-3.5 text-intent-warning" />}
              </div>
              <p className={`font-mono text-2xl font-bold mt-1 ${dueCount > 0 ? 'text-intent-warning' : 'text-intent-success'}`}>
                {dueCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="AVAILABLE" className="text-xs">Available</SelectItem>
              <SelectItem value="CHECKED_OUT" className="text-xs">Checked out</SelectItem>
              <SelectItem value="CALIBRATION_DUE" className="text-xs">Calibration due</SelectItem>
              <SelectItem value="OUT_OF_SERVICE" className="text-xs">Out of service</SelectItem>
              <SelectItem value="LOST" className="text-xs">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showDueSoon ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowDueSoon(s => !s)}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {showDueSoon ? 'All tools' : 'Due ≤ 30 days'}
          </Button>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
            <Input
              placeholder="Search asset tag / name / serial..."
              className="pl-8 h-8 text-sm w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
        ) : tools.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Wrench className="h-8 w-8 mx-auto text-content-muted mb-2" />
              <p className="text-sm text-content-muted">No tools match these filters.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-surface-hover">
                  <tr className="text-left text-content-muted">
                    <th className="px-3 py-2 font-medium">Asset Tag</th>
                    <th className="px-3 py-2 font-medium">Name / Model</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Checked Out To</th>
                    <th className="px-3 py-2 font-medium">Next Calibration</th>
                    <th className="px-3 py-2 font-medium">Bin</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map(tool => {
                    const cal = calibrationCell(tool);
                    const activeCheckout = tool.checkouts[0];
                    return (
                      <tr key={tool.id} className="border-b border-surface-hover/40 hover:bg-surface-hover/30">
                        <td className="px-3 py-2 font-mono">
                          <Link href={`/tools/${tool.id}`} className="text-intent-primary hover:underline font-semibold">
                            {tool.assetTag}
                          </Link>
                          {tool.ownership === 'EMPLOYEE' && (
                            <div className="text-content-muted text-[10px]">Employee-owned</div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div>{tool.name}</div>
                          <div className="text-content-muted font-mono">
                            {[tool.manufacturer, tool.modelNumber].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={STATUS_VARIANT[tool.status]} className="text-[10px]">
                            {tool.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {activeCheckout ? (
                            <>
                              <div>{activeCheckout.technician.name}</div>
                              {activeCheckout.workOrder && (
                                <Link
                                  href={`/work-orders/${activeCheckout.workOrder.id}`}
                                  className="text-intent-primary hover:underline font-mono"
                                >
                                  WO {activeCheckout.workOrder.number}
                                </Link>
                              )}
                            </>
                          ) : <span className="text-content-muted">—</span>}
                        </td>
                        <td className={`px-3 py-2 font-mono ${cal.cls}`}>{cal.label}</td>
                        <td className="px-3 py-2 font-mono text-content-muted">{tool.bin ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <AddToolDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
