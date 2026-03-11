'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InvoicesTable } from '@/components/invoices/InvoicesTable';
import { formatCurrency } from '@/lib/utils';
import { useInvoices } from '@/hooks/useInvoices';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';

const STATUS_FILTERS = ['All', 'DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'OVERDUE', 'PAID'];

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data, isLoading } = useInvoices({
    status: statusFilter === 'All' ? undefined : statusFilter,
  });

  const invoices = data?.data ?? [];

  const filtered = search
    ? invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.name.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  const openInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'VOID');
  const totalAr = openInvoices.reduce((s, inv) => s + inv.balance, 0);
  const overdueAmount = invoices.filter(inv => inv.status === 'OVERDUE').reduce((s, inv) => s + inv.balance, 0);
  const draftCount = invoices.filter(i => i.status === 'DRAFT').length;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Invoices & Payments"
        subtitle="AR aging · Invoice management · Payment tracking"
        actions={
          <Button size="sm" className="h-8 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />New Invoice
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* AR summary row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total AR', value: formatCurrency(totalAr), color: 'text-intent-warning' },
            { label: 'Overdue', value: formatCurrency(overdueAmount), color: 'text-intent-danger' },
            { label: 'Open Invoices', value: openInvoices.length, color: 'text-content-primary' },
            { label: 'Draft', value: draftCount, color: 'text-content-muted' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`font-mono text-xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
            <Input
              placeholder="Search invoices..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Filter className="h-4 w-4 text-content-muted" />
          {STATUS_FILTERS.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                statusFilter === status
                  ? 'bg-intent-primary/20 border-intent-primary text-intent-primary'
                  : 'border-surface-hover text-content-muted hover:text-content-primary'
              }`}
            >
              {status === 'All' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
          </div>
        ) : (
          <InvoicesTable invoices={filtered} />
        )}
      </div>
    </div>
  );
}
