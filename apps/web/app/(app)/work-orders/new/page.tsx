'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { getShopSuppliesCharge } from '@mro/core';

interface LineItem {
  id: string;
  taskNumber: string;
  description: string;
  estHours: number;
  laborRate: number;
}

const BILLING_MODELS = [
  { value: 'TIME_AND_MATERIALS', label: 'Time & Materials (T&M)' },
  { value: 'FLAT_RATE', label: 'Flat Rate' },
  { value: 'HYBRID', label: 'Hybrid (Flat rate + T&M)' },
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
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', taskNumber: 'TASK-001', description: '', estHours: 0, laborRate: 115 },
  ]);
  const [billingModel, setBillingModel] = useState('TIME_AND_MATERIALS');
  const [woType, setWoType] = useState('INSPECTION');

  const addLineItem = () => {
    const next = lineItems.length + 1;
    setLineItems(prev => [...prev, {
      id: String(next),
      taskNumber: `TASK-${String(next).padStart(3, '0')}`,
      description: '',
      estHours: 0,
      laborRate: woType === 'AOG' ? 172.50 : 115,
    }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(li => li.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  };

  const totalEstLaborHours = lineItems.reduce((s, li) => s + Number(li.estHours), 0);
  const totalEstLabor = lineItems.reduce((s, li) => s + Number(li.estHours) * Number(li.laborRate), 0);
  const shopSupplies = getShopSuppliesCharge(totalEstLabor);
  const estimatedTotal = totalEstLabor + shopSupplies;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="New Work Order / Quote"
        actions={
          <Link href="/work-orders">
            <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Type + Billing */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Work Order Type</CardTitle></CardHeader>
              <CardContent>
                <Select value={woType} onValueChange={setWoType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WO_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {woType === 'AOG' && (
                  <p className="mt-2 text-xs text-intent-danger flex items-center gap-1">
                    AOG rate: $172.50/hr (1.5× standard)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Billing Model</CardTitle></CardHeader>
              <CardContent>
                <Select value={billingModel} onValueChange={setBillingModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_MODELS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Customer + Aircraft */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Customer & Aircraft</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cust-1">Robert Harrington</SelectItem>
                    <SelectItem value="cust-2">Apex Air Charter LLC</SelectItem>
                    <SelectItem value="cust-3">Patricia Okonkwo</SelectItem>
                    <SelectItem value="cust-4">Hill Country Flying Club</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aircraft">Aircraft (N-Number)</Label>
                <Input id="aircraft" placeholder="N12345" className="font-mono uppercase" />
              </div>

              <div className="space-y-2">
                <Label>Est. Completion Date</Label>
                <Input type="date" />
              </div>

              <div className="space-y-2">
                <Label>NTE Amount (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                  <Input className="pl-6 font-mono" placeholder="5,000.00" />
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Special instructions, scope summary..." rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Task Cards / Line Items */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Task Cards / Line Items</CardTitle>
              <Button onClick={addLineItem} variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((li, i) => (
                <div key={li.id} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-surface-panel">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Task #</Label>
                    <Input
                      value={li.taskNumber}
                      onChange={e => updateLineItem(li.id, 'taskNumber', e.target.value)}
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="col-span-6">
                    <Label className="text-xs mb-1 block">Description</Label>
                    <Input
                      value={li.description}
                      onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                      placeholder="Annual inspection — airframe per FAR 43..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Est. Hours</Label>
                    <Input
                      type="number"
                      value={li.estHours}
                      onChange={e => updateLineItem(li.id, 'estHours', parseFloat(e.target.value) || 0)}
                      step="0.25"
                      min="0"
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs mb-1 block">Rate</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-content-muted text-xs">$</span>
                      <Input
                        type="number"
                        value={li.laborRate}
                        onChange={e => updateLineItem(li.id, 'laborRate', parseFloat(e.target.value) || 0)}
                        className="h-8 pl-4 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end justify-end pb-0.5">
                    {lineItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-content-muted hover:text-intent-danger"
                        onClick={() => removeLineItem(li.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="col-span-12 text-right">
                    <span className="font-mono text-xs text-content-muted">
                      = {formatCurrency(Number(li.estHours) * Number(li.laborRate))}
                    </span>
                  </div>
                </div>
              ))}

              {/* Estimate summary */}
              <div className="mt-4 rounded-lg bg-surface-panel p-4 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-content-muted">Total Est. Hours</span>
                  <span className="font-mono text-content-secondary">{totalEstLaborHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-content-muted">Labor Subtotal</span>
                  <span className="font-mono text-content-secondary">{formatCurrency(totalEstLabor)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-content-muted">Shop Supplies (3.5%)</span>
                  <span className="font-mono text-content-muted">{formatCurrency(shopSupplies)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-surface-hover pt-1.5">
                  <span className="text-content-primary">Estimate Total</span>
                  <span className="font-mono text-intent-gold">{formatCurrency(estimatedTotal)}</span>
                </div>
                <p className="text-xs text-content-muted">* Parts and subcontract costs not yet included. Final invoice may vary ±30%.</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/work-orders">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button variant="secondary">Save as Draft</Button>
            <Button>Create Work Order</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
