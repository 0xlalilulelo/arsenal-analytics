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
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { getMarkupBreakdown } from '@mro/core';
import { useCreateQuote } from '@/hooks/useQuotes';
import { useCustomers, useTechnicians } from '@/hooks/useAnalytics';
import { ChevronLeft, Plus, Trash2, AlertCircle, Calculator } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  LABOR:         'Labor',
  PARTS:         'Parts',
  SUBCONTRACT:   'Subcontract',
  SHOP_SUPPLIES: 'Shop Supplies',
  FREIGHT:       'Freight',
  OTHER:         'Other',
};

const schema = z.object({
  customerId:   z.string().min(1, 'Customer is required'),
  nNumber:      z.string().optional(),
  billingModel: z.enum(['TIME_AND_MATERIALS', 'FLAT_RATE', 'HYBRID', 'NOT_TO_EXCEED', 'COST_PLUS']),
  nteAmount:    z.coerce.number().optional(),
  depositPct:   z.coerce.number().min(0).max(1).default(0.25),
  validDays:    z.coerce.number().min(1).max(365).default(30),
  notes:        z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type LineItem = {
  id: string;
  category: string;
  description: string;
  qty: number;
  unitPrice: number;
};

const LABOR_RATE = 115.00;

export default function NewQuotePage() {
  const router = useRouter();
  const { data: customersData } = useCustomers();
  const customers = customersData?.data ?? [];
  const { mutateAsync: createQuote, isPending } = useCreateQuote();

  const [lines, setLines] = useState<LineItem[]>([
    { id: '1', category: 'LABOR', description: '', qty: 1, unitPrice: LABOR_RATE },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { billingModel: 'TIME_AND_MATERIALS', depositPct: 0.25, validDays: 30 },
  });

  const billingModel = watch('billingModel');
  const depositPct = watch('depositPct') ?? 0.25;

  // Computed totals
  const laborTotal = lines.filter(l => l.category === 'LABOR').reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const partsTotal = lines.filter(l => l.category === 'PARTS').reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const otherTotal = lines.filter(l => !['LABOR', 'PARTS'].includes(l.category)).reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const depositAmount = subtotal * depositPct;

  function addLine(category = 'LABOR') {
    const defaultPrice = category === 'LABOR' ? LABOR_RATE : 0;
    setLines(prev => [...prev, {
      id: String(Date.now()),
      category,
      description: '',
      qty: 1,
      unitPrice: defaultPrice,
    }]);
  }

  function updateLine(id: string, field: keyof LineItem, value: string | number) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }

  function removeLine(id: string) {
    setLines(prev => prev.filter(l => l.id !== id));
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const validLines = lines.filter(l => l.description.trim());
    if (validLines.length === 0) {
      setFormError('Add at least one line item with a description.');
      return;
    }

    try {
      // Resolve aircraft by N-number if provided
      const result = await createQuote({
        customerId: values.customerId,
        billingModel: values.billingModel,
        nteAmount: values.billingModel === 'NOT_TO_EXCEED' ? values.nteAmount : undefined,
        depositPct: values.depositPct,
        validDays: values.validDays,
        notes: values.notes,
        lines: validLines.map(l => ({
          category: l.category,
          description: l.description,
          qty: l.qty,
          unitPrice: l.unitPrice,
        })),
      });
      router.push(`/quotes/${result.data.id}`);
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create quote');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="New Quote"
        subtitle="Build a cost estimate for customer authorization"
        actions={
          <Link href="/quotes">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />Back
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">

          {/* Header info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Customer & Aircraft</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer *</Label>
                  <select
                    {...register('customerId')}
                    className="w-full h-9 rounded-md border border-input bg-surface-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-intent-primary"
                  >
                    <option value="">Select customer…</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.customerId && <p className="text-xs text-intent-danger">{errors.customerId.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Aircraft N-Number (optional)</Label>
                  <Input
                    {...register('nNumber')}
                    placeholder="N12345"
                    className="h-9 text-sm font-mono uppercase"
                    onChange={e => setValue('nNumber', e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-content-muted">Will be looked up or created if not found.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Billing & Terms</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Billing Model</Label>
                  <Select
                    value={billingModel}
                    onValueChange={(v: string) => setValue('billingModel', v as FormValues['billingModel'])}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIME_AND_MATERIALS">Time & Materials</SelectItem>
                      <SelectItem value="FLAT_RATE">Flat Rate</SelectItem>
                      <SelectItem value="NOT_TO_EXCEED">Not to Exceed (NTE)</SelectItem>
                      <SelectItem value="COST_PLUS">Cost Plus</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {billingModel === 'NOT_TO_EXCEED' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">NTE Cap ($)</Label>
                    <Input
                      {...register('nteAmount')}
                      type="number"
                      step="0.01"
                      placeholder="8500.00"
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Deposit Required (%)</Label>
                    <div className="relative">
                      <Input
                        {...register('depositPct')}
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        defaultValue="0.25"
                        className="h-9 text-sm font-mono pr-8"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-content-muted">
                        {Math.round(depositPct * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valid For (days)</Label>
                    <Input
                      {...register('validDays')}
                      type="number"
                      defaultValue="30"
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Line items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Line Items</CardTitle>
                <div className="flex gap-2">
                  {['LABOR', 'PARTS', 'OTHER'].map(cat => (
                    <Button
                      key={cat}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => addLine(cat === 'OTHER' ? 'OTHER' : cat)}
                    >
                      <Plus className="h-3 w-3" />{cat === 'OTHER' ? 'Other' : cat === 'LABOR' ? 'Labor' : 'Part'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[100px_1fr_80px_120px_32px] gap-2 text-xs text-content-muted px-1">
                <span>Category</span>
                <span>Description</span>
                <span>Qty / Hrs</span>
                <span>Unit Price</span>
                <span />
              </div>

              {lines.map(line => (
                <div key={line.id} className="grid grid-cols-[100px_1fr_80px_120px_32px] gap-2 items-center">
                  <select
                    value={line.category}
                    onChange={e => updateLine(line.id, 'category', e.target.value)}
                    className="h-8 rounded border border-input bg-surface-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-intent-primary"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>

                  <Input
                    value={line.description}
                    onChange={e => updateLine(line.id, 'description', e.target.value)}
                    placeholder={line.category === 'LABOR' ? 'e.g. Annual inspection — 100hr AMP' : 'Description…'}
                    className="h-8 text-xs"
                  />

                  <Input
                    type="number"
                    step={line.category === 'LABOR' ? '0.25' : '1'}
                    min="0"
                    value={line.qty}
                    onChange={e => updateLine(line.id, 'qty', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                  />

                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-content-muted">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPrice}
                      onChange={e => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono pl-5"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="flex items-center justify-center h-8 w-8 rounded text-content-muted hover:text-intent-danger transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {lines.length === 0 && (
                <p className="text-xs text-content-muted text-center py-4">
                  No line items yet. Use the buttons above to add labor, parts, or other charges.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Totals summary */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-content-muted">Labor</span>
                    <span className="font-mono text-content-primary">{formatCurrency(laborTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content-muted">Parts</span>
                    <span className="font-mono text-content-primary">{formatCurrency(partsTotal)}</span>
                  </div>
                  {otherTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-content-muted">Other</span>
                      <span className="font-mono text-content-primary">{formatCurrency(otherTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-surface-hover pt-2 font-medium">
                    <span className="text-content-primary">Subtotal</span>
                    <span className="font-mono text-content-primary">{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-content-muted">Deposit ({Math.round(depositPct * 100)}%)</span>
                    <span className="font-mono text-intent-gold font-semibold">{formatCurrency(depositAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content-muted">Balance on completion</span>
                    <span className="font-mono text-content-primary">{formatCurrency(subtotal - depositAmount)}</span>
                  </div>
                  {billingModel === 'NOT_TO_EXCEED' && watch('nteAmount') && (
                    <div className="flex justify-between items-center">
                      <span className="text-content-muted">NTE Cap</span>
                      <Badge variant={subtotal > (watch('nteAmount') ?? 0) ? 'aog' : 'inspection'} className="text-xs font-mono">
                        {formatCurrency(watch('nteAmount') ?? 0)}
                        {subtotal > (watch('nteAmount') ?? 0) ? ' ⚠ exceeded' : ' ✓ within'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Notes (visible on quote)</Label>
                <Textarea
                  {...register('notes')}
                  placeholder="Any scope clarifications, exclusions, or conditions the customer should know…"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-intent-danger bg-intent-danger/10 rounded-lg px-4 py-3 border border-intent-danger/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pb-6">
            <Link href="/quotes">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isPending} className="gap-2 min-w-32">
              {isPending ? 'Creating…' : `Create Quote — ${formatCurrency(subtotal)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
