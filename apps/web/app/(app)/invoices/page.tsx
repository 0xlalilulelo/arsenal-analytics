'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InvoicesTable, type InvoiceRow } from '@/components/invoices/InvoicesTable';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Filter } from 'lucide-react';

const DEMO_INVOICES: InvoiceRow[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    customer: { name: 'Robert Harrington', accountNumber: 'C-0001' },
    workOrder: { woNumber: 'WO-2026-0041' },
    status: 'SENT',
    invoiceDate: '2026-01-20',
    dueDate: '2026-02-19',
    totalAmount: 2187.50,
    paidAmount: 0,
    balanceDue: 2187.50,
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-0002',
    customer: { name: 'Skyline Charter LLC', accountNumber: 'C-0002' },
    workOrder: { woNumber: 'WO-2026-0039' },
    status: 'PARTIALLY_PAID',
    invoiceDate: '2026-01-15',
    dueDate: '2026-01-30',
    totalAmount: 5840.00,
    paidAmount: 2000.00,
    balanceDue: 3840.00,
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2025-0092',
    customer: { name: 'Pacific Aero Club', accountNumber: 'C-0003' },
    workOrder: null,
    status: 'OVERDUE',
    invoiceDate: '2025-11-01',
    dueDate: '2025-12-01',
    totalAmount: 892.50,
    paidAmount: 0,
    balanceDue: 892.50,
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2025-0089',
    customer: { name: 'Robert Harrington', accountNumber: 'C-0001' },
    workOrder: { woNumber: 'WO-2025-0035' },
    status: 'PAID',
    invoiceDate: '2025-12-20',
    dueDate: '2026-01-19',
    totalAmount: 1875.00,
    paidAmount: 1875.00,
    balanceDue: 0,
  },
  {
    id: 'inv-5',
    invoiceNumber: 'INV-2026-0003',
    customer: { name: 'Skyline Charter LLC', accountNumber: 'C-0002' },
    workOrder: { woNumber: 'WO-2026-0044' },
    status: 'DRAFT',
    invoiceDate: null,
    dueDate: null,
    totalAmount: 3200.00,
    paidAmount: 0,
    balanceDue: 3200.00,
  },
];

const STATUS_FILTERS = ['All', 'DRAFT', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'];

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = DEMO_INVOICES.filter(inv => {
    const matchesSearch =
      !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // AR aging summary
  const openInvoices = DEMO_INVOICES.filter(inv => inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'VOIDED');
  const totalAr = openInvoices.reduce((s, inv) => s + inv.balanceDue, 0);
  const overdueAmount = DEMO_INVOICES.filter(inv => inv.status === 'OVERDUE').reduce((s, inv) => s + inv.balanceDue, 0);

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
            { label: 'Draft', value: DEMO_INVOICES.filter(i => i.status === 'DRAFT').length, color: 'text-content-muted' },
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

        <InvoicesTable invoices={filtered} />
      </div>
    </div>
  );
}
