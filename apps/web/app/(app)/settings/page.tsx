'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, DollarSign, Wrench, Building2, ChevronRight, Package, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SETTINGS_NAV = [
  {
    href: '/settings/technicians',
    icon: <Wrench className="h-5 w-5" />,
    title: 'Technicians',
    description: 'Manage A&P technicians, certifications, and billing rates',
  },
  {
    href: '/settings/customers',
    icon: <Users className="h-5 w-5" />,
    title: 'Customers',
    description: 'Customer accounts, billing terms, and contact information',
  },
  {
    href: '/settings/labor-rates',
    icon: <DollarSign className="h-5 w-5" />,
    title: 'Labor Rates',
    description: 'Shop-wide default labor rates, AOG multipliers, and markup defaults',
  },
  {
    href: '/settings/users',
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'User Management',
    description: 'Invite team members, assign roles, and manage access permissions',
  },
  {
    href: '/settings/markup-rules',
    icon: <Package className="h-5 w-5" />,
    title: 'Parts Markup Rules',
    description: 'Sliding-scale markup tiers by part cost — 5 configurable bands with live preview',
  },
];

function useSaveStatus() {
  const [saved, setSaved] = useState(false);
  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return { saved, flash };
}

export default function SettingsPage() {
  const qc = useQueryClient();

  // ── Org info ──────────────────────────────────────────────────────────────
  const { data: orgData } = useQuery({
    queryKey: ['settings-org'],
    queryFn: () => fetch('/api/settings/org').then(r => r.json()),
  });
  const [shopName, setShopName] = useState('');
  useEffect(() => { if (orgData?.data?.name) setShopName(orgData.data.name); }, [orgData]);

  const orgSave = useSaveStatus();
  const { mutateAsync: saveOrg, isPending: orgSaving } = useMutation({
    mutationFn: () => fetch('/api/settings/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: shopName }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-org'] }); orgSave.flash(); },
  });

  // ── Billing defaults ──────────────────────────────────────────────────────
  const { data: defaultsData } = useQuery({
    queryKey: ['settings-defaults'],
    queryFn: () => fetch('/api/settings/defaults').then(r => r.json()),
  });
  const [laborRate, setLaborRate] = useState('115.00');
  const [aogMultiplier, setAogMultiplier] = useState('1.5');
  useEffect(() => {
    if (defaultsData?.data?.laborRate) {
      setLaborRate(defaultsData.data.laborRate.rate.toFixed(2));
      setAogMultiplier(defaultsData.data.laborRate.multiplier?.toFixed(1) ?? '1.5');
    }
  }, [defaultsData]);

  const defaultsSave = useSaveStatus();
  const { mutateAsync: saveDefaults, isPending: defaultsSaving } = useMutation({
    mutationFn: () => fetch('/api/settings/defaults', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ laborRate: parseFloat(laborRate), aogMultiplier: parseFloat(aogMultiplier) }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-defaults'] }); defaultsSave.flash(); },
  });

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" subtitle="Shop configuration and account management" />

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-6">
        {/* Shop Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-content-muted" />
              <CardTitle className="text-sm">Shop Information</CardTitle>
            </div>
            <CardDescription>Your MRO shop&apos;s name and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="shop-name" className="text-xs">Shop Name</Label>
                <Input
                  id="shop-name"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="mt-1.5 h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="repair-station" className="text-xs">FAA Repair Station # <span className="text-content-muted">(display only)</span></Label>
                <Input id="repair-station" defaultValue="RS4XY9012" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs">Phone <span className="text-content-muted">(display only)</span></Label>
                <Input id="phone" defaultValue="(555) 867-5309" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">Billing Email <span className="text-content-muted">(display only)</span></Label>
                <Input id="email" defaultValue="billing@arsenalaviation.com" className="mt-1.5 h-8 text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              {orgSave.saved && (
                <span className="text-xs text-intent-success flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />Saved
                </span>
              )}
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => saveOrg()} disabled={orgSaving || !shopName.trim()}>
                {orgSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing Defaults */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-content-muted" />
              <CardTitle className="text-sm">Billing Defaults</CardTitle>
            </div>
            <CardDescription>Default rates applied to new work orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="labor-rate" className="text-xs">Default Labor Rate ($/hr)</Label>
                <Input
                  id="labor-rate"
                  type="number"
                  step="0.01"
                  value={laborRate}
                  onChange={e => setLaborRate(e.target.value)}
                  className="mt-1.5 h-8 text-sm font-mono"
                />
              </div>
              <div>
                <Label htmlFor="aog-multiplier" className="text-xs">AOG Rate Multiplier</Label>
                <Input
                  id="aog-multiplier"
                  type="number"
                  step="0.1"
                  value={aogMultiplier}
                  onChange={e => setAogMultiplier(e.target.value)}
                  className="mt-1.5 h-8 text-sm font-mono"
                />
              </div>
              <div>
                <Label htmlFor="parts-markup" className="text-xs">Parts Markup <span className="text-content-muted">(use Markup Rules)</span></Label>
                <Input id="parts-markup" defaultValue="Sliding scale" disabled className="mt-1.5 h-8 text-sm text-content-muted" />
              </div>
              <div>
                <Label htmlFor="shop-supplies" className="text-xs">Shop Supplies % <span className="text-content-muted">(display only)</span></Label>
                <Input id="shop-supplies" defaultValue="3.5" type="number" step="0.1" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="tax-rate" className="text-xs">Default Tax Rate (%) <span className="text-content-muted">(display only)</span></Label>
                <Input id="tax-rate" defaultValue="0" type="number" step="0.01" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="billing-terms" className="text-xs">Default Terms <span className="text-content-muted">(display only)</span></Label>
                <Input id="billing-terms" defaultValue="NET30" className="mt-1.5 h-8 text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              {defaultsSave.saved && (
                <span className="text-xs text-intent-success flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />Saved
                </span>
              )}
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => saveDefaults()} disabled={defaultsSaving}>
                {defaultsSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Navigation tiles */}
        <div className="space-y-2">
          {SETTINGS_NAV.map(item => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-surface-hover hover:bg-surface-hover/40 transition-colors cursor-pointer">
                <div className="text-content-muted">{item.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-content-primary">{item.title}</p>
                  <p className="text-xs text-content-muted">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-content-muted" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
