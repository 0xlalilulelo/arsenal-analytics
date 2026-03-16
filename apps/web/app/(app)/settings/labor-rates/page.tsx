'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Info, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';

type LaborRate = {
  id: string;
  name: string;
  rate: number;
  multiplier: number;
  isDefault: boolean;
};

function useLaborRates() {
  return useQuery<{ data: LaborRate[] }>({
    queryKey: ['settings-labor-rates'],
    queryFn: () => fetch('/api/settings/labor-rates').then(r => r.json()),
  });
}

export default function LaborRatesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useLaborRates();
  const rates = data?.data ?? [];
  const defaultRate = rates.find(r => r.isDefault);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<LaborRate | null>(null);
  const [rateName, setRateName] = useState('');
  const [rateValue, setRateValue] = useState('');
  const [multiplierValue, setMultiplierValue] = useState('1.0');

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openCreate() {
    setEditingRate(null);
    setRateName('');
    setRateValue('');
    setMultiplierValue('1.0');
    setDialogOpen(true);
  }

  function openEdit(r: LaborRate) {
    setEditingRate(r);
    setRateName(r.name);
    setRateValue(r.rate.toFixed(2));
    setMultiplierValue(r.multiplier.toFixed(2));
    setDialogOpen(true);
  }

  const { mutateAsync: createRate, isPending: creating } = useMutation({
    mutationFn: (body: { name: string; rate: number; multiplier: number }) =>
      fetch('/api/settings/labor-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async r => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-labor-rates'] }); setDialogOpen(false); },
  });

  const { mutateAsync: updateRate, isPending: updating } = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; rate?: number; multiplier?: number }) =>
      fetch(`/api/settings/labor-rates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async r => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-labor-rates'] }); setDialogOpen(false); },
  });

  const { mutateAsync: deleteRate, isPending: deleting } = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/settings/labor-rates/${id}`, { method: 'DELETE' })
        .then(async r => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-labor-rates'] }); setDeleteId(null); },
  });

  async function handleSave() {
    const rate = parseFloat(rateValue);
    const multiplier = parseFloat(multiplierValue);
    if (!rateName.trim() || !rate || rate <= 0) return;

    if (editingRate) {
      await updateRate({ id: editingRate.id, name: rateName, rate, multiplier });
    } else {
      await createRate({ name: rateName, rate, multiplier });
    }
  }

  const aogRate = defaultRate ? defaultRate.rate * defaultRate.multiplier : 0;
  const saving = creating || updating;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Labor Rates"
        subtitle="Shop-wide rate configuration and billing multipliers"
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />New Rate
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">
        {/* All rates table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">All Labor Rates</CardTitle>
            <CardDescription>All rates are database-backed and editable. The default rate applies to new work orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover text-xs text-content-muted">
                    <th className="text-left py-2 font-medium">Rate Name</th>
                    <th className="text-right py-2 font-medium">Base Rate</th>
                    <th className="text-right py-2 font-medium">Multiplier</th>
                    <th className="text-right py-2 font-medium">Effective</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {rates.map(r => (
                    <tr key={r.id} className="group">
                      <td className="py-2.5 pr-4">
                        <span className="text-content-primary font-medium">{r.name}</span>
                        {r.isDefault && <Badge variant="default" className="ml-2 text-[10px] h-4 px-1 bg-intent-primary/10 text-intent-primary border border-intent-primary/30">Default</Badge>}
                      </td>
                      <td className="py-2.5 text-right font-mono text-content-secondary">{formatCurrency(r.rate)}/hr</td>
                      <td className="py-2.5 text-right font-mono text-content-muted">{r.multiplier.toFixed(2)}×</td>
                      <td className="py-2.5 text-right font-mono text-intent-gold font-semibold">{formatCurrency(r.rate * r.multiplier)}/hr</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(r)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {!r.isDefault && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-intent-danger hover:text-intent-danger" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rates.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-content-muted text-xs">No labor rates configured.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* AOG info */}
        {defaultRate && (
          <div className="flex items-start gap-2 rounded-lg bg-surface-panel p-3 text-xs text-content-muted border border-surface-hover">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-intent-primary" />
            <p>
              Default A&P: <span className="font-mono text-content-primary">{formatCurrency(defaultRate.rate)}/hr</span>
              {' · '}AOG ({defaultRate.multiplier.toFixed(1)}×): <span className="font-mono text-intent-warning font-semibold">{formatCurrency(aogRate)}/hr</span>
              {' · '}Rates are snapshotted per labor entry at time of logging.
            </p>
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Labor Rate' : 'New Labor Rate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Rate Name *</Label>
              <Input value={rateName} onChange={e => setRateName(e.target.value)}
                placeholder="e.g. Avionics Technician" className="mt-1.5 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Base Rate ($/hr) *</Label>
              <Input type="number" step="0.50" min="0" value={rateValue}
                onChange={e => setRateValue(e.target.value)} className="mt-1.5 h-8 font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs">Multiplier</Label>
              <Input type="number" step="0.05" min="0.5" max="5" value={multiplierValue}
                onChange={e => setMultiplierValue(e.target.value)} className="mt-1.5 h-8 font-mono text-sm" />
              <p className="text-xs text-content-muted mt-1">
                Effective rate: <span className="font-mono text-intent-gold">
                  {formatCurrency((parseFloat(rateValue) || 0) * (parseFloat(multiplierValue) || 1))}/hr
                </span>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !rateName.trim() || !parseFloat(rateValue)}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {editingRate ? 'Save Changes' : 'Create Rate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Labor Rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the rate from the system. Work orders using this rate will retain their snapshotted values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-danger hover:bg-intent-danger/90"
              onClick={() => deleteId && deleteRate(deleteId)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
