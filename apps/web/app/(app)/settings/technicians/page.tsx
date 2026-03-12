'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useTechnicians } from '@/hooks/useAnalytics';
import { Plus, Pencil, Loader2 } from 'lucide-react';

export default function TechniciansPage() {
  const [showAdd, setShowAdd] = useState(false);
  const { data, isLoading } = useTechnicians();
  const technicians = data?.data ?? [];

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
                const billRate = tech.billRate ?? 0;
                const costRate = tech.costRate ?? 0;
                const margin = billRate > 0 ? (billRate - costRate) / billRate : 0;
                const aogRate = billRate * 1.5;
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
                      {formatCurrency(billRate)}/hr
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-intent-warning">
                      {formatCurrency(aogRate)}/hr
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-content-muted">
                      {costRate > 0 ? `${formatCurrency(costRate)}/hr` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-intent-success">
                      {costRate > 0 ? `${(margin * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
          <div className="grid gap-4 py-4">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input className="mt-1.5 h-8 text-sm" placeholder="First Last" />
            </div>
            <div>
              <Label className="text-xs">FAA Certificate Number</Label>
              <Input className="mt-1.5 h-8 text-sm" placeholder="A&P-XXXXXXX" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Billing Rate ($/hr)</Label>
                <Input type="number" className="mt-1.5 h-8 text-sm" defaultValue="115" />
              </div>
              <div>
                <Label className="text-xs">Cost Rate ($/hr)</Label>
                <Input type="number" className="mt-1.5 h-8 text-sm" defaultValue="48" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs">Add Technician</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
