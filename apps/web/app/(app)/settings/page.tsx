'use client';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, DollarSign, Wrench, Building2, ChevronRight, Package } from 'lucide-react';

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
    href: '/settings/markup-rules',
    icon: <Package className="h-5 w-5" />,
    title: 'Parts Markup Rules',
    description: 'Sliding-scale markup tiers by part cost — 5 configurable bands with live preview',
  },
];

export default function SettingsPage() {
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
                <Input id="shop-name" defaultValue="Arsenal Aviation Services" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="repair-station" className="text-xs">FAA Repair Station #</Label>
                <Input id="repair-station" defaultValue="RS4XY9012" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs">Phone</Label>
                <Input id="phone" defaultValue="(555) 867-5309" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">Billing Email</Label>
                <Input id="email" defaultValue="billing@arsenalaviation.com" className="mt-1.5 h-8 text-sm" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="h-8 text-xs">Save Changes</Button>
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
                <Input id="labor-rate" defaultValue="115.00" type="number" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="aog-multiplier" className="text-xs">AOG Rate Multiplier</Label>
                <Input id="aog-multiplier" defaultValue="1.5" type="number" step="0.1" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="parts-markup" className="text-xs">Default Parts Markup (%)</Label>
                <Input id="parts-markup" defaultValue="30" type="number" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="shop-supplies" className="text-xs">Shop Supplies % (of labor)</Label>
                <Input id="shop-supplies" defaultValue="3.5" type="number" step="0.1" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="tax-rate" className="text-xs">Default Tax Rate (%)</Label>
                <Input id="tax-rate" defaultValue="0" type="number" step="0.01" className="mt-1.5 h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="billing-terms" className="text-xs">Default Payment Terms</Label>
                <Input id="billing-terms" defaultValue="NET30" className="mt-1.5 h-8 text-sm" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="h-8 text-xs">Save Changes</Button>
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
