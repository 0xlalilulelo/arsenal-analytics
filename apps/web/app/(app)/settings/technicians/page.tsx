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
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Loader2, X } from 'lucide-react';

function useUtilization() {
  return useQuery({
    queryKey: ['technician-utilization'],
    queryFn: async () => {
      const res = await fetch('/api/technicians/utilization');
      if (!res.ok) throw new Error('Failed to load utilization');
      return res.json() as Promise<{ data: UtilRow[]; month: string }>;
    },
  });
}

type UtilRow = {
  id: string; totalHours: number; billableHours: number;
  billedRevenue: number; utilizationPct: number; margin: number | null; availableHours: number;
};

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

function useUpdateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; certifications: string[]; billRate: number; costRate: number }) => {
      const res = await fetch(`/api/technicians/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update technician');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['technicians'] }),
  });
}

type TechRow = {
  id: string;
  name: string;
  certifications: string[];
  billRate: number | null;
  costRate: number | null;
};

export default function TechniciansPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [editTech, setEditTech] = useState<TechRow | null>(null);

  // Add form state
  const [name, setName] = useState('');
  const [billRate, setBillRate] = useState('115');
  const [costRate, setCostRate] = useState('48');
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBillRate, setEditBillRate] = useState('');
  const [editCostRate, setEditCostRate] = useState('');
  const [editCerts, setEditCerts] = useState<string[]>([]);

  const { data, isLoading } = useTechnicians();
  const technicians = data?.data ?? [];
  const { data: utilData } = useUtilization();
  const utilMap = new Map((utilData?.data ?? []).map(u => [u.id, u]));
  const { mutateAsync: createTechnician, isPending: creating } = useCreateTechnician();
  const { mutateAsync: updateTechnician, isPending: updating } = useUpdateTechnician();

  function toggleCert(cert: string, certs: string[], setCerts: (c: string[]) => void) {
    setCerts(certs.includes(cert) ? certs.filter(c => c !== cert) : [...certs, cert]);
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

  function openEdit(tech: TechRow) {
    setEditTech(tech);
    setEditName(tech.name);
    setEditBillRate(String(tech.billRate ?? 115));
    setEditCostRate(String(tech.costRate ?? 0));
    setEditCerts(tech.certifications ?? []);
  }

  async function handleEdit() {
    if (!editTech || !editName.trim()) return;
    await updateTechnician({
      id: editTech.id,
      name: editName.trim(),
      certifications: editCerts,
      billRate: parseFloat(editBillRate) || 115,
      costRate: parseFloat(editCostRate) || 0,
    });
    setEditTech(null);
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

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Current month utilization summary */}
        {utilData && utilData.data.length > 0 && (
          <div className="rounded-lg border border-surface-hover bg-surface-panel px-4 py-3 flex items-center gap-6 text-xs text-content-muted overflow-x-auto">
            <span className="font-semibold text-content-secondary whitespace-nowrap">
              {new Date(utilData.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            {(() => {
              const totBillable = utilData.data.reduce((s, u) => s + u.billableHours, 0);
              const totRevenue = utilData.data.reduce((s, u) => s + u.billedRevenue, 0);
              const avgUtil = utilData.data.length > 0 ? utilData.data.reduce((s, u) => s + u.utilizationPct, 0) / utilData.data.length : 0;
              return (
                <>
                  <span>Total billable: <span className="font-mono text-content-primary font-semibold">{totBillable.toFixed(1)}h</span></span>
                  <span>Billed revenue: <span className="font-mono text-intent-gold font-semibold">{formatCurrency(totRevenue)}</span></span>
                  <span>Avg utilization: <span className={`font-mono font-semibold ${avgUtil >= 70 ? 'text-intent-success' : avgUtil >= 50 ? 'text-intent-warning' : 'text-intent-danger'}`}>{avgUtil.toFixed(1)}%</span></span>
                </>
              );
            })()}
          </div>
        )}

        <div className="rounded-lg border border-surface-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-hover bg-surface-panel">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Name</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Certifications</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Billing Rate</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">AOG Rate</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">MTD Hours</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">MTD Utilization</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">MTD Revenue</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Margin</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {isLoading && (
                <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-content-muted mx-auto" /></td></tr>
              )}
              {!isLoading && technicians.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-content-muted">No technicians found.</td></tr>
              )}
              {technicians.map((tech: TechRow) => {
                const billRateVal = tech.billRate ?? 0;
                const costRateVal = tech.costRate ?? 0;
                const aogRate = billRateVal * 1.5;
                const certs: string[] = tech.certifications ?? [];
                const util = utilMap.get(tech.id);
                const utilPct = util?.utilizationPct ?? null;
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
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      {util ? (
                        <span className="text-content-primary">
                          {util.billableHours.toFixed(1)}
                          <span className="text-content-muted">/{util.totalHours.toFixed(1)}h</span>
                        </span>
                      ) : <span className="text-content-muted">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {utilPct != null ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-mono text-xs font-semibold ${utilPct >= 70 ? 'text-intent-success' : utilPct >= 50 ? 'text-intent-warning' : 'text-intent-danger'}`}>
                            {utilPct.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${utilPct >= 70 ? 'bg-intent-success' : utilPct >= 50 ? 'bg-intent-warning' : 'bg-intent-danger'}`}
                              style={{ width: `${Math.min(utilPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : <span className="text-content-muted text-xs">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-intent-gold">
                      {util ? formatCurrency(util.billedRevenue) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-intent-success">
                      {util?.margin != null ? `${util.margin.toFixed(0)}%` : costRateVal > 0 ? `${(((billRateVal - costRateVal) / billRateVal) * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(tech)}>
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

      {/* Add Technician Dialog */}
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
                    onClick={() => toggleCert(cert, selectedCerts, setSelectedCerts)}
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
                <Input type="number" className="mt-1.5 h-8 text-sm font-mono" value={billRate} onChange={e => setBillRate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Cost Rate ($/hr)</Label>
                <Input type="number" className="mt-1.5 h-8 text-sm font-mono" value={costRate} onChange={e => setCostRate(e.target.value)} />
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

      {/* Edit Technician Dialog */}
      <Dialog open={!!editTech} onOpenChange={(v) => !v && setEditTech(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Technician</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input
                className="mt-1.5 h-8 text-sm"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Certifications</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {COMMON_CERTS.map(cert => (
                  <button
                    key={cert}
                    onClick={() => toggleCert(cert, editCerts, setEditCerts)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
                      editCerts.includes(cert)
                        ? 'bg-intent-primary text-white border-intent-primary'
                        : 'border-surface-hover text-content-muted hover:border-intent-primary hover:text-content-primary'
                    }`}
                  >
                    {cert}
                    {editCerts.includes(cert) && <X className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Billing Rate ($/hr)</Label>
                <Input type="number" className="mt-1.5 h-8 text-sm font-mono" value={editBillRate} onChange={e => setEditBillRate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Cost Rate ($/hr)</Label>
                <Input type="number" className="mt-1.5 h-8 text-sm font-mono" value={editCostRate} onChange={e => setEditCostRate(e.target.value)} />
              </div>
            </div>
            {editBillRate && editCostRate && parseFloat(editBillRate) > 0 && (
              <p className="text-xs text-content-muted">
                Margin: <span className="text-intent-success font-semibold">
                  {(((parseFloat(editBillRate) - parseFloat(editCostRate)) / parseFloat(editBillRate)) * 100).toFixed(0)}%
                </span>
                {' '}· AOG: <span className="text-intent-warning font-semibold font-mono">
                  ${(parseFloat(editBillRate) * 1.5).toFixed(2)}/hr
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditTech(null)}>Cancel</Button>
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
