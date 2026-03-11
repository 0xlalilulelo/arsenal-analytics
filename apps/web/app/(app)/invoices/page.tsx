import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { buildAgingSummary } from '@mro/core';
import Link from 'next/link';
import { Plus, ChevronRight } from 'lucide-react';
import type { BadgeProps } from '@/components/ui/badge';

const INVOICES = [
  { id: 'inv-1', invoiceNumber: 'INV-2024-0089', customer: 'Hill Country Flying Club', workOrder: 'WO-2025-0035', status: 'PAID', issueDate: '2024-12-20', dueDate: '2025-01-19', total: 1875.00, balance: 0 },
  { id: 'inv-2', invoiceNumber: 'INV-2025-0001', customer: 'Apex Air Charter LLC', workOrder: null, status: 'PARTIAL', issueDate: '2025-01-03', dueDate: '2025-02-02', total: 5840.00, balance: 3840.00 },
  { id: 'inv-3', invoiceNumber: 'INV-2024-0092', customer: 'Robert Harrington', workOrder: null, status: 'SENT', issueDate: '2024-12-18', dueDate: '2025-01-17', total: 1245.00, balance: 1245.00 },
  { id: 'inv-4', invoiceNumber: 'INV-2024-0081', customer: 'Patricia Okonkwo', workOrder: null, status: 'OVERDUE', issueDate: '2024-11-01', dueDate: '2024-12-01', total: 892.50, balance: 892.50 },
];

function statusVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    PAID: 'paid', PARTIAL: 'partial', SENT: 'sent', OVERDUE: 'overdue', DRAFT: 'draft',
  };
  return map[status] ?? 'default';
}

function daysOverdue(dueDate: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000));
}

function agingBucketColor(dueDate: string): string {
  const days = daysOverdue(dueDate);
  if (days <= 0)  return '';
  if (days <= 30) return 'border-l-2 border-intent-primary';
  if (days <= 60) return 'border-l-2 border-intent-warning';
  return 'border-l-2 border-intent-danger';
}

const agingSummary = buildAgingSummary(
  INVOICES.filter(i => i.balance > 0).map(i => ({ balance: i.balance, dueDate: new Date(i.dueDate) })),
  new Date('2025-01-15'),
);

export default function InvoicesPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Invoices & Payments"
        subtitle="AR aging · Jan 15, 2025"
        actions={
          <Button size="sm" className="gap-1 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New Invoice
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* AR Aging summary strip */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Current', amount: agingSummary.current, color: 'text-intent-success', borderColor: 'border-intent-success/30' },
            { label: '1–30 Days', amount: agingSummary['1-30'], color: 'text-intent-primary', borderColor: 'border-intent-primary/30' },
            { label: '31–60 Days', amount: agingSummary['31-60'], color: 'text-intent-warning', borderColor: 'border-intent-warning/30' },
            { label: '61–90 Days', amount: agingSummary['61-90'], color: 'text-intent-danger', borderColor: 'border-intent-danger/30' },
            { label: '90+ Days', amount: agingSummary['90+'], color: 'text-intent-danger', borderColor: 'border-intent-danger/30' },
          ].map(({ label, amount, color, borderColor }) => (
            <Card key={label} className={`border ${borderColor}`}>
              <CardContent className="p-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`font-mono text-lg font-bold ${color}`}>{formatCurrency(amount)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invoice table */}
        <div className="rounded-lg border border-surface-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-hover bg-surface-panel">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Invoice #</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Customer</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Status</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Issued</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Due</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Total</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Balance</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {INVOICES.map(inv => {
                const overdue = daysOverdue(inv.dueDate);
                return (
                  <tr key={inv.id} className={`hover:bg-surface-hover/40 transition-colors group ${agingBucketColor(inv.dueDate)}`}>
                    <td className="py-3 px-4">
                      <Link href={`/invoices/${inv.id}`} className="font-mono text-xs font-semibold text-intent-primary hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-content-primary">{inv.customer}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                        {overdue > 0 && inv.status === 'OVERDUE' && (
                          <span className="text-xs text-intent-danger font-semibold">{overdue}d overdue</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-content-secondary">{formatDate(inv.issueDate)}</td>
                    <td className={`py-3 px-4 text-xs ${overdue > 0 && inv.balance > 0 ? 'text-intent-danger font-semibold' : 'text-content-secondary'}`}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-content-secondary">{formatCurrency(inv.total)}</td>
                    <td className={`py-3 px-4 text-right font-mono text-xs font-semibold ${inv.balance > 0 ? overdue > 60 ? 'text-intent-danger' : 'text-content-primary' : 'text-intent-success'}`}>
                      {inv.balance > 0 ? formatCurrency(inv.balance) : 'Paid'}
                    </td>
                    <td className="py-3 pr-3">
                      <Link href={`/invoices/${inv.id}`}>
                        <ChevronRight className="h-4 w-4 text-content-muted group-hover:text-content-primary" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-content-muted">
          Total outstanding: <span className="font-mono font-semibold text-content-primary">{formatCurrency(agingSummary.total)}</span>
        </p>
      </div>
    </div>
  );
}
