'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ChevronLeft, Plane, Wrench, CheckCircle2, Clock,
  AlertTriangle, Loader2, Edit2,
} from 'lucide-react';

const STATUS_VARIANT: Record<string, any> = {
  OPEN: 'open', IN_PROGRESS: 'in-progress', AWAITING_PARTS: 'awaiting-parts',
  AWAITING_APPROVAL: 'awaiting-approval', COMPLETE: 'complete', INVOICED: 'invoiced', CLOSED: 'closed',
};

type Aircraft = {
  id: string;
  nNumber: string;
  make: string;
  model: string;
  serial: string;
  year: number | null;
  ttsn: number | null;
  engineTtsn: number | null;
  propTtsn: number | null;
  customer: { id: string; name: string; accountNumber: string | null };
  workOrders: {
    id: string; number: string; status: string; type: string;
    description: string; estimatedTotal: number | null; createdAt: string; closedAt: string | null;
    complianceItems: { id: string; type: string; referenceId: string; completedAt: string | null }[];
  }[];
};

function useAircraftDetail(id: string) {
  return useQuery({
    queryKey: ['aircraft', id],
    queryFn: async () => {
      const res = await fetch(`/api/aircraft/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json() as Promise<{ data: Aircraft }>;
    },
  });
}

export default function AircraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const [editTtsn, setEditTtsn] = useState('');
  const [editEngTtsn, setEditEngTtsn] = useState('');
  const [editPropTtsn, setEditPropTtsn] = useState('');

  const { data, isLoading } = useAircraftDetail(id);
  const aircraft = data?.data;

  const { mutateAsync: updateAircraft, isPending: saving } = useMutation({
    mutationFn: async (d: object) => {
      const res = await fetch(`/api/aircraft/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      });
      if (!res.ok) throw new Error('Failed to update aircraft');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aircraft', id] }),
  });

  function openEdit() {
    setEditTtsn(String(aircraft?.ttsn ?? ''));
    setEditEngTtsn(String(aircraft?.engineTtsn ?? ''));
    setEditPropTtsn(String(aircraft?.propTtsn ?? ''));
    setEditOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Aircraft" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Aircraft" subtitle="Not found" />
        <div className="flex-1 flex items-center justify-center text-sm text-content-muted">Aircraft not found.</div>
      </div>
    );
  }

  const complianceItems = aircraft.workOrders.flatMap(wo => wo.complianceItems);
  const openCompliance = complianceItems.filter(c => !c.completedAt).length;
  const activeWos = aircraft.workOrders.filter(wo => !['CLOSED', 'INVOICED', 'COMPLETE'].includes(wo.status));

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={aircraft.nNumber}
        subtitle={`${aircraft.make} ${aircraft.model}${aircraft.year ? ` · ${aircraft.year}` : ''}`}
        actions={
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={openEdit}>
            <Edit2 className="h-3.5 w-3.5" />Update Hours
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <Link href="/aircraft" className="hover:text-content-primary flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" />Aircraft
          </Link>
        </div>

        {/* Airframe Info */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Airframe TTSN</p>
              <p className="font-mono text-2xl font-bold mt-1 text-content-primary">
                {aircraft.ttsn != null ? `${aircraft.ttsn.toLocaleString()}h` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Engine TTSN</p>
              <p className="font-mono text-2xl font-bold mt-1 text-intent-gold">
                {aircraft.engineTtsn != null ? `${aircraft.engineTtsn.toLocaleString()}h` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Prop TTSN</p>
              <p className="font-mono text-2xl font-bold mt-1 text-content-secondary">
                {aircraft.propTtsn != null ? `${aircraft.propTtsn.toLocaleString()}h` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Open Compliance</p>
              <p className={`font-mono text-2xl font-bold mt-1 ${openCompliance > 0 ? 'text-intent-warning' : 'text-intent-success'}`}>
                {openCompliance}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Aircraft Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plane className="h-4 w-4" />Aircraft Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs text-content-muted">N-Number</p>
                <p className="font-mono font-bold text-intent-primary">{aircraft.nNumber}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted">Make</p>
                <p className="font-medium text-content-primary">{aircraft.make}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted">Model</p>
                <p className="font-medium text-content-primary">{aircraft.model}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted">Year</p>
                <p className="text-content-primary">{aircraft.year ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted">Serial #</p>
                <p className="font-mono text-content-primary">{aircraft.serial}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted">Owner</p>
                <Link href={`/settings/customers`} className="text-intent-primary hover:underline text-sm">
                  {aircraft.customer.name}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Work Orders Alert */}
        {activeWos.length > 0 && (
          <div className="rounded-lg border border-intent-warning/40 bg-intent-warning/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-intent-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-content-primary">{activeWos.length} active work order{activeWos.length > 1 ? 's' : ''}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {activeWos.map(wo => (
                  <Link key={wo.id} href={`/work-orders/${wo.id}`} className="font-mono text-xs text-intent-primary hover:underline">
                    {wo.number}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Work Order History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />Work Order History ({aircraft.workOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {aircraft.workOrders.length === 0 ? (
              <p className="text-sm text-content-muted p-4">No work orders yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">WO #</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Status</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Est. Total</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {aircraft.workOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-surface-hover/30">
                      <td className="py-3 px-4">
                        <Link href={`/work-orders/${wo.id}`} className="font-mono text-xs font-semibold text-intent-primary hover:underline">
                          {wo.number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-content-secondary max-w-xs truncate">{wo.description}</td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_VARIANT[wo.status] ?? 'default'}>{wo.status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        {wo.estimatedTotal ? formatCurrency(wo.estimatedTotal) : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-content-muted">{formatDate(wo.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Compliance Items */}
        {complianceItems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Compliance Items ({complianceItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Type</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Reference</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {complianceItems.map(c => (
                    <tr key={c.id} className={`hover:bg-surface-hover/30 ${c.completedAt ? 'opacity-60' : ''}`}>
                      <td className="py-2.5 px-4">
                        <Badge variant={c.type === 'AD' ? 'aog' : 'inspection'}>{c.type}</Badge>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-content-secondary">{c.referenceId}</td>
                      <td className="py-2.5 px-4 text-right">
                        {c.completedAt ? (
                          <span className="flex items-center justify-end gap-1 text-xs text-intent-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />Done
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-1 text-xs text-intent-warning">
                            <Clock className="h-3.5 w-3.5" />Open
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Update Hours Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Airframe Hours — {aircraft.nNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs">Airframe TTSN (hours)</Label>
              <Input type="number" step="0.1" min="0" className="mt-1.5 h-8 text-sm font-mono" value={editTtsn} onChange={e => setEditTtsn(e.target.value)} autoFocus />
            </div>
            <div>
              <Label className="text-xs">Engine TTSN (hours)</Label>
              <Input type="number" step="0.1" min="0" className="mt-1.5 h-8 text-sm font-mono" value={editEngTtsn} onChange={e => setEditEngTtsn(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Prop TTSN (hours)</Label>
              <Input type="number" step="0.1" min="0" className="mt-1.5 h-8 text-sm font-mono" value={editPropTtsn} onChange={e => setEditPropTtsn(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              size="sm" className="h-8 text-xs gap-1.5" disabled={saving}
              onClick={async () => {
                await updateAircraft({
                  ttsn: editTtsn ? parseFloat(editTtsn) : null,
                  engineTtsn: editEngTtsn ? parseFloat(editEngTtsn) : null,
                  propTtsn: editPropTtsn ? parseFloat(editPropTtsn) : null,
                });
                setEditOpen(false);
              }}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Hours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
