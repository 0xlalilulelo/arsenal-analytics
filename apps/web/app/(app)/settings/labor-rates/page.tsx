'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Info, Loader2, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LaborRatesPage() {
  const qc = useQueryClient();

  const { data: defaultsData } = useQuery({
    queryKey: ['settings-defaults'],
    queryFn: () => fetch('/api/settings/defaults').then(r => r.json()),
  });

  const [laborRate, setLaborRate] = useState('115.00');
  const [aogMultiplier, setAogMultiplier] = useState('1.5');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (defaultsData?.data?.laborRate) {
      setLaborRate(defaultsData.data.laborRate.rate.toFixed(2));
      setAogMultiplier((defaultsData.data.laborRate.multiplier ?? 1.5).toFixed(1));
    }
  }, [defaultsData]);

  const { mutateAsync: save, isPending: saving } = useMutation({
    mutationFn: () => fetch('/api/settings/defaults', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        laborRate: parseFloat(laborRate),
        aogMultiplier: parseFloat(aogMultiplier),
      }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-defaults'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const aogRate = (parseFloat(laborRate) || 0) * (parseFloat(aogMultiplier) || 1.5);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Labor Rates"
        subtitle="Shop-wide rate defaults and billing configuration"
        actions={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-intent-success flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />Saved
              </span>
            )}
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => save()} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save All Changes
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Standard Labor Rates</CardTitle>
            <CardDescription>Default rate for new work orders. Individual technician rates override this.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Default A&P Labor Rate ($/hr)</Label>
                <Input
                  type="number"
                  step="0.50"
                  value={laborRate}
                  onChange={e => setLaborRate(e.target.value)}
                  className="mt-1.5 h-8 text-sm font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">IA Inspection Rate ($/hr) <span className="text-content-muted">(display only)</span></Label>
                <Input type="number" defaultValue="125.00" className="mt-1.5 h-8 text-sm font-mono" />
              </div>
              <div>
                <Label className="text-xs">Avionics Technician Rate ($/hr) <span className="text-content-muted">(display only)</span></Label>
                <Input type="number" defaultValue="130.00" className="mt-1.5 h-8 text-sm font-mono" />
              </div>
              <div>
                <Label className="text-xs">Apprentice Rate ($/hr) <span className="text-content-muted">(display only)</span></Label>
                <Input type="number" defaultValue="85.00" className="mt-1.5 h-8 text-sm font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AOG & Premium Rates</CardTitle>
            <CardDescription>Rate multipliers applied to AOG (Aircraft on Ground) work orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">AOG Rate Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  value={aogMultiplier}
                  onChange={e => setAogMultiplier(e.target.value)}
                  className="mt-1.5 h-8 text-sm font-mono"
                />
                <p className="text-xs text-content-muted mt-1">
                  AOG rate: <span className="font-mono text-intent-warning font-semibold">${aogRate.toFixed(2)}/hr</span>
                </p>
              </div>
              <div>
                <Label className="text-xs">After-Hours Multiplier <span className="text-content-muted">(display only)</span></Label>
                <Input type="number" defaultValue="1.25" step="0.05" min="1" max="3" className="mt-1.5 h-8 text-sm font-mono" />
                <p className="text-xs text-content-muted mt-1">Applied manually to individual labor entries</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-surface-panel p-3 text-xs text-content-muted">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-intent-primary" />
              <p>AOG rates are snapshotted on each labor entry at the time of logging. Changing this multiplier does not affect existing entries.</p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Parts & Shop Supplies <span className="text-content-muted font-normal">(display only — configure in Markup Rules)</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Parts Markup</Label>
                <Input disabled defaultValue="Sliding scale (see Markup Rules)" className="mt-1.5 h-8 text-sm text-content-muted" />
              </div>
              <div>
                <Label className="text-xs">Shop Supplies (% of labor)</Label>
                <Input type="number" defaultValue="3.5" step="0.5" className="mt-1.5 h-8 text-sm font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Billing Time Rounding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {[
                { label: 'Quarter hour (0.25h)', value: '0.25', default: true },
                { label: 'Half hour (0.5h)', value: '0.5', default: false },
                { label: 'Tenth of hour (0.1h)', value: '0.1', default: false },
              ].map(option => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="rounding" value={option.value} defaultChecked={option.default} className="text-intent-primary" />
                  <span className="text-sm text-content-primary">{option.label}</span>
                  {option.default && <span className="text-xs text-content-muted">(recommended)</span>}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
