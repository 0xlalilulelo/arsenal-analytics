'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Pencil } from 'lucide-react';

const DEMO_CUSTOMERS = [
  {
    id: 'cust-1',
    accountNumber: 'C-0001',
    name: 'Robert Harrington',
    email: 'rharrington@example.com',
    phone: '(555) 210-4482',
    billingTerms: 'NET30',
    openInvoices: 1,
    openWos: 2,
    isActive: true,
  },
  {
    id: 'cust-2',
    accountNumber: 'C-0002',
    name: 'Skyline Charter LLC',
    email: 'ops@skylinecharter.com',
    phone: '(555) 881-2234',
    billingTerms: 'NET15',
    openInvoices: 3,
    openWos: 1,
    isActive: true,
  },
  {
    id: 'cust-3',
    accountNumber: 'C-0003',
    name: 'Pacific Aero Club',
    email: 'manager@pacificaero.org',
    phone: '(555) 447-7112',
    billingTerms: 'NET30',
    openInvoices: 0,
    openWos: 1,
    isActive: true,
  },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = DEMO_CUSTOMERS.filter(
    c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.accountNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Customers"
        subtitle="Customer accounts and billing configuration"
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" />Add Customer
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
          <Input
            placeholder="Search customers..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-surface-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-hover bg-surface-panel">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Account</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Name</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Contact</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Terms</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Open WOs</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Open Invoices</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {filtered.map(customer => (
                <tr key={customer.id} className="hover:bg-surface-hover/30">
                  <td className="py-3 px-4 font-mono text-xs text-content-muted">{customer.accountNumber}</td>
                  <td className="py-3 px-4 font-medium text-content-primary">{customer.name}</td>
                  <td className="py-3 px-4">
                    <p className="text-xs text-content-secondary">{customer.email}</p>
                    <p className="text-xs text-content-muted">{customer.phone}</p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="default">{customer.billingTerms}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    {customer.openWos > 0 ? (
                      <span className="text-intent-primary">{customer.openWos}</span>
                    ) : (
                      <span className="text-content-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    {customer.openInvoices > 0 ? (
                      <span className="text-intent-warning">{customer.openInvoices}</span>
                    ) : (
                      <span className="text-content-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className="text-xs">Company / Individual Name</Label>
              <Input className="mt-1.5 h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input type="tel" className="mt-1.5 h-8 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs">Add Customer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
