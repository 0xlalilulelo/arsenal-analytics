'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  {
    href: '/settings/certifications',
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: 'Certifications',
    description: 'Certification catalog, task-level requirements, and technician qualification tracking',
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

type OrgData = {
  id: string;
  name: string;
  slug: string;
  faaRepairStationNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  shopSuppliesPct: number;
  defaultTaxRatePct: number;
  defaultBillingTerms: string;
  laborRoundingMinutes: number;
};

export default function SettingsPage() {
  const qc = useQueryClient();

  // ── Org info ──────────────────────────────────────────────────────────────
  const { data: orgData, isLoading: orgLoading } = useQuery<{ data: OrgData }>({
    queryKey: ['settings-org'],
    queryFn: () => fetch('/api/settings/org').then(r => r.json()),
  });

  const org = orgData?.data;

  const [shopName, setShopName] = useState('');
  const [faaRsNum, setFaaRsNum] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!org) return;
    setShopName(org.name ?? '');
    setFaaRsNum(org.faaRepairStationNumber ?? '');
    setPhone(org.phone ?? '');
    setEmail(org.email ?? '');
    setAddress(org.address ?? '');
  }, [org]);

  const orgSave = useSaveStatus();
  const { mutateAsync: saveOrg, isPending: orgSaving } = useMutation({
    mutationFn: () => fetch('/api/settings/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: shopName, faaRepairStationNumber: faaRsNum, phone, email, address }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-org'] }); orgSave.flash(); },
  });

  // ── Billing defaults (labor rate) ─────────────────────────────────────────
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

  // ── Operational defaults (shop supplies, tax, billing terms, rounding) ────
  const [shopSuppliesPct, setShopSuppliesPct] = useState('3.5');
  const [taxRatePct, setTaxRatePct] = useState('0');
  const [billingTerms, setBillingTerms] = useState('NET_30');
  const [laborRounding, setLaborRounding] = useState('15');

  useEffect(() => {
    if (!org) return;
    setShopSuppliesPct(((org.shopSuppliesPct ?? 0.035) * 100).toFixed(2));
    setTaxRatePct(((org.defaultTaxRatePct ?? 0) * 100).toFixed(2));
    setBillingTerms(org.defaultBillingTerms ?? 'NET_30');
    setLaborRounding(String(org.laborRoundingMinutes ?? 15));
  }, [org]);

  const opSave = useSaveStatus();
  const { mutateAsync: saveOrgOps, isPending: opSaving } = useMutation({
    mutationFn: () => fetch('/api/settings/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopSuppliesPct: parseFloat(shopSuppliesPct) / 100,
        defaultTaxRatePct: parseFloat(taxRatePct) / 100,
        defaultBillingTerms: billingTerms,
        laborRoundingMinutes: parseInt(laborRounding),
      }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-org'] }); opSave.flash(); },
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
            <CardDescription>Your MRO shop&apos;s identity and contact details — persisted to database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orgLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="shop-name" className="text-xs">Shop Name</Label>
                  <Input id="shop-name" value={shopName} onChange={e => setShopName(e.target.value)} className="mt-1.5 h-8 text-sm" />
                </div>
                <div>
                  <Label htmlFor="repair-station" className="text-xs">FAA Repair Station #</Label>
                  <Input id="repair-station" value={faaRsNum} onChange={e => setFaaRsNum(e.target.value)}
                    placeholder="e.g. RS4XY9012" className="mt-1.5 h-8 text-sm font-mono" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs">Phone</Label>
                  <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="(555) 867-5309" className="mt-1.5 h-8 text-sm" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs">Billing Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="billing@yourshop.com" className="mt-1.5 h-8 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address" className="text-xs">Address</Label>
                  <Input id="address" value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="123 Airport Rd, Hangar 4, Anytown, CA 90210" className="mt-1.5 h-8 text-sm" />
                </div>
              </div>
            )}
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

        {/* Operational Defaults */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-content-muted" />
              <CardTitle className="text-sm">Billing Defaults</CardTitle>
            </div>
            <CardDescription>Default rates and terms applied to new work orders — all fields persisted</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Labor rate — via defaults API */}
              <div>
                <Label htmlFor="labor-rate" className="text-xs">Default A&P Labor Rate ($/hr)</Label>
                <Input id="labor-rate" type="number" step="0.01" value={laborRate}
                  onChange={e => setLaborRate(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" />
              </div>
              <div>
                <Label htmlFor="aog-multiplier" className="text-xs">AOG Rate Multiplier</Label>
                <Input id="aog-multiplier" type="number" step="0.1" value={aogMultiplier}
                  onChange={e => setAogMultiplier(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" />
              </div>
              <div className="flex items-end">
                <Button size="sm" className="h-8 text-xs gap-1.5 w-full" onClick={() => saveDefaults()} disabled={defaultsSaving}>
                  {defaultsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : defaultsSave.saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  Save Rates
                </Button>
              </div>

              {/* Org-level defaults */}
              <div>
                <Label htmlFor="shop-supplies" className="text-xs">Shop Supplies (%)</Label>
                <Input id="shop-supplies" type="number" step="0.1" min="0" max="100" value={shopSuppliesPct}
                  onChange={e => setShopSuppliesPct(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" />
                <p className="text-xs text-content-muted mt-1">Applied to labor subtotal on invoices</p>
              </div>
              <div>
                <Label htmlFor="tax-rate" className="text-xs">Default Tax Rate (%)</Label>
                <Input id="tax-rate" type="number" step="0.01" min="0" max="100" value={taxRatePct}
                  onChange={e => setTaxRatePct(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" />
              </div>
              <div>
                <Label htmlFor="billing-terms" className="text-xs">Default Billing Terms</Label>
                <Select value={billingTerms} onValueChange={setBillingTerms}>
                  <SelectTrigger className="mt-1.5 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NET_15">NET 15</SelectItem>
                    <SelectItem value="NET_30">NET 30</SelectItem>
                    <SelectItem value="NET_45">NET 45</SelectItem>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="PREPAY">Prepay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Labor time rounding */}
            <div>
              <Label className="text-xs">Labor Time Rounding</Label>
              <div className="flex gap-3 mt-1.5">
                {[
                  { value: '6', label: '6-min (0.1 hr)' },
                  { value: '15', label: '15-min (0.25 hr)' },
                  { value: '30', label: '30-min (0.5 hr)' },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs cursor-pointer transition-colors ${
                    laborRounding === opt.value
                      ? 'border-intent-primary bg-intent-primary/10 text-intent-primary'
                      : 'border-surface-hover text-content-muted hover:border-surface-active'
                  }`}>
                    <input type="radio" name="rounding" value={opt.value} checked={laborRounding === opt.value}
                      onChange={e => setLaborRounding(e.target.value)} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-content-muted mt-1">Applied when logging labor time on work orders</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              {opSave.saved && (
                <span className="text-xs text-intent-success flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />Saved
                </span>
              )}
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => saveOrgOps()} disabled={opSaving}>
                {opSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Defaults
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
