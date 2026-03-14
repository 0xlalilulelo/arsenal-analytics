'use client';
import { use, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Plane, Loader2, FileText, Wrench, CreditCard, ExternalLink, Printer } from 'lucide-react';

const CATEGORY_LABEL: Record<string, string> = {
  LABOR: 'Labor', PARTS: 'Parts', SHOP_SUPPLIES: 'Shop Supplies',
  FREIGHT: 'Freight', HANDLING: 'Handling', SUBCONTRACT: 'Subcontract', OTHER: 'Other',
};

const METHOD_LABEL: Record<string, string> = {
  CHECK: 'Check', ACH: 'ACH / Bank Transfer', CREDIT_CARD: 'Credit Card',
  CASH: 'Cash', WIRE: 'Wire Transfer', STRIPE: 'Online Payment',
};

type PortalInvoice = {
  id: string; invoiceNumber: string; status: string;
  issueDate: string; dueDate: string | null;
  subtotal: number; taxRate: number; taxAmount: number; total: number;
  amountPaid: number; balance: number; notes: string | null;
  org: { name: string };
  customer: { name: string; email: string | null; phone: string | null };
  workOrder: { number: string; aircraft: { nNumber: string; make: string; model: string } | null } | null;
  lineItems: { id: string; category: string; description: string; qty: number; unitPrice: number; total: number; taxable: boolean }[];
  payments: { id: string; amount: number; method: string; paidAt: string; reference: string | null }[];
};

