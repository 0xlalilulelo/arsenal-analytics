'use client';
import { use, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Wrench, Plane, Loader2, AlertTriangle, FileText } from 'lucide-react';

const CATEGORY_LABEL: Record<string, string> = {
  LABOR: 'Labor', PARTS: 'Parts', SUBCONTRACT: 'Subcontract',
  SHOP_SUPPLIES: 'Shop Supplies', FREIGHT: 'Freight', OTHER: 'Other',
};

type PortalQuote = {
  id: string; quoteNumber: string; status: string;
  billingModel: string; nteAmount: number | null;
  subtotal: number; total: number; depositPct: number; depositAmount: number;
  validDays: number; expiresAt: string | null; sentAt: string | null;
  notes: string | null;
  org: { name: string };
  customer: { name: string; email: string | null; phone: string | null };
  aircraft: { nNumber: string; make: string; model: string; year: number | null; ttsn: number | null } | null;
  lines: { id: string; category: string; description: string; qty: number; unitPrice: number; total: number }[];
};

function usePortalQuote(token: string) {
  return useQuery({
    queryKey: ['portal-quote', token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/quotes/${token}`);
      if (!res.ok) throw new Error('Quote not found');
      return res.json() as Promise<{ data: PortalQuote }>;
    },
    retry: false,
  });
}

function useRespond(token: string) {
  return useMutation({
    mutationFn: async (data: { action: string; approvedBy?: string; declineReason?: string }) => {
      const res = await fetch(`/api/portal/quotes/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed');
      }
      return res.json();
    },
  });
}

function StatusBanner({ status }: { status: string }) {
  if (status === 'APPROVED') {
    return (
      <div className="rounded-xl bg-intent-success/10 border border-intent-success/30 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-intent-success mx-auto mb-3" />
        <p className="text-lg font-bold text-intent-success">Quote Approved</p>
        <p className="text-sm text-content-secondary mt-1">Thank you. We'll be in touch to schedule your service.</p>
      </div>
    );
  }
  if (status === 'DECLINED') {
    return (
      <div className="rounded-xl bg-intent-danger/10 border border-intent-danger/30 p-6 text-center">
        <XCircle className="h-10 w-10 text-intent-danger mx-auto mb-3" />
        <p className="text-lg font-bold text-intent-danger">Quote Declined</p>
        <p className="text-sm text-content-secondary mt-1">We've received your response. Please contact us if you have questions.</p>
      </div>
    );
  }
  if (status === 'EXPIRED') {
    return (
      <div className="rounded-xl bg-intent-warning/10 border border-intent-warning/30 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-intent-warning mx-auto mb-3" />
        <p className="text-lg font-bold text-intent-warning">Quote Expired</p>
        <p className="text-sm text-content-secondary mt-1">This quote is no longer valid. Please contact us for an updated quote.</p>
      </div>
    );
  }
  return null;
}

