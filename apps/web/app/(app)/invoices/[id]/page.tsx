'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useInvoiceDetail, useRecordPayment, useUpdateInvoice } from '@/hooks/useInvoices';
import { useCurrentUser } from '@/hooks/use-current-user';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, CheckCircle2, Send, Loader2, Copy, ExternalLink, Printer, Ban, Pencil, Trash2, Plus } from 'lucide-react';

const LINE_ITEM_CATEGORIES = ['LABOR', 'PARTS', 'SHOP_SUPPLIES', 'FREIGHT', 'HANDLING', 'SUBCONTRACT', 'OTHER'];

const CATEGORY_LABEL: Record<string, string> = {
  LABOR: 'Labor', PARTS: 'Parts', SHOP_SUPPLIES: 'Shop Supplies',
  FREIGHT: 'Freight', HANDLING: 'Handling', SUBCONTRACT: 'Subcontract', OTHER: 'Other',
};

const STATUS_VARIANT: Record<string, 'complete' | 'in-progress' | 'open' | 'aog' | 'default'> = {
  PAID: 'complete', PARTIAL: 'in-progress', SENT: 'default', VIEWED: 'default',
  OVERDUE: 'aog', DRAFT: 'open', VOID: 'open',
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: inv, isLoading, isError } = useInvoiceDetail(id);
  const { mutateAsync: recordPayment, isPending: paymentPending } = useRecordPayment(id);
  const { mutateAsync: updateInvoice, isPending: sendPending } = useUpdateInvoice(id);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CHECK');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMemo, setPaymentMemo] = useState('');
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { can: userCan } = useCurrentUser();

  // Line item editing state
  const [addLineItemOpen, setAddLineItemOpen] = useState(false);
  const [editLineItem, setEditLineItem] = useState<any | null>(null);
  const [deleteLineItemId, setDeleteLineItemId] = useState<string | null>(null);
  const [liDescription, setLiDescription] = useState('');
  const [liCategory, setLiCategory] = useState('OTHER');
  const [liQty, setLiQty] = useState('1');
  const [liUnitPrice, setLiUnitPrice] = useState('');
  const qc = useQueryClient();

  const { mutateAsync: addLineItem, isPending: addingLi } = useMutation({
    mutationFn: async (data: object) => {
      const res = await fetch(`/api/invoices/${id}/line-items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add line item');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); setAddLineItemOpen(false); },
  });

  const { mutateAsync: saveLineItem, isPending: savingLi } = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: object }) => {
      const res = await fetch(`/api/invoices/${id}/line-items/${itemId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update line item');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); setEditLineItem(null); },
  });

  const { mutateAsync: removeLineItem } = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/invoices/${id}/line-items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete line item');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice', id] }),
  });

  function openAdd() {
    setLiDescription(''); setLiCategory('OTHER'); setLiQty('1'); setLiUnitPrice('');
    setAddLineItemOpen(true);
  }

  function openEdit(li: any) {
    setLiDescription(li.description); setLiCategory(li.category);
    setLiQty(String(li.qty)); setLiUnitPrice(String(li.unitPrice));
    setEditLineItem(li);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Invoice" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>
      </div>
    );
  }

  if (isError || !inv) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Invoice" subtitle="Not found" />
        <div className="flex-1 flex items-center justify-center"><p className="text-sm text-content-muted">Invoice not found.</p></div>
      </div>
    );
  }

  async function handleRecordPayment() {
    try {
      await recordPayment({
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        reference: paymentRef || undefined,
        memo: paymentMemo || undefined,
      });
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentMemo('');
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={inv.invoiceNumber}
        subtitle={`${inv.customer.name} · ${inv.issueDate ? formatDate(inv.issueDate) : 'Draft'}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />All Invoices
              </Button>
            </Link>
            {inv.balance > 0 && userCan.recordPayment() && (
              <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => { setPaymentAmount(inv.balance.toFixed(2)); setPaymentOpen(true); }}>
                <CheckCircle2 className="h-3.5 w-3.5" />Record Payment
              </Button>
            )}
            <Button
              variant="ghost" size="sm" className="h-8 text-xs gap-1"
              onClick={() => window.open(`/print/invoices/${id}`, '_blank')}
            >
              <Printer className="h-3.5 w-3.5" />Print
            </Button>
            {inv.portalToken && (
              <Button
                variant="ghost" size="sm" className="gap-1 h-8 text-xs"
                onClick={async () => {
                  const url = `${window.location.origin}/portal/invoices/${inv.portalToken}`;
                  await navigator.clipboard.writeText(url);
                  setPortalUrl(url); setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-intent-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Portal Link'}
              </Button>
            )}
            {userCan.sendInvoice() && <Button
              variant={inv.status === 'SENT' ? 'ghost' : 'outline'}
              size="sm"
              className="gap-1 h-8 text-xs"
              onClick={async () => {
                const result = await updateInvoice({ status: 'SENT' }) as any;
                if (result?.portalUrl) setPortalUrl(result.portalUrl);
              }}
              disabled={sendPending || inv.status === 'PAID' || inv.status === 'SENT' || inv.status === 'VOID'}
            >
              {sendPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />}
              {inv.status === 'SENT' ? 'Sent' : 'Send Invoice'}
            </Button>}
            {userCan.sendInvoice() && !['PAID', 'VOID'].includes(inv.status) && (
              <Button
                variant="ghost" size="sm"
                className="gap-1 h-8 text-xs text-intent-danger hover:text-intent-danger hover:bg-intent-danger/10"
                onClick={() => setVoidOpen(true)}
              >
                <Ban className="h-3.5 w-3.5" />Void
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-content-muted uppercase tracking-wider mb-1">Invoice</p>
                  <p className="font-mono text-2xl font-bold text-content-primary">{inv.invoiceNumber}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[inv.status] ?? 'default'}>{inv.status}</Badge>
                    {inv.workOrder && (
                      <Link href={`/work-orders/${inv.workOrder.id}`} className="text-xs text-intent-primary hover:underline font-mono">
                        {inv.workOrder.number}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-content-muted">Total</p>
                  <p className="font-mono text-2xl font-bold text-intent-gold">{formatCurrency(inv.total)}</p>
                  {inv.balance === 0 && (
                    <div className="flex items-center gap-1 justify-end mt-1 text-intent-success text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />Paid in full
                    </div>
                  )}
                  {inv.balance > 0 && (
                    <p className="text-xs text-intent-warning font-mono mt-1">Balance: {formatCurrency(inv.balance)}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-surface-hover pt-4">
                <div>
                  <p className="text-xs text-content-muted">Customer</p>
                  <p className="text-content-primary font-medium">{inv.customer.name}</p>
                  {inv.customer.accountNumber && <p className="text-xs text-content-muted">{inv.customer.accountNumber}</p>}
                </div>
                <div>
                  <p className="text-xs text-content-muted">Billing Terms</p>
                  <p className="text-content-primary">{inv.customer.billingTerms?.replace('_', ' ') ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-content-muted">Issue Date</p>
                  <p className="text-content-primary">{inv.issueDate ? formatDate(inv.issueDate) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-content-muted">Due Date</p>
                  <p className={`font-medium ${inv.status === 'OVERDUE' ? 'text-intent-danger' : 'text-content-primary'}`}>
                    {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portal link banner */}
          {(portalUrl || (inv.portalToken && ['SENT','VIEWED','PARTIAL','OVERDUE'].includes(inv.status))) && (
            <div className="rounded-lg border border-intent-primary/30 bg-intent-primary/5 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <ExternalLink className="h-4 w-4 text-intent-primary shrink-0" />
                <p className="text-xs text-content-secondary truncate">
                  Customer portal:{' '}
                  <span className="font-mono text-intent-primary">
                    {(portalUrl ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/invoices/${inv.portalToken}`).replace(/^https?:\/\//, '')}
                  </span>
                </p>
              </div>
              <Button
                variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0"
                onClick={async () => {
                  const url = portalUrl ?? `${window.location.origin}/portal/invoices/${inv.portalToken}`;
                  await navigator.clipboard.writeText(url);
                  setCopied(true); setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-intent-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          )}

          {/* Line items */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Line Items</CardTitle>
              {!['PAID', 'VOID'].includes(inv.status) && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5" />Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover bg-surface-panel">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Category</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Qty</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Unit Price</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Total</th>
                    {!['PAID', 'VOID'].includes(inv.status) && <th className="py-2.5 px-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {(!inv.lineItems || inv.lineItems.length === 0) && (
                    <tr><td colSpan={5} className="py-8 text-center text-xs text-content-muted">No line items.</td></tr>
                  )}
                  {inv.lineItems?.map((li: any) => (
                    <tr key={li.id} className="hover:bg-surface-hover/30 group">
                      <td className="py-2.5 px-4">
                        <Badge variant="default" className="text-xs">{CATEGORY_LABEL[li.category] ?? li.category}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-content-primary">{li.description}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{li.qty}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{formatCurrency(li.unitPrice)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-content-primary">{formatCurrency(li.total)}</td>
                      {!['PAID', 'VOID'].includes(inv.status) && (
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="sm" className="h-6 w-6 p-0 text-content-muted hover:text-content-primary"
                              onClick={() => openEdit(li)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-6 w-6 p-0 text-content-muted hover:text-intent-danger"
                              onClick={() => setDeleteLineItemId(li.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-surface-hover bg-surface-panel">
                    <td colSpan={4} className="py-3 px-4 text-right text-sm font-semibold text-content-primary">Total</td>
                    <td className="py-3 px-4 text-right font-mono text-sm font-bold text-intent-gold">{formatCurrency(inv.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
            <CardContent>
              {(!inv.payments || inv.payments.length === 0) ? (
                <p className="text-sm text-content-muted">No payments recorded.</p>
              ) : (
                <div className="space-y-2">
                  {inv.payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-intent-success/10 border border-intent-success/20 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-intent-success" />
                        <div>
                          <p className="text-xs font-medium text-content-primary">{p.method.replace(/_/g, ' ')}</p>
                          {p.reference && <p className="text-xs text-content-muted">{p.reference}</p>}
                          {p.memo && <p className="text-xs text-content-muted">{p.memo}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-intent-success">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-content-muted">{formatDate(p.paidAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add / Edit Line Item Dialog */}
      {[
        { open: addLineItemOpen, setOpen: setAddLineItemOpen, mode: 'add' as const },
        { open: !!editLineItem, setOpen: (v: boolean) => !v && setEditLineItem(null), mode: 'edit' as const },
      ].map(({ open, setOpen, mode }) => (
        <Dialog key={mode} open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{mode === 'add' ? 'Add Line Item' : 'Edit Line Item'}</DialogTitle>
              <DialogDescription>{inv.invoiceNumber}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={liCategory} onValueChange={setLiCategory}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LINE_ITEM_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{CATEGORY_LABEL[c] ?? c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description *</Label>
                <Input value={liDescription} onChange={e => setLiDescription(e.target.value)} className="h-8 text-sm" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min="1" step="1" value={liQty} onChange={e => setLiQty(e.target.value)} className="h-8 text-sm font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit Price</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-content-muted">$</span>
                    <Input type="number" step="0.01" min="0" value={liUnitPrice} onChange={e => setLiUnitPrice(e.target.value)} className="h-8 text-sm font-mono pl-5" />
                  </div>
                </div>
              </div>
              {liQty && liUnitPrice && (
                <p className="text-xs text-right text-content-muted">
                  Line total: <span className="font-mono font-semibold text-content-primary">
                    {formatCurrency(parseFloat(liQty || '0') * parseFloat(liUnitPrice || '0'))}
                  </span>
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                disabled={!liDescription.trim() || !liUnitPrice || (mode === 'add' ? addingLi : savingLi)}
                onClick={async () => {
                  const payload = {
                    description: liDescription.trim(),
                    category: liCategory,
                    qty: parseFloat(liQty) || 1,
                    unitPrice: parseFloat(liUnitPrice),
                  };
                  if (mode === 'add') {
                    await addLineItem(payload);
                  } else {
                    await saveLineItem({ itemId: editLineItem.id, data: payload });
                  }
                }}
                className="gap-2"
              >
                {(mode === 'add' ? addingLi : savingLi) && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'add' ? 'Add Item' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}

      {/* Delete Line Item Confirm */}
      <AlertDialog open={!!deleteLineItemId} onOpenChange={(v) => !v && setDeleteLineItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line Item?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this line item and recalculate the invoice total.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-danger hover:bg-intent-danger/90 text-white"
              onClick={async () => {
                if (deleteLineItemId) await removeLineItem(deleteLineItemId);
                setDeleteLineItemId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice {inv.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the invoice as void and remove it from AR. This action cannot be undone. Any recorded payments will remain in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-danger hover:bg-intent-danger/90 text-white"
              onClick={async () => {
                await updateInvoice({ status: 'VOID' });
                setVoidOpen(false);
              }}
            >
              Void Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>{inv.invoiceNumber} · Balance: {formatCurrency(inv.balance)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['CHECK', 'ACH', 'CREDIT_CARD', 'CASH', 'WIRE', 'STRIPE'].map(m => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted">$</span>
                <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="pl-6 font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference (check #, transaction ID)</Label>
              <Input placeholder="CHK #1043" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Memo (optional)</Label>
              <Input placeholder="Payment note" value={paymentMemo} onChange={e => setPaymentMemo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentPending}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={paymentPending || !paymentAmount}>
              {paymentPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