function usePortalInvoice(token: string) {
  return useQuery({
    queryKey: ['portal-invoice', token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/invoices/${token}`);
      if (!res.ok) throw new Error('Invoice not found');
      return res.json() as Promise<{ data: PortalInvoice }>;
    },
    retry: false,
  });
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT:   { label: 'Draft',    color: 'text-content-muted' },
  SENT:    { label: 'Sent',     color: 'text-intent-primary' },
  VIEWED:  { label: 'Viewed',   color: 'text-intent-primary' },
  PARTIAL: { label: 'Partial',  color: 'text-intent-warning' },
  PAID:    { label: 'Paid',     color: 'text-intent-success' },
  OVERDUE: { label: 'Overdue',  color: 'text-intent-danger' },
  VOID:    { label: 'Void',     color: 'text-content-muted' },
};

export default function PortalInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const { data, isLoading, error } = usePortalInvoice(token);
  const [checkoutPending, setCheckoutPending] = useState(false);

  // Mark as VIEWED on first open
  useEffect(() => {
    if (data?.data?.status === 'SENT') {
      fetch(`/api/portal/invoices/${token}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [data?.data?.status, token]);

  async function handlePayOnline(invoiceId: string) {
    setCheckoutPending(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/checkout`, { method: 'POST' });
      const json = await res.json();
      if (json.checkoutUrl) window.location.href = json.checkoutUrl;
    } finally {
      setCheckoutPending(false);
    }
  }

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
          <p className="text-lg font-semibold text-content-primary">Invoice Not Found</p>
          <p className="text-sm text-content-muted">This invoice link may be invalid or expired. Please contact the shop directly.</p>
        </div>
      </div>
    );
  }

  const inv = data.data;
  const statusInfo = STATUS_LABEL[inv.status] ?? { label: inv.status, color: 'text-content-muted' };
  const isPaid = inv.balance === 0;
  const isOverdue = inv.status === 'OVERDUE';
  const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
  const isDueSoon = dueDate && !isPaid && (dueDate.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-surface-base py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Shop header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intent-primary/20">
            <Wrench className="h-5 w-5 text-intent-primary" />
          </div>
          <div>
            <p className="font-bold text-content-primary">{inv.org.name}</p>
            <p className="text-xs text-content-muted">Aviation Maintenance & Repair</p>
          </div>
        </div>

        {/* Paid banner */}
        {isPaid && (
          <div className="rounded-xl bg-intent-success/10 border border-intent-success/30 p-5 flex items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-intent-success shrink-0" />
            <div>
              <p className="font-bold text-intent-success">Paid in Full</p>
              <p className="text-sm text-content-secondary">Thank you for your payment.</p>
            </div>
          </div>
        )}

        {/* Overdue warning */}
        {isOverdue && (
          <div className="rounded-xl bg-intent-danger/10 border border-intent-danger/30 p-4">
            <p className="font-bold text-intent-danger text-sm">This invoice is overdue.</p>
            <p className="text-xs text-content-secondary mt-0.5">Please contact {inv.org.name} to arrange payment.</p>
          </div>
        )}

        {/* Invoice header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-content-muted uppercase tracking-wider">Invoice</p>
                <p className="font-mono text-2xl font-bold text-content-primary">{inv.invoiceNumber}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                  {inv.workOrder && (
                    <span className="text-xs text-content-muted font-mono">WO {inv.workOrder.number}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-content-muted">Amount Due</p>
                <p className={`font-mono text-2xl font-bold ${isPaid ? 'text-intent-success' : isOverdue ? 'text-intent-danger' : 'text-intent-gold'}`}>
                  {formatCurrency(inv.balance)}
                </p>
                {inv.amountPaid > 0 && (
                  <p className="text-xs text-content-muted mt-0.5">{formatCurrency(inv.amountPaid)} paid of {formatCurrency(inv.total)}</p>
                )}
              </div>
            </div>

            {inv.workOrder?.aircraft && (
              <div className="mt-4 pt-4 border-t border-surface-hover flex items-center gap-2">
                <Plane className="h-4 w-4 text-content-muted" />
                <span className="font-mono font-bold text-intent-primary">{inv.workOrder.aircraft.nNumber}</span>
                <span className="text-sm text-content-secondary">{inv.workOrder.aircraft.make} {inv.workOrder.aircraft.model}</span>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-4 text-sm border-t border-surface-hover pt-4">
              <div>
                <p className="text-xs text-content-muted">Billed To</p>
                <p className="text-content-primary font-medium">{inv.customer.name}</p>
                {inv.customer.email && <p className="text-xs text-content-muted">{inv.customer.email}</p>}
              </div>
              <div>
                <p className="text-xs text-content-muted">Issue Date</p>
                <p className="text-content-secondary">{formatDate(inv.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted">Due Date</p>
                <p className={`${isDueSoon && !isPaid ? 'text-intent-warning font-semibold' : 'text-content-secondary'}`}>
                  {dueDate ? formatDate(dueDate.toISOString()) : '—'}
                  {isDueSoon && !isPaid && !isOverdue && ' (soon)'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Services & Parts</CardTitle></CardHeader>
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
                {inv.lineItems.map(li => (
                  <tr key={li.id} className="hover:bg-surface-hover/20">
                    <td className="py-2.5 px-4">
                      <Badge variant="default" className="text-xs">{CATEGORY_LABEL[li.category] ?? li.category}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-content-primary">{li.description}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{li.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{formatCurrency(li.unitPrice)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold">{formatCurrency(li.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-surface-hover bg-surface-panel">
                <tr>
                  <td colSpan={4} className="py-2 px-4 text-right text-xs text-content-muted">Subtotal</td>
                  <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(inv.subtotal)}</td>
                </tr>
                {inv.taxRate > 0 && (
                  <tr>
                    <td colSpan={4} className="py-2 px-4 text-right text-xs text-content-muted">Tax ({(inv.taxRate * 100).toFixed(1)}%)</td>
                    <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(inv.taxAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} className="py-2.5 px-4 text-right text-sm font-semibold text-content-primary">Total</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm font-bold text-intent-gold">{formatCurrency(inv.total)}</td>
                </tr>
                {inv.amountPaid > 0 && (
                  <tr>
                    <td colSpan={4} className="py-2 px-4 text-right text-xs text-content-muted">Payments Applied</td>
                    <td className="py-2 px-4 text-right font-mono text-xs text-intent-success">−{formatCurrency(inv.amountPaid)}</td>
                  </tr>
                )}
                <tr className={`border-t border-surface-hover ${!isPaid ? 'bg-intent-warning/5' : ''}`}>
                  <td colSpan={4} className="py-2.5 px-4 text-right text-sm font-bold text-content-primary">Balance Due</td>
                  <td className={`py-2.5 px-4 text-right font-mono text-sm font-bold ${isPaid ? 'text-intent-success' : isOverdue ? 'text-intent-danger' : 'text-intent-warning'}`}>
                    {formatCurrency(inv.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Payment history */}
        {inv.payments.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment History</CardTitle></CardHeader>
            <CardContent className="space-y-2 pt-0">
              {inv.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-intent-success/10 border border-intent-success/20 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-intent-success" />
                    <div>
                      <p className="text-xs font-medium text-content-primary">{METHOD_LABEL[p.method] ?? p.method}</p>
                      {p.reference && <p className="text-xs text-content-muted">{p.reference}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-intent-success">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-content-muted">{formatDate(p.paidAt)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {inv.notes && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-content-muted mb-1">Notes</p>
              <p className="text-sm text-content-secondary whitespace-pre-wrap">{inv.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Payment success/cancelled flash */}
        {paymentStatus === 'success' && (
          <div className="rounded-xl bg-intent-success/10 border border-intent-success/30 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-intent-success shrink-0" />
            <p className="text-sm text-intent-success font-medium">Payment received — thank you!</p>
          </div>
        )}
        {paymentStatus === 'cancelled' && (
          <div className="rounded-xl bg-surface-hover border border-surface-hover p-4">
            <p className="text-sm text-content-secondary">Payment was cancelled. You can try again below.</p>
          </div>
        )}

        {/* Pay Online CTA */}
        {!isPaid && (
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-sm gap-2 bg-intent-success hover:bg-intent-success/90"
              onClick={() => handlePayOnline(inv.id)}
              disabled={checkoutPending}
            >
              {checkoutPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Pay {formatCurrency(inv.balance)} Online
            </Button>
            <p className="text-center text-xs text-content-muted">Secure payment powered by Stripe. Accepts all major cards.</p>
          </div>
        )}

        {/* Print link */}
        <div className="flex justify-center">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-secondary transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />Print / Save as PDF
          </button>
        </div>

        {/* Contact info */}
        {!isPaid && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-semibold text-content-secondary">Questions? Contact us:</p>
              <p className="text-sm text-content-primary font-medium">{inv.org.name}</p>
              {inv.customer.phone && (
                <a href={`tel:${inv.customer.phone}`} className="text-sm text-intent-primary hover:underline block">{inv.customer.phone}</a>
              )}
              {inv.customer.email && (
                <a href={`mailto:${inv.customer.email}`} className="text-sm text-intent-primary hover:underline block">{inv.customer.email}</a>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-content-muted pb-4">
          This invoice was issued by {inv.org.name}. Please retain for your records.
        </p>
      </div>
    </div>
  );
}
