'use client';
import { useState } from 'react';
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
import { ChevronLeft, CheckCircle2, Send } from 'lucide-react';

const DEMO_INVOICE = {
  invoiceNumber: 'INV-2024-0089',
  customer: 'Hill Country Flying Club',
  workOrder: 'WO-2025-0035',
  status: 'PAID',
  issueDate: '2024-12-20',
  dueDate: '2025-01-19',
  paidAt: '2024-12-22',
  subtotal: 1875.00,
  taxAmount: 0,
  total: 1875.00,
  amountPaid: 1875.00,
  balance: 0,
  notes: 'Annual inspection + squawk repairs. Thank you for your business.',
};

const DEMO_LINE_ITEMS = [
  { id: '1', category: 'LABOR', description: 'Annual Inspection — flat rate (Cessna 182T, N8854T)', qty: 1, unitPrice: 1650.00, total: 1650.00 },
  { id: '2', category: 'SHOP_SUPPLIES', description: 'Shop Supplies (3.5% of labor)', qty: 1, unitPrice: 57.75, total: 57.75 },
  { id: '3', category: 'PARTS', description: 'Oil Filter CH48108-1 (Champion)', qty: 1, unitPrice: 54.00, total: 54.00 },
  { id: '4', category: 'PARTS', description: 'Engine Oil Phillips X/C 20W-50 (8 qt)', qty: 8, unitPrice: 14.25, total: 114.00 },
];

const DEMO_PAYMENTS = [
  { id: '1', method: 'CHECK', reference: 'CHK #1042', amount: 1875.00, paidAt: '2024-12-22' },
];

const CATEGORY_LABEL: Record<string, string> = {
  LABOR: 'Labor', PARTS: 'Parts', SHOP_SUPPLIES: 'Shop Supplies',
  FREIGHT: 'Freight', HANDLING: 'Handling', SUBCONTRACT: 'Subcontract', OTHER: 'Other',
};

export default function InvoiceDetailPage() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CHECK');
  const [paymentAmount, setPaymentAmount] = useState(DEMO_INVOICE.balance.toFixed(2));

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={DEMO_INVOICE.invoiceNumber}
        subtitle={`${DEMO_INVOICE.customer} · ${formatDate(DEMO_INVOICE.issueDate)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
                All Invoices
              </Button>
            </Link>
            {DEMO_INVOICE.balance > 0 && (
              <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => setPaymentOpen(true)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
              <Send className="h-3.5 w-3.5" />
              Send to Customer
            </Button>
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
                  <p className="font-mono text-2xl font-bold text-content-primary">{DEMO_INVOICE.invoiceNumber}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="paid">PAID</Badge>
                    {DEMO_INVOICE.workOrder && (
                      <Link href={`/work-orders/wo-4`} className="text-xs text-intent-primary hover:underline font-mono">
                        {DEMO_INVOICE.workOrder}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-content-muted">Total</p>
                  <p className="font-mono text-2xl font-bold text-intent-gold">{formatCurrency(DEMO_INVOICE.total)}</p>
                  {DEMO_INVOICE.balance === 0 && (
                    <div className="flex items-center gap-1 justify-end mt-1 text-intent-success text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Paid in full
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-sm border-t border-surface-hover pt-4">
                <div>
                  <p className="text-xs text-content-muted">Customer</p>
                  <p className="text-content-primary font-medium">{DEMO_INVOICE.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-content-muted">Issue Date</p>
                  <p className="text-content-primary">{formatDate(DEMO_INVOICE.issueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-content-muted">Due Date</p>
                  <p className="text-content-primary">{formatDate(DEMO_INVOICE.dueDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover bg-surface-panel">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Category</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Qty</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Unit Price</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {DEMO_LINE_ITEMS.map(li => (
                    <tr key={li.id} className="hover:bg-surface-hover/30">
                      <td className="py-2.5 px-4">
                        <Badge variant="default" className="text-xs">{CATEGORY_LABEL[li.category] ?? li.category}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-content-primary">{li.description}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{li.qty}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{formatCurrency(li.unitPrice)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-content-primary">{formatCurrency(li.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-surface-hover bg-surface-panel">
                    <td colSpan={4} className="py-3 px-4 text-right text-sm font-semibold text-content-primary">Total</td>
                    <td className="py-3 px-4 text-right font-mono text-sm font-bold text-intent-gold">{formatCurrency(DEMO_INVOICE.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
            <CardContent>
              {DEMO_PAYMENTS.length === 0 ? (
                <p className="text-sm text-content-muted">No payments recorded.</p>
              ) : (
                <div className="space-y-2">
                  {DEMO_PAYMENTS.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-intent-success/10 border border-intent-success/20 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-intent-success" />
                        <div>
                          <p className="text-xs font-medium text-content-primary">{p.method.replace('_', ' ')}</p>
                          {p.reference && <p className="text-xs text-content-muted">{p.reference}</p>}
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

      {/* Record Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>{DEMO_INVOICE.invoiceNumber} · Balance: {formatCurrency(DEMO_INVOICE.balance)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['CHECK', 'ACH', 'CREDIT_CARD', 'CASH', 'WIRE', 'STRIPE'].map(m => (
                    <SelectItem key={m} value={m}>{m.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted">$</span>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="pl-6 font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference (check #, transaction ID)</Label>
              <Input placeholder="CHK #1043" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={() => setPaymentOpen(false)}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
