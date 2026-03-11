import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Clock, Plane, Package, Phone, Plus } from 'lucide-react';
import Link from 'next/link';

const ACTIVE_AOG = [
  {
    id: 'wo-aog',
    number: 'WO-2025-0042',
    customer: 'Apex Air Charter LLC',
    nNumber: 'N841QA',
    aircraft: 'Beechcraft A36 Bonanza',
    location: 'Austin Executive Airport · Hangar 4A',
    tech: 'Diego Ramirez',
    openedAt: '2025-01-15 06:15',
    elapsedHours: 9.75,
    currentCost: 2381.25,
    issue: 'Engine no-start — Left magneto failure confirmed',
    partsStatus: 'Slick M4371 on AOG order via Aviall · ETA 09:00 Jan 16',
  },
];

export default function AogPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="AOG — Aircraft on Ground"
        subtitle="Active emergencies"
        actions={
          <Link href="/work-orders/new">
            <Button size="sm" className="gap-1 bg-intent-danger hover:bg-intent-danger/90 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New AOG
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{ACTIVE_AOG.length} Active AOG — All rates at 1.5× standard (${(115 * 1.5).toFixed(2)}/hr)</AlertTitle>
          <AlertDescription>
            AOG work orders are billed at a 1.5× rate multiplier. 2-hour minimum callout applies.
            Parts ordered on AOG basis. Customer authorized per FAA Part 91/135.
          </AlertDescription>
        </Alert>

        {ACTIVE_AOG.map(aog => (
          <Card key={aog.id} className="border-intent-danger/40">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="aog" className="text-sm px-3">AOG ACTIVE</Badge>
                    <span className="font-mono text-sm font-bold text-content-primary">{aog.number}</span>
                  </div>
                  <p className="text-sm font-medium text-content-primary">{aog.customer}</p>
                  <p className="font-mono text-xs text-content-muted">{aog.nNumber} · {aog.aircraft}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-content-muted">Running Cost</p>
                  <p className="font-mono text-2xl font-bold text-intent-gold">{formatCurrency(aog.currentCost)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-content-muted shrink-0" />
                    <span className="text-content-muted">Location:</span>
                    <span className="text-content-primary">{aog.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-content-muted shrink-0" />
                    <span className="text-content-muted">Opened:</span>
                    <span className="font-mono text-content-primary">{aog.openedAt}</span>
                    <Badge variant="aog" className="text-xs">{aog.elapsedHours}h elapsed</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-content-muted shrink-0" />
                    <span className="text-content-muted">Tech:</span>
                    <span className="text-content-primary">{aog.tech}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-content-muted mb-1">Discrepancy</p>
                    <p className="text-sm text-intent-danger font-medium">{aog.issue}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-content-muted mt-0.5 shrink-0" />
                    <p className="text-xs text-content-secondary">{aog.partsStatus}</p>
                  </div>
                </div>
              </div>

              {/* Rate info */}
              <div className="rounded-lg bg-intent-danger/10 border border-intent-danger/20 p-3 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-content-muted">AOG Rate</p>
                    <p className="font-mono font-bold text-intent-danger">$172.50/hr</p>
                    <p className="text-content-muted">(1.5× $115.00)</p>
                  </div>
                  <div>
                    <p className="text-content-muted">Labor Billed</p>
                    <p className="font-mono font-bold text-content-primary">{formatCurrency(aog.elapsedHours * 172.50)}</p>
                  </div>
                  <div>
                    <p className="text-content-muted">Min. Callout</p>
                    <p className="font-mono font-bold text-content-primary">2h · {formatCurrency(2 * 172.50)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/work-orders/${aog.id}`} className="flex-1">
                  <Button className="w-full h-8 text-xs" variant="outline">View Work Order</Button>
                </Link>
                <Button className="h-8 text-xs" variant="default">Generate Interim Invoice</Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* AOG Reference */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">AOG Billing Reference</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-xs">
              {[
                { label: 'Rate Multiplier', value: '1.5× standard rate' },
                { label: 'Standard Rate', value: '$115.00/hr' },
                { label: 'AOG Rate', value: '$172.50/hr' },
                { label: 'Minimum Callout', value: '2 hours' },
                { label: 'Mileage', value: '$1.25/mile' },
                { label: 'Drive Time', value: '$70.00/hr per tech' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-content-muted">{label}</p>
                  <p className="font-mono font-semibold text-content-primary">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