export default function PortalQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, isLoading, error } = usePortalQuote(token);
  const { mutateAsync: respond, isPending: responding } = useRespond(token);

  // Mark as VIEWED on first load
  useEffect(() => {
    if (data?.data?.status === 'SENT') {
      fetch(`/api/portal/quotes/${token}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [data?.data?.status, token]);

  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [approvedBy, setApprovedBy] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [responded, setResponded] = useState<'approved' | 'declined' | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-intent-primary" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <FileText className="h-12 w-12 text-content-muted mx-auto" />
          <p className="text-lg font-semibold text-content-primary">Quote Not Found</p>
          <p className="text-sm text-content-muted">This quote link may be invalid or expired. Please contact the shop directly.</p>
        </div>
      </div>
    );
  }

  const q = data.data;
  const isActive = ['SENT', 'VIEWED'].includes(q.status);
  const depositPct = q.depositPct > 0 ? q.depositPct : null;
  const expiresAt = q.expiresAt ? new Date(q.expiresAt) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;
  const effectiveStatus = responded === 'approved' ? 'APPROVED' : responded === 'declined' ? 'DECLINED' : q.status;

  const laborLines = q.lines.filter(l => l.category === 'LABOR');
  const partsLines = q.lines.filter(l => l.category === 'PARTS');
  const otherLines = q.lines.filter(l => !['LABOR', 'PARTS'].includes(l.category));

  return (
    <div className="min-h-screen bg-surface-base py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Shop Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intent-primary/20">
            <Wrench className="h-5 w-5 text-intent-primary" />
          </div>
          <div>
            <p className="font-bold text-content-primary">{q.org.name}</p>
            <p className="text-xs text-content-muted">Aviation Maintenance & Repair</p>
          </div>
        </div>

        {/* Status Banner (if already responded) */}
        {!isActive && <StatusBanner status={effectiveStatus} />}

        {/* Quote Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-content-muted uppercase tracking-wider">Service Estimate</p>
                <p className="font-mono text-2xl font-bold text-content-primary mt-0.5">{q.quoteNumber}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-content-secondary">Prepared for</span>
                  <span className="font-medium text-content-primary">{q.customer.name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-content-muted">Estimate Total</p>
                <p className="font-mono text-2xl font-bold text-intent-gold">{formatCurrency(q.total)}</p>
                {depositPct && (
                  <p className="text-xs text-content-muted mt-0.5">
                    {(depositPct * 100).toFixed(0)}% deposit · {formatCurrency(q.depositAmount)}
                  </p>
                )}
              </div>
            </div>

            {q.aircraft && (
              <div className="mt-4 pt-4 border-t border-surface-hover flex items-center gap-2">
                <Plane className="h-4 w-4 text-content-muted" />
                <span className="font-mono font-bold text-intent-primary">{q.aircraft.nNumber}</span>
                <span className="text-sm text-content-secondary">{q.aircraft.make} {q.aircraft.model}</span>
                {q.aircraft.year && <span className="text-xs text-content-muted">({q.aircraft.year})</span>}
                {q.aircraft.ttsn != null && <span className="text-xs text-content-muted">· {q.aircraft.ttsn.toLocaleString()}h TTSN</span>}
              </div>
            )}

            <div className="mt-4 flex gap-6 text-sm flex-wrap">
              {q.sentAt && (
                <div>
                  <p className="text-xs text-content-muted">Issued</p>
                  <p className="text-content-secondary">{formatDate(q.sentAt)}</p>
                </div>
              )}
              {expiresAt && (
                <div>
                  <p className="text-xs text-content-muted">Valid Until</p>
                  <p className={isExpired ? 'text-intent-danger font-medium' : 'text-content-secondary'}>
                    {formatDate(expiresAt.toISOString())}
                    {isExpired && ' (expired)'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-content-muted">Billing</p>
                <p className="text-content-secondary">{q.billingModel.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scope of Work</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-hover bg-surface-panel">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Category</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Qty</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Unit</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hover">
                {[...laborLines, ...partsLines, ...otherLines].map(line => (
                  <tr key={line.id} className="hover:bg-surface-hover/20">
                    <td className="py-2.5 px-4">
                      <Badge variant="default" className="text-xs">{CATEGORY_LABEL[line.category] ?? line.category}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-content-primary">{line.description}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{line.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{formatCurrency(line.unitPrice)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold">{formatCurrency(line.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-surface-hover bg-surface-panel">
                {q.subtotal !== q.total && (
                  <tr>
                    <td colSpan={4} className="py-2 px-4 text-right text-xs text-content-muted">Subtotal</td>
                    <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(q.subtotal)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} className="py-2.5 px-4 text-right text-sm font-semibold text-content-primary">Estimate Total</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm font-bold text-intent-gold">{formatCurrency(q.total)}</td>
                </tr>
                {depositPct && (
                  <tr>
                    <td colSpan={4} className="py-2 px-4 text-right text-xs text-content-muted">
                      Deposit Required ({(depositPct * 100).toFixed(0)}%)
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs font-semibold text-intent-warning">
                      {formatCurrency(q.depositAmount)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Notes */}
        {q.notes && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-content-muted mb-1">Notes from the Shop</p>
              <p className="text-sm text-content-secondary whitespace-pre-wrap">{q.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {isActive && !responded && !isExpired && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 text-sm gap-2 border-intent-danger/40 text-intent-danger hover:bg-intent-danger/10 hover:border-intent-danger"
              onClick={() => setDeclineOpen(true)}
            >
              <XCircle className="h-4 w-4" />Decline Quote
            </Button>
            <Button
              className="h-12 text-sm gap-2 bg-intent-success hover:bg-intent-success/90"
              onClick={() => setApproveOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" />Approve & Proceed
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-content-muted pb-4">
          Questions? Contact {q.org.name} directly.
          {q.customer.phone && ` Call ${q.customer.phone}.`}
        </p>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Approve Quote</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-content-secondary">
              You're approving <span className="font-mono font-semibold">{q.quoteNumber}</span> for {formatCurrency(q.total)}.
              {depositPct && ` A deposit of ${formatCurrency(q.depositAmount)} will be required to begin work.`}
            </p>
            <div>
              <Label className="text-xs">Your Name (for authorization record)</Label>
              <Input
                className="mt-1.5 h-9 text-sm"
                placeholder="First Last"
                value={approvedBy}
                onChange={e => setApprovedBy(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="gap-1.5 bg-intent-success hover:bg-intent-success/90"
              disabled={responding || !approvedBy.trim()}
              onClick={async () => {
                await respond({ action: 'approve', approvedBy: approvedBy.trim() });
                setResponded('approved');
                setApproveOpen(false);
              }}
            >
              {responding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Decline Quote</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-content-secondary">Please let us know why you're declining so we can improve our service.</p>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                className="mt-1.5 h-9 text-sm"
                placeholder="Price too high, going with another shop…"
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={responding}
              onClick={async () => {
                await respond({ action: 'decline', declineReason: declineReason || undefined });
                setResponded('declined');
                setDeclineOpen(false);
              }}
            >
              {responding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Decline Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
