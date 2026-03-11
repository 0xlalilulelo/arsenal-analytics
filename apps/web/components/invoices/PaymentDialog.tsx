'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

const PAYMENT_METHODS = [
  { value: 'CHECK', label: 'Check' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'ACH', label: 'ACH / Bank Transfer' },
  { value: 'WIRE', label: 'Wire Transfer' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  balanceDue: number;
  onSuccess?: () => void;
};

export function PaymentDialog({ open, onClose, invoiceNumber, balanceDue, onSuccess }: Props) {
  const [amount, setAmount] = useState(balanceDue.toFixed(2));
  const [method, setMethod] = useState('CHECK');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    // In production: POST /api/invoices/[id]/payments
    await new Promise(r => setTimeout(r, 500));
    setIsSubmitting(false);
    onSuccess?.();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs">Amount</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-6 h-8 text-sm"
                required
              />
            </div>
            <p className="text-xs text-content-muted mt-1">
              Balance due: <span className="font-mono text-intent-warning">{formatCurrency(balanceDue)}</span>
            </p>
          </div>

          <div>
            <Label className="text-xs">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1.5 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">
              {method === 'CHECK' ? 'Check Number' : method === 'ACH' ? 'ACH Trace #' : 'Reference'}
            </Label>
            <Input
              className="mt-1.5 h-8 text-sm"
              placeholder={method === 'CHECK' ? '#1234' : 'Optional'}
              value={reference}
              onChange={e => setReference(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              className="mt-1.5 h-8 text-sm"
              placeholder="Internal memo..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-8 text-xs" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : `Record ${formatCurrency(parseFloat(amount) || 0)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
