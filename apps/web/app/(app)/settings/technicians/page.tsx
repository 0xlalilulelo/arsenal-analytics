'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useTechnicians } from '@/hooks/useAnalytics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Loader2, X } from 'lucide-react';

const COMMON_CERTS = ['A&P', 'IA', 'Avionics', 'Powerplant', 'Airframe'];

function useCreateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; certifications: string[]; billRate: number; costRate: number }) => {
      const res = await fetch('/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create technician');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['technicians'] }),
  });
}

export default function TechniciansPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [billRate, setBillRate] = useState('115');
  const [costRate, setCostRate] = useState('48');
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);

  const { data, isLoading } = useTechnicians();
  const technicians = data?.data ?? [];
  const { mutateAsync: createTechnician, isPending: creating } = useCreateTechnician();

  function toggleCert(cert: string) {
    setSelectedCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  }

  async function handleAdd() {
    if (!name.trim()) return;
    await createTechnician({
      name: name.trim(),
      certifications: selectedCerts,
      billRate: parseFloat(billRate) || 115,
      costRate: parseFloat(costRate) || 0,
    });
    setName(''); setBillRate('115'); setCostRate('48'); setSelectedCerts([]);
    setShowAdd(false);
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Technicians"
        subtitle="A&P mechanics, IAs, and billing rates"
        actions={
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" />Add Technician
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="rounded-lg border border-surface-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-hover bg-surface-panel">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Name</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Certifications</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Billing Rate</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">AOG Rate</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Cost Rate</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Margin</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {isLoading && (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-content-muted mx-auto" /></td></tr>
              )}
              {!isLoading && technicians.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-content-muted">No technicians found.</td></tr>
              )}
              {technicians.map((tech: any) => {
                const billRateVal = tech.billRate ?? 0;
                const costRateVal = tech.costRate ?? 0;
                const margin = billRateVal > 0 ? (billRateVal - costRateVal) / billRateVal : 0;
                const aogRate = billRateVal * 1.5;
                const certs: string[] = tech.certifications ?? [];
                return (
                  <tr key={tech.id} className="hover:bg-surface-hover/30">
                    <td className="py-3 px-4">
                      <p className="font-medium text-content-primary">{tech.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {certs.length === 0
                          ? <span className="text-xs text-content-muted">—</span>
                          : certs.map(cert => <Badge key={cert} variant="inspection">{cert}</Badge>)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-content-primary">
                      {formatCurrency(billRateVal)}/hr
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-intent-warning">
                      {formatCurrency(aogRate)}/hr
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-content-muted">
                      {costRateVal > 0 ? `${formatCurrency(costRateVal)}/hr` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-intent-success">
                      {costRateVal > 0 ? `${(margin * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Technician</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input
                className="mt-1.5 h-8 text-sm"
                placeholder="First Last"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Certifications</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {COMMON_CERTS.map(cert => (
                  <button
                    key={cert}
                    onClick={() => toggleCert(cert)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
                      selectedCerts.includes(cert)
                        ? 'bg-intent-primary text-white border-intent-primary'
                        : 'border-surface-hover text-content-muted hover:border-intent-primary hover:text-content-primary'
                    }`}
                  >
                    {cert}
                    {selectedCerts.includes(cert) && <X className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Billing Rate ($/hr)</Label>
                <Input
                  type="number"
                  className="mt-1.5 h-8 text-sm font-mono"
                  value={billRate}
                  onChange={e => setBillRate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Cost Rate ($/hr)</Label>
                <Input
                  type="number"
                  className="mt-1.5 h-8 text-sm font-mono"
                  value={costRate}
                  onChange={e => setCostRate(e.target.value)}
                />
              </div>
            </div>
            {billRate && costRate && parseFloat(billRate) > 0 && (
              <p className="text-xs text-content-muted">
                Margin: <span className="text-intent-success font-semibold">
                  {(((parseFloat(billRate) - parseFloat(costRate)) / parseFloat(billRate)) * 100).toFixed(0)}%
                </span>
                {' '}· AOG: <span className="text-intent-warning font-semibold font-mono">
                  ${(parseFloat(billRate) * 1.5).toFixed(2)}/hr
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleAdd} disabled={!name.trim() || creating}>
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Technician
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
