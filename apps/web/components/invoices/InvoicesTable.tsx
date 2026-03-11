'use client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { classifyAgingBucket } from '@mro/core';

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customer: { name: string; accountNumber: string | null };
  workOrder?: { number: string } | null;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  total: number;
  amountPaid: number;
  balance: number;
};

const STATUS_VARIANT: Record<string, 'complete' | 'in-progress' | 'open' | 'aog' | 'default'> = {
  PAID: 'complete',
  PARTIAL: 'in-progress',
  SENT: 'default',
  VIEWED: 'default',
  OVERDUE: 'aog',
  DRAFT: 'open',
  VOID: 'open',
};

const AGING_COLORS: Record<string, string> = {
  CURRENT: 'text-intent-success',
  '1_30': 'text-intent-warning',
  '31_60': 'text-intent-warning',
  '61_90': 'text-intent-danger',
  '90_PLUS': 'text-intent-danger',
};

function AgingBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;
  const bucket = classifyAgingBucket(new Date(dueDate), new Date());
  const label =
    bucket === 'CURRENT' ? 'Current' :
    bucket === '1_30' ? '1–30d' :
    bucket === '31_60' ? '31–60d' :
    bucket === '61_90' ? '61–90d' : '90+d';
  return (
    <span className={`text-xs font-mono font-semibold ${AGING_COLORS[bucket]}`}>{label}</span>
  );
}

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-surface-hover p-12 text-center">
        <p className="text-sm text-content-muted">No invoices found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-hover overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-hover bg-surface-panel">
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Invoice #</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Customer</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Work Order</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Status</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Invoice Date</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Due / Aging</th>
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Total</th>
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Paid</th>
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Balance Due</th>
            <th className="py-2.5 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-hover">
          {invoices.map(inv => (
            <tr key={inv.id} className="hover:bg-surface-hover/30">
              <td className="py-3 px-4 font-mono text-xs text-content-primary font-semibold">
                {inv.invoiceNumber}
              </td>
              <td className="py-3 px-4">
                <p className="text-xs text-content-primary">{inv.customer.name}</p>
                <p className="text-xs text-content-muted">{inv.customer.accountNumber}</p>
              </td>
              <td className="py-3 px-4 font-mono text-xs text-content-secondary">
                {inv.workOrder?.number ?? '—'}
              </td>
              <td className="py-3 px-4">
                <Badge variant={STATUS_VARIANT[inv.status] ?? 'default'}>
                  {inv.status.replace('_', ' ')}
                </Badge>
              </td>
              <td className="py-3 px-4 text-xs text-content-secondary">
                {inv.issueDate ? formatDate(inv.issueDate) : '—'}
              </td>
              <td className="py-3 px-4 text-xs">
                <p className="text-content-secondary">
                  {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                </p>
                {inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'VOID' && (
                  <AgingBadge dueDate={inv.dueDate} />
                )}
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs text-content-primary">
                {formatCurrency(inv.total)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs text-intent-success">
                {inv.amountPaid > 0 ? formatCurrency(inv.amountPaid) : '—'}
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs font-semibold">
                <span className={inv.balance > 0 ? 'text-intent-warning' : 'text-content-muted'}>
                  {inv.balance > 0 ? formatCurrency(inv.balance) : '—'}
                </span>
              </td>
              <td className="py-3 px-4">
                <Link href={`/invoices/${inv.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
