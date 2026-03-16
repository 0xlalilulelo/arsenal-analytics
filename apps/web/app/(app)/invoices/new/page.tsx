'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useAnalytics';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';

const LINE_CATEGORIES = [
  { value: 'LABOR', label: 'Labor' },
  { value: 'PARTS', label: 'Parts' },
  { value: 'SHOP_SUPPLIES', label: 'Shop Supplies' },
  { value: 'FREIGHT', label: 'Freight' },
  { value: 'HANDLING', label: 'Handling' },
  { value: 'SUBCONTRACT', label: 'Subcontract' },
  { value: 'OTHER', label: 'Other' },
];

const schema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  taxRate: z.coerce.number().min(0).max(1).default(0),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LineItem {
  id: string;
  category: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxable: boolean;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { mutateAsync: createInvoice, isPending, error: mutationError } = useCreateInvoice();
  const { data: customersData } = useCustomers();
  const customers = customersData?.data ?? [];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { taxRate: 0 },
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', category: 'LABOR', description: '', qty: 1, unitPrice: 0, taxable: false },
  ]);

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: String(Date.now()), category: 'OTHER', description: '', qty: 1, unitPrice: 0, taxable: true }]);
  };

  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(li => li.id !== id));

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number | boolean) =>
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));

  const subtotal = lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);

  async function onSubmit(values: FormValues) {
    const validLines = lineItems.filter(li => li.description.trim());
    if (validLines.length === 0) return;

    const result = await createInvoice({
      customerId: values.customerId,
      dueDate: values.dueDate,
      taxRate: values.taxRate,
      notes: values.notes,
      lineItems: validLines.map(li => ({
        category: li.category,
        description: li.description,
        qty: li.qty,
        unitPrice: li.unitPrice,
        taxable: li.taxable,
      })),
    });

    router.push(`/invoices/${result.data.id}`);
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="New Invoice"
        actions={
          <Link href="/invoices">
            <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />Back
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
          {/* Header fields */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Invoice Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">Customer *</Label>
                <Select onValueChange={v => setValue('customerId', v)}>
                  <SelectTrigger className="mt-1.5 h-8 text-sm">
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: { id: string; name: string; accountNumber: string | null }) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.accountNumber ? ` (${c.accountNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-intent-danger mt-1">{errors.customerId.message}</p>}
              </div>

              <div>
                <Label className="text-xs">Due Date *</Label>
                <Input type="date" {...register('dueDate')} className="mt-1.5 h-8 text-sm" />
                {errors.dueDate && <p className="text-xs text-intent-danger mt-1">{errors.dueDate.message}</p>}
              </div>

              <div>
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" step="0.001" min="0" max="100" {...register('taxRate', {
                  setValueAs: v => parseFloat(v) / 100 || 0,
                })} className="mt-1.5 h-8 font-mono text-sm" placeholder="0" />
                <p className="text-xs text-content-muted mt-1">Enter as percentage, e.g. 8.5 for 8.5%</p>
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea {...register('notes')} rows={2} className="mt-1.5 text-sm"
                  placeholder="Payment instructions, terms, thank-you note…" />
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Line Items</CardTitle>
              <Button type="button" onClick={addLineItem} variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />Add Line
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((li) => (
                <div key={li.id} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-surface-panel">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Category</Label>
                    <Select value={li.category} onValueChange={v => updateLineItem(li.id, 'category', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs mb-1 block">Description *</Label>
                    <Input value={li.description}
                      onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                      placeholder="Service description…" className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Qty</Label>
                    <Input type="number" value={li.qty} step="0.25" min="0"
                      onChange={e => updateLineItem(li.id, 'qty', parseFloat(e.target.value) || 0)}
                      className="h-8 font-mono text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Unit Price</Label>
                    <Input type="number" value={li.unitPrice} step="0.01" min="0"
                      onChange={e => updateLineItem(li.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="h-8 font-mono text-xs" />
                  </div>
                  <div className="col-span-1 flex items-end pb-0.5">
                    {lineItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon"
                        className="h-8 w-8 text-content-muted hover:text-intent-danger"
                        onClick={() => removeLineItem(li.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="col-span-12 flex justify-between text-xs text-content-muted px-0.5 -mt-1">
                    <span className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={li.taxable}
                          onChange={e => updateLineItem(li.id, 'taxable', e.target.checked)}
                          className="h-3 w-3" />
                        Taxable
                      </label>
                    </span>
                    <span className="font-mono">{formatCurrency(li.qty * li.unitPrice)}</span>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="rounded-lg bg-surface-panel p-4 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-content-muted">Subtotal</span>
                  <span className="font-mono text-content-secondary">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-surface-hover pt-1.5">
                  <span className="text-content-primary">Total (before tax)</span>
                  <span className="font-mono text-intent-gold">{formatCurrency(subtotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {mutationError && (
            <p className="text-sm text-intent-danger">{(mutationError as Error).message}</p>
          )}

          <div className="flex justify-end gap-3 pb-6">
            <Link href="/invoices">
              <Button type="button" variant="outline" className="h-9 text-sm">Cancel</Button>
            </Link>
            <Button type="submit" className="h-9 text-sm px-6" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
