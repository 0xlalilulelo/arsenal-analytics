'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil } from 'lucide-react';

const DEMO_TECHNICIANS = [
  {
    id: 't-1',
    firstName: 'Marcus',
    lastName: 'Williams',
    certificateNumber: 'A&P-2847291',
    certifications: ['A&P', 'IA'],
    billingRate: 115.00,
    costRate: 48.00,
    aogBillingRate: null,
    isActive: true,
  },
  {
    id: 't-2',
    firstName: 'Deja',
    lastName: 'Thomas',
    certificateNumber: 'A&P-3312040',
    certifications: ['A&P'],
    billingRate: 130.00,
    costRate: 55.00,
    aogBillingRate: null,
    isActive: true,
  },
  {
    id: 't-3',
    firstName: 'Carlos',
    lastName: 'Rivera',
    certificateNumber: 'A&P-4001182',
    certifications: ['A&P'],
    billingRate: 100.00,
    costRate: 42.00,
    aogBillingRate: null,
    isActive: true,
  },
  {
    id: 't-4',
    firstName: 'Priya',
    lastName: 'Nair',
    certificateNumber: 'A&P-5519073',
    certifications: ['A&P', 'IA'],
    billingRate: 125.00,
    costRate: 52.00,
    aogBillingRate: 190.00,
    isActive: true,
  },
];

export default function TechniciansPage() {
  const [showAdd, setShowAdd] = useState(false);

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
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Certificate #</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Certifications</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Billing Rate</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">AOG Rate</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Cost Rate</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Margin</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {DEMO_TECHNICIANS.map(tech => {
                const margin = (tech.billingRate - tech.costRate) / tech.billingRate;
                const aogRate = tech.aogBillingRate ?? tech.billingRate * 1.5;
                return (
                  <tr key={tech.id} className="hover:bg-surface-hover/30">
                    <td className="py-3 px-4">
                      <p className="font-medium text-content-primary">{tech.firstName} {tech.lastName}</p>
                      <Badge variant={tech.isActive ? 'complete' : 'open'} className="text-xs mt-0.5">
                        {tech.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-content-secondary">{tech.certificateNumber}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {tech.certifications.map(cert => (
                          <Badge key={cert} variant="inspection">{cert}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-content-primary">
                      {formatCurrency(tech.billingRate)}/hr
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-intent-warning">
                      {formatCurrency(aogRate)}/hr
                      {tech.aogBillingRate && (
                        <span className="ml-1 text-content-muted">(custom)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-content-muted">
                      {formatCurrency(tech.costRate)}/hr
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-intent-success">
                      {(margin * 100).toFixed(0)}%
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
          <DialogHeader>
            <DialogTitle>Add Technician</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name</Label>
                <Input className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input className="mt-1.5 h-8 text-sm" />
              </div>
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
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs">Add Technician</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
