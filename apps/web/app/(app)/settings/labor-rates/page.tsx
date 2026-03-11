'use client';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';

export default function LaborRatesPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Labor Rates"
        subtitle="Shop-wide rate defaults and billing configuration"
        actions={<Button size="sm" className="h-8 text-xs">Save All Changes</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Standard Labor Rates</CardTitle>
            <CardDescription>Default rates for new technicians and work orders. Individual technician rates override these defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">A&P Labor Rate ($/hr)</Label>
                <Input type="number" defaultValue="115.00" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">IA Inspection Rate ($/hr)</Label>
                <Input type="number" defaultValue="125.00" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Avionics Technician Rate ($/hr)</Label>
                <Input type="number" defaultValue="130.00" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Apprentice Rate ($/hr)</Label>
                <Input type="number" defaultValue="85.00" className="mt-1.5 h-8 text-sm" />
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
                <Input type="number" defaultValue="1.5" step="0.1" min="1" max="3" className="mt-1.5 h-8 text-sm" />
                <p className="text-xs text-content-muted mt-1">Applied to all labor when WO type is AOG</p>
              </div>
              <div>
                <Label className="text-xs">After-Hours Multiplier</Label>
                <Input type="number" defaultValue="1.25" step="0.05" min="1" max="3" className="mt-1.5 h-8 text-sm" />
                <p className="text-xs text-content-muted mt-1">Applied manually to individual labor entries</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-surface-panel p-3 text-xs text-content-muted">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-intent-primary" />
              <p>AOG rates are calculated at time of clock-in and snapshotted on the labor entry. Changing this multiplier does not affect existing entries.</p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Parts & Shop Supplies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Default Parts Markup (%)</Label>
                <Input type="number" defaultValue="30" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Shop Supplies (% of labor)</Label>
                <Input type="number" defaultValue="3.5" step="0.5" className="mt-1.5 h-8 text-sm" />
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
                  <input
                    type="radio"
                    name="rounding"
                    value={option.value}
                    defaultChecked={option.default}
                    className="text-intent-primary"
                  />
                  <span className="text-sm text-content-primary">{option.label}</span>
                  {option.default && (
                    <span className="text-xs text-content-muted">(recommended)</span>
                  )}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
