'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertTriangle, Clock, Plane, Plus, Loader2, MapPin, Car, Users, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const AOG_RATE_MULTIPLIER = 1.5;
const BASE_RATE = 115.00;
const AOG_RATE = BASE_RATE * AOG_RATE_MULTIPLIER;

type AogWO = {
  id: string;
  number: string;
  customerId: string;
  billingModel: string;
  estimatedTotal: number | null;
  dateOpened: string;
  estimatedClose: string | null;
  customer: { name: string };
  aircraft: { nNumber: string; make: string; model: string };
  _count: { laborEntries: number; squawks: number; partRequests: number };
};

function useUpdateAOGEvent(workOrderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      location?: string; mileage?: number; driveHours?: number;
      techCount?: number; resolvedAt?: string | null; notes?: string;
    }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/aog-event`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update AOG event');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
  });
}

function useGenerateInterimInvoice() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: { workOrderId: string; customerId: string }) => {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to generate invoice');
      return res.json();
    },
    onSuccess: (result) => {
      router.push(`/invoices/${result.data.id}`);
    },
  });
}

function AOGEventPanel({ aog }: { aog: AogWO }) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [mileage, setMileage] = useState('');
  const [driveHours, setDriveHours] = useState('');
  const [techCount, setTechCount] = useState('1');
  const [saved, setSaved] = useState(false);

  const { mutateAsync: updateEvent, isPending } = useUpdateAOGEvent(aog.id);
  const { mutateAsync: generateInvoice, isPending: invoicePending } = useGenerateInterimInvoice();

  const mileageTotal = parseFloat(mileage || '0') * 1.25;
  const driveTotal = parseFloat(driveHours || '0') * parseInt(techCount || '1') * 70;
  const calloutMin = 2 * AOG_RATE;

  async function handleSaveEvent() {
    await updateEvent({
      location: location || undefined,
      mileage: parseFloat(mileage) || undefined,
      driveHours: parseFloat(driveHours) || undefined,
      techCount: parseInt(techCount) || undefined,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  return (
    <>
      <div className="flex gap-2">
        <Link href={`/work-orders/${aog.id}`} className="flex-1">
          <Button className="w-full h-8 text-xs" variant="outline">View Work Order</Button>
        </Link>
        <Button className="h-8 text-xs" variant="outline" onClick={() => setOpen(true)}>
          <MapPin className="h-3.5 w-3.5 mr-1" />AOG Details
        </Button>
        <Button
          className="h-8 text-xs"
          variant="default"
          onClick={() => generateInvoice({ workOrderId: aog.id, customerId: aog.customerId })}
          disabled={invoicePending}
        >
          {invoicePending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <FileText className="h-3.5 w-3.5 mr-1" />
          }
          Interim Invoice
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AOG Event Details — {aog.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Location / Airport</Label>
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="KPAO, Palo Alto Airport or address…"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Car className="h-3.5 w-3.5" />Mileage</Label>
                <Input
                  type="number"
                  min="0"
                  value={mileage}
                  onChange={e => setMileage(e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm font-mono"
                />
                <p className="text-xs text-content-muted">@ $1.25/mi</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Drive Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  value={driveHours}
                  onChange={e => setDriveHours(e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm font-mono"
                />
                <p className="text-xs text-content-muted">@ $70/hr/tech</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Techs</Label>
                <Input
                  type="number"
                  min="1"
                  value={techCount}
                  onChange={e => setTechCount(e.target.value)}
                  placeholder="1"
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>

            {/* Billing preview */}
            <div className="rounded-lg bg-intent-danger/10 border border-intent-danger/20 p-3 text-xs space-y-1.5">
              <p className="text-content-muted font-medium">Billing Preview</p>
              <div className="flex justify-between">
                <span className="text-content-muted">2hr callout min.</span>
                <span className="font-mono text-content-primary">{formatCurrency(calloutMin)}</span>
              </div>
              {mileageTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-content-muted">Mileage ({mileage} mi)</span>
                  <span className="font-mono text-content-primary">{formatCurrency(mileageTotal)}</span>
                </div>
              )}
              {driveTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-content-muted">Drive time ({driveHours}h × {techCount})</span>
                  <span className="font-mono text-content-primary">{formatCurrency(driveTotal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-intent-danger/20 pt-1.5 font-medium">
                <span className="text-content-secondary">Min. Billable</span>
                <span className="font-mono text-intent-gold">{formatCurrency(calloutMin + mileageTotal + driveTotal)}</span>
              </div>
            </div>

            {saved && (
              <p className="text-xs text-intent-success flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />Saved successfully
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEvent} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save AOG Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AogPage() {
  const { data, isLoading } = useWorkOrders({ type: 'AOG', status: 'IN_PROGRESS', limit: 20 });
  const aogWos = (data?.data ?? []) as AogWO[];

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="AOG — Aircraft on Ground"
        subtitle="Active emergencies"
        actions={
          <Link href="/work-orders/new">
            <Button size="sm" className="gap-1 bg-intent-danger hover:bg-intent-danger/90 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />New AOG
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading && (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
        )}

        {!isLoading && aogWos.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{aogWos.length} Active AOG — All rates at 1.5× standard (${AOG_RATE.toFixed(2)}/hr)</AlertTitle>
            <AlertDescription>
              AOG work orders are billed at a 1.5× rate multiplier. 2-hour minimum callout applies.
              Parts ordered on AOG basis. Customer authorized per FAA Part 91/135.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && aogWos.length === 0 && (
          <div className="rounded-lg border border-surface-hover p-16 text-center">
            <Plane className="h-8 w-8 text-content-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-content-primary mb-1">No Active AOG Events</p>
            <p className="text-xs text-content-muted">All aircraft are operational.</p>
          </div>
        )}

        {aogWos.map(aog => (
          <Card key={aog.id} className="border-intent-danger/40">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="aog" className="text-sm px-3">AOG ACTIVE</Badge>
                    <span className="font-mono text-sm font-bold text-content-primary">{aog.number}</span>
                  </div>
                  <p className="text-sm font-medium text-content-primary">{aog.customer.name}</p>
                  <p className="font-mono text-xs text-content-muted">{aog.aircraft.nNumber} · {aog.aircraft.make} {aog.aircraft.model}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-content-muted">Est. Cost</p>
                  <p className="font-mono text-2xl font-bold text-intent-gold">{aog.estimatedTotal ? formatCurrency(aog.estimatedTotal) : '—'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-content-muted shrink-0" />
                    <span className="text-content-muted">Opened:</span>
                    <span className="font-mono text-content-primary">{formatDate(aog.dateOpened)}</span>
                  </div>
                  {aog.estimatedClose && (
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-content-muted shrink-0" />
                      <span className="text-content-muted">Est. Close:</span>
                      <span className="font-mono text-content-primary">{formatDate(aog.estimatedClose)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-content-muted">Activity</p>
                  <p className="text-xs text-content-secondary">
                    {aog._count.laborEntries} labor entr{aog._count.laborEntries === 1 ? 'y' : 'ies'} · {aog._count.squawks} squawk{aog._count.squawks !== 1 ? 's' : ''} · {aog._count.partRequests} part request{aog._count.partRequests !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-intent-danger/10 border border-intent-danger/20 p-3 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-content-muted">AOG Rate</p>
                    <p className="font-mono font-bold text-intent-danger">${AOG_RATE.toFixed(2)}/hr</p>
                    <p className="text-content-muted">(1.5× ${BASE_RATE}/hr)</p>
                  </div>
                  <div>
                    <p className="text-content-muted">Min. Callout</p>
                    <p className="font-mono font-bold text-content-primary">2h · {formatCurrency(2 * AOG_RATE)}</p>
                  </div>
                  <div>
                    <p className="text-content-muted">Billing Model</p>
                    <p className="font-mono font-bold text-content-primary">{aog.billingModel.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </div>

              <AOGEventPanel aog={aog} />
            </CardContent>
          </Card>
        ))}

        {/* AOG Billing Reference */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">AOG Billing Reference</p>
            <div className="grid grid-cols-3 gap-4 text-xs">
              {[
                { label: 'Rate Multiplier', value: '1.5× standard rate' },
                { label: 'Standard Rate', value: `$${BASE_RATE.toFixed(2)}/hr` },
                { label: 'AOG Rate', value: `$${AOG_RATE.toFixed(2)}/hr` },
                { label: 'Minimum Callout', value: '2 hours' },
                { label: 'Mileage', value: '$1.25/mile' },
                { label: 'Drive Time', value: '$70.00/hr per tech' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-content-muted">{label}</p>
                  <p className="font-mono font-semibold text-content-primary">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
