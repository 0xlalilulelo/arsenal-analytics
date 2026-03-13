'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCustomers } from '@/hooks/useAnalytics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Loader2 } from 'lucide-react';

const BILLING_TERMS = ['NET_15', 'NET_30', 'NET_45', 'COD', 'PREPAY'] as const;

function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; billingTerms?: string }) => {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create customer');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; email?: string; phone?: string; billingTerms?: string }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update customer');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billingTerms: string;
  accountNumber: string | null;
  _count: { workOrders: number; aircraft: number };
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);

  // Add form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingTerms, setBillingTerms] = useState('NET_30');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBillingTerms, setEditBillingTerms] = useState('NET_30');

  const { data, isLoading } = useCustomers(search || undefined);
  const customers = data?.data ?? [];
  const { mutateAsync: createCustomer, isPending: creating } = useCreateCustomer();
  const { mutateAsync: updateCustomer, isPending: updating } = useUpdateCustomer();

  async function handleAdd() {
    if (!name.trim()) return;
    await createCustomer({ name, email: email || undefined, phone: phone || undefined, billingTerms });
    setName(''); setEmail(''); setPhone(''); setBillingTerms('NET_30');
    setShowAdd(false);
  }

  function openEdit(customer: CustomerRow) {
    setEditCustomer(customer);
    setEditName(customer.name);
    setEditEmail(customer.email ?? '');
    setEditPhone(customer.phone ?? '');
    setEditBillingTerms(customer.billingTerms ?? 'NET_30');
  }

  async function handleEdit() {
    if (!editCustomer || !editName.trim()) return;
    await updateCustomer({
      id: editCustomer.id,
      name: editName,
      email: editEmail || undefined,
      phone: editPhone || undefined,
      billingTerms: editBillingTerms,
    });
    setEditCustomer(null);
  }

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
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Work Orders</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Aircraft</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {isLoading && (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-content-muted mx-auto" /></td></tr>
              )}
              {!isLoading && customers.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-content-muted">No customers found.</td></tr>
              )}
              {customers.map((customer: CustomerRow) => (
                <tr key={customer.id} className="hover:bg-surface-hover/30">
                  <td className="py-3 px-4 font-mono text-xs text-content-muted">{customer.accountNumber ?? '—'}</td>
                  <td className="py-3 px-4 font-medium text-content-primary">{customer.name}</td>
                  <td className="py-3 px-4">
                    {customer.email && <p className="text-xs text-content-secondary">{customer.email}</p>}
                    {customer.phone && <p className="text-xs text-content-muted">{customer.phone}</p>}
                  </td>
                  <td className="py-3 px-4">
                    {customer.billingTerms
                      ? <Badge variant="default">{customer.billingTerms.replace('_', ' ')}</Badge>
                      : <span className="text-xs text-content-muted">—</span>}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    {customer._count?.workOrders > 0
                      ? <span className="text-intent-primary">{customer._count.workOrders}</span>
                      : <span className="text-content-muted">—</span>}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    {customer._count?.aircraft > 0
                      ? <span className="text-content-secondary">{customer._count.aircraft}</span>
                      : <span className="text-content-muted">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(customer)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs">Company / Individual Name *</Label>
              <Input
                className="mt-1.5 h-8 text-sm"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Aviation LLC"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" className="mt-1.5 h-8 text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="billing@co.com" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input type="tel" className="mt-1.5 h-8 text-sm" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Billing Terms</Label>
              <Select value={billingTerms} onValueChange={setBillingTerms}>
                <SelectTrigger className="mt-1.5 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_TERMS.map(t => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleAdd} disabled={!name.trim() || creating}>
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={(v) => !v && setEditCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Customer — {editCustomer?.accountNumber}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs">Company / Individual Name *</Label>
              <Input
                className="mt-1.5 h-8 text-sm"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" className="mt-1.5 h-8 text-sm" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input type="tel" className="mt-1.5 h-8 text-sm" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Billing Terms</Label>
              <Select value={editBillingTerms} onValueChange={setEditBillingTerms}>
                <SelectTrigger className="mt-1.5 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_TERMS.map(t => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditCustomer(null)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleEdit} disabled={!editName.trim() || updating}>
              {updating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
