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
import { getShopSuppliesCharge } from '@mro/core';
import { useCreateWorkOrder } from '@/hooks/useWorkOrders';
import { useCustomers } from '@/hooks/useAnalytics';
import { ChevronLeft, Plus, Trash2, AlertCircle } from 'lucide-react';

const schema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  nNumber: z.string().min(3, 'N-number required').max(10),
  type: z.enum(['INSPECTION', 'SCHEDULED', 'UNSCHEDULED', 'AOG']),
  billingModel: z.enum(['TIME_AND_MATERIALS', 'FLAT_RATE', 'HYBRID', 'NOT_TO_EXCEED', 'COST_PLUS']),
  nteAmount: z.coerce.number().positive().optional(),
  depositRequired: z.coerce.number().min(0).optional(),
  depositCollected: z.coerce.number().min(0).optional(),
  estimatedClose: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LineItem { id: string; description: string; estHours: number; laborRate: number }

const BILLING_MODELS = [
  { value: 'TIME_AND_MATERIALS', label: 'Time & Materials (T&M)' },
  { value: 'FLAT_RATE', label: 'Flat Rate' },
  { value: 'HYBRID', label: 'Hybrid (Flat + T&M)' },
  { value: 'NOT_TO_EXCEED', label: 'Not to Exceed (NTE)' },
  { value: 'COST_PLUS', label: 'Cost Plus' },
];

const WO_TYPES = [
  { value: 'INSPECTION', label: 'Annual / 100hr Inspection' },
  { value: 'SCHEDULED', label: 'Scheduled Maintenance' },
  { value: 'UNSCHEDULED', label: 'Unscheduled Repair' },
  { value: 'AOG', label: 'AOG — Aircraft on Ground' },
];

export default function NewWorkOrderPage() {
  const router = useRouter();
  const { mutateAsync: createWo, isPending, error: mutationError } = useCreateWorkOrder();
  const { data: customersData } = useCustomers();
  const customers = customersData?.data ?? [];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'INSPECTION', billingModel: 'TIME_AND_MATERIALS' },
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', estHours: 0, laborRate: 115 },
  ]);

  const woType = watch('type');
  const billingModel = watch('billingModel');

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: String(Date.now()), description: '', estHours: 0, laborRate: woType === 'AOG' ? 172.5 : 115 }]);
  };

  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(li => li.id !== id));
  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) =>
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));

  const totalLaborEst = lineItems.reduce((s, li) => s + li.estHours * li.laborRate, 0);
  const shopSupplies = getShopSuppliesCharge(totalLaborEst);

  async function onSubmit(values: FormValues) {
    const result = await createWo({
      ...values,
      lineItems: lineItems.filter(li => li.description.trim()),
    });
    router.push(`/work-orders/${result.data.id}`);
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="New Work Order"
        actions={
          <Link href="/work-orders">
            <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />Back
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
          {/* Type + Billing */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Work Order Type</CardTitle></CardHeader>
              <CardContent>
                <Select defaultValue="INSPECTION" onValueChange={v => setValue('type', v as FormValues['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {woType === 'AOG' && (
                  <p className="mt-2 text-xs text-intent-warning flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> AOG rate: $172.50/hr (1.5×)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Billing Model</CardTitle></CardHeader>
              <CardContent>
                <Select defaultValue="TIME_AND_MATERIALS" onValueChange={v => setValue('billingModel', v as FormValues['billingModel'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* NTE Cap (conditional) */}
          {billingModel === 'NOT_TO_EXCEED' && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Not-to-Exceed Cap</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">NTE Amount *</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-xs">$</span>
                    <Input type="number" step="0.01" min="0" {...register('nteAmount')}
                      className="h-8 pl-6 font-mono text-sm" placeholder="0.00" />
                  </div>
                  {errors.nteAmount && <p className="text-xs text-intent-danger mt-1">{errors.nteAmount.message}</p>}
                  <p className="text-xs text-content-muted mt-1">Work will not exceed this amount without re-authorization</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deposit */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Deposit</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Deposit Required</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-xs">$</span>
                  <Input type="number" step="0.01" min="0" {...register('depositRequired')}
                    className="h-8 pl-6 font-mono text-sm" placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Deposit Collected</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-xs">$</span>
                  <Input type="number" step="0.01" min="0" {...register('depositCollected')}
                    className="h-8 pl-6 font-mono text-sm" placeholder="0.00" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer + Aircraft */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Customer & Aircraft</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Customer *</Label>
                <Select onValueChange={v => setValue('customerId', v)}>
                  <SelectTrigger className="mt-1.5 h-8 text-sm">
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: { id: string; name: string; accountNumber: string | null }) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.accountNumber ? `(${c.accountNumber})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-intent-danger mt-1">{errors.customerId.message}</p>}
              </div>

              <div>
                <Label className="text-xs">Aircraft N-Number *</Label>
                <Input {...register('nNumber')} className="mt-1.5 h-8 font-mono uppercase text-sm" placeholder="N12345" />
                {errors.nNumber && <p className="text-xs text-intent-danger mt-1">{errors.nNumber.message}</p>}
              </div>

              <div>
                <Label className="text-xs">Est. Completion Date</Label>
                <Input type="date" {...register('estimatedClose')} className="mt-1.5 h-8 text-sm" />
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea {...register('notes')} rows={2} className="mt-1.5 text-sm" placeholder="Special instructions, scope summary…" />
              </div>
            </CardContent>
          </Card>

          {/* Task Cards */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Task Cards / Line Items</CardTitle>
              <Button type="button" onClick={addLineItem} variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />Add Task
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((li) => (
                <div key={li.id} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-surface-panel">
                  <div className="col-span-7">
                    <Label className="text-xs mb-1 block">Description</Label>
                    <Input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                      placeholder="Annual inspection — airframe per FAR 43…" className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Est. Hours</Label>
                    <Input type="number" value={li.estHours} step="0.25" min="0"
                      onChange={e => updateLineItem(li.id, 'estHours', parseFloat(e.target.value) || 0)}
                      className="h-8 font-mono text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Rate $/hr</Label>
                    <Input type="number" value={li.laborRate}
                      onChange={e => updateLineItem(li.id, 'laborRate', parseFloat(e.target.value) || 0)}
                      className="h-8 font-mono text-xs" />
                  </div>
                  <div className="col-span-1 flex items-end pb-0.5">
                    {lineItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-content-muted hover:text-intent-danger"
                        onClick={() => removeLineItem(li.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="rounded-lg bg-surface-panel p-4 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-content-muted">Labor Subtotal</span>
                  <span className="font-mono text-content-secondary">{formatCurrency(totalLaborEst)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-content-muted">Shop Supplies (3.5%)</span>
                  <span className="font-mono text-content-muted">{formatCurrency(shopSupplies)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-surface-hover pt-1.5">
                  <span className="text-content-primary">Estimated Total</span>
                  <span className="font-mono text-intent-gold">{formatCurrency(totalLaborEst + shopSupplies)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {mutationError && (
            <p className="text-sm text-intent-danger">{(mutationError as Error).message}</p>
          )}

          <div className="flex justify-end gap-3 pb-6">
            <Link href="/work-orders">
              <Button type="button" variant="outline" className="h-9 text-sm">Cancel</Button>
            </Link>
            <Button type="submit" className="h-9 text-sm px-6" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create Work Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
