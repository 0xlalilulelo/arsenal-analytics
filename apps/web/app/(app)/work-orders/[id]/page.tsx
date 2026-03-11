'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { SquawkPanel, type Squawk } from '@/components/work-orders/SquawkPanel';
import { formatCurrency, formatDate, formatPct } from '@/lib/utils';
import {
  AlertTriangle, CheckCircle2, Clock, Package, FileText,
  ChevronLeft, ClipboardList, Wrench, Shield, History, AlertCircle
} from 'lucide-react';

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_WO = {
  id: 'wo-1',
  number: 'WO-2025-0041',
  type: 'INSPECTION',
  status: 'IN_PROGRESS',
  customer: 'Robert Harrington',
  customerEmail: 'rharrington@example.com',
  nNumber: 'N5572K',
  make: 'Cessna',
  model: '172S Skyhawk',
  serial: '172S12345',
  ttsn: 3142.5,
  engineTtsn: 847.2,
  dateOpened: '2025-01-13',
  estimatedClose: '2025-01-20',
  billingModel: 'HYBRID',
  laborRate: 115.00,
  estimatedTotal: 2850.00,
  shopSuppliesPct: 0.035,
  notes: 'Annual inspection + 100hr. Customer requested avionics check.',
};

const DEMO_LINE_ITEMS = [
  { id: 'li-1', taskNumber: 'TASK-001', description: 'Annual Inspection — Airframe per FAR 43 Appendix D', referenceDoc: null, estHours: 12.0, actualHours: 9.5, laborRate: 115.00, status: 'COMPLETE', technician: 'Marcus Williams', sortOrder: 1 },
  { id: 'li-2', taskNumber: 'TASK-002', description: 'Engine Inspection — Continental IO-360', referenceDoc: null, estHours: 3.0, actualHours: 3.5, laborRate: 115.00, status: 'COMPLETE', technician: 'Marcus Williams', sortOrder: 2 },
  { id: 'li-3', taskNumber: 'TASK-003', description: 'Avionics Inspection — Garmin G1000 suite functional check', referenceDoc: null, estHours: 2.0, actualHours: 0, laborRate: 130.00, status: 'PENDING', technician: null, sortOrder: 3 },
];

const DEMO_LABOR_ENTRIES = [
  { id: 'le-1', date: '2025-01-13', technician: 'Marcus Williams', description: 'Airframe inspection — exterior and control surface checks', hours: 4.5, rate: 115.00, billable: true },
  { id: 'le-2', date: '2025-01-14', technician: 'Marcus Williams', description: 'Airframe inspection continued — interior, electrical', hours: 5.0, rate: 115.00, billable: true },
  { id: 'le-3', date: '2025-01-14', technician: 'Marcus Williams', description: 'Engine inspection — compression, mag check', hours: 3.5, rate: 115.00, billable: true },
];

const DEMO_SQUAWKS: Squawk[] = [
  { id: 'sq-1', description: 'Left brake assembly shows 40% wear — pads worn near minimum thickness. Recommend replacement before next flight.', estLaborHours: 1.5, estPartsTotal: 285.00, estTotal: 457.50, status: 'APPROVED', isAirworthiness: false, approvedBy: 'Robert Harrington', approvedAt: '2025-01-14' },
  { id: 'sq-2', description: 'Nose gear shimmy dampener worn — excessive play observed during taxi inspection. Replacement required for airworthiness.', estLaborHours: 2.0, estPartsTotal: 445.00, estTotal: 675.00, status: 'PENDING_APPROVAL', isAirworthiness: true, approvedBy: null },
];

const DEMO_COMPLIANCE = [
  { id: 'c-1', type: 'AD', referenceId: 'AD 2023-09-11', description: 'Cessna: Inspect and replace elevator trim tab actuator — recurring 100hr', completedAt: '2025-01-13', form337Required: false },
  { id: 'c-2', type: 'SB', referenceId: 'Cessna SEB95-4', description: 'Cessna Skyhawk: Fuel injection system cleaning service bulletin', completedAt: null, form337Required: false },
];

const DEMO_AUDIT = [
  { at: '2025-01-14 14:32', user: 'Marcus W.', action: 'Squawk #2 created — Nose gear shimmy dampener' },
  { at: '2025-01-14 11:15', user: 'Marcus W.', action: 'Squawk #1 approved by customer (Robert Harrington)' },
  { at: '2025-01-14 09:00', user: 'Marcus W.', action: 'TASK-002 marked Complete' },
  { at: '2025-01-13 17:30', user: 'Marcus W.', action: 'TASK-001 marked Complete' },
  { at: '2025-01-13 08:00', user: 'Admin', action: 'Work order opened' },
];

// ─── Calculations ─────────────────────────────────────────────────────────────
const totalActualHours = DEMO_LABOR_ENTRIES.reduce((s, e) => s + e.hours, 0);
const totalLaborBilled = DEMO_LABOR_ENTRIES.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rate, 0);
const shopSupplies = totalLaborBilled * DEMO_WO.shopSuppliesPct;
const estimatedTotalLaborBilled = DEMO_LINE_ITEMS.reduce((s, li) => s + li.estHours * li.laborRate, 0);
const completionPct = Math.round((totalActualHours / (DEMO_WO.estimatedTotal / DEMO_WO.laborRate)) * 100);

export default function WorkOrderDetailPage() {
  const [squawkPanelOpen, setSquawkPanelOpen] = useState(false);
  const pendingSquawks = DEMO_SQUAWKS.filter(s => s.status === 'PENDING_APPROVAL');

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={DEMO_WO.number}
        subtitle={`${DEMO_WO.customer} · ${DEMO_WO.nNumber} ${DEMO_WO.model}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/work-orders">
              <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
                All Work Orders
              </Button>
            </Link>
            <Button
              variant={pendingSquawks.length > 0 ? 'warning' : 'outline'}
              size="sm"
              className="gap-1 h-8 text-xs"
              onClick={() => setSquawkPanelOpen(true)}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Squawks ({DEMO_SQUAWKS.length})
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">Generate Invoice</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Header card */}
        <div className="border-b border-surface-hover bg-surface-primary px-6 py-4">
          <div className="flex flex-wrap items-start gap-4">
            {/* Status + type */}
            <div className="flex items-center gap-2">
              <Badge variant={DEMO_WO.type === 'AOG' ? 'aog' : DEMO_WO.type === 'INSPECTION' ? 'inspection' : 'scheduled'}>
                {DEMO_WO.type}
              </Badge>
              <Badge variant="in-progress">IN PROGRESS</Badge>
              <Badge variant="default" className="font-mono">{DEMO_WO.billingModel.replace('_', ' ')}</Badge>
            </div>

            {/* Progress */}
            <div className="flex-1 min-w-48 max-w-xs">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-content-muted">Completion</span>
                <span className="font-mono text-content-primary">{completionPct}%</span>
              </div>
              <Progress value={completionPct} />
            </div>

            {/* Financial summary */}
            <div className="flex gap-6 ml-auto">
              {[
                { label: 'Est. Total', value: formatCurrency(DEMO_WO.estimatedTotal), color: 'text-content-secondary' },
                { label: 'Labor Billed', value: formatCurrency(totalLaborBilled), color: 'text-intent-primary' },
                { label: 'Shop Supplies', value: formatCurrency(shopSupplies), color: 'text-content-muted' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-right">
                  <p className="text-xs text-content-muted">{label}</p>
                  <p className={`font-mono text-sm font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Airworthiness alert */}
        {pendingSquawks.some(s => s.isAirworthiness) && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Airworthiness Item Awaiting Approval</AlertTitle>
              <AlertDescription>
                This aircraft cannot return to service until all airworthiness squawks are approved or declined.{' '}
                <button onClick={() => setSquawkPanelOpen(true)} className="underline font-medium">Review squawks →</button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />Overview
              </TabsTrigger>
              <TabsTrigger value="labor" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" />Labor
              </TabsTrigger>
              <TabsTrigger value="parts" className="gap-1.5">
                <Package className="h-3.5 w-3.5" />Parts
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />Billing
              </TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />Compliance
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-3.5 w-3.5" />History
              </TabsTrigger>
            </TabsList>

            {/* ── Overview ─────────────────────────────────────────────── */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Customer + Aircraft */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Customer & Aircraft</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-content-muted mb-0.5">Customer</p>
                      <p className="font-medium text-content-primary">{DEMO_WO.customer}</p>
                      <p className="text-xs text-content-muted">{DEMO_WO.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-content-muted mb-0.5">Aircraft</p>
                      <p className="font-mono text-sm font-semibold text-content-primary">{DEMO_WO.nNumber}</p>
                      <p className="text-xs text-content-secondary">{DEMO_WO.make} {DEMO_WO.model} · S/N {DEMO_WO.serial}</p>
                      <div className="mt-1 flex gap-3 text-xs text-content-muted">
                        <span>TTSN: <span className="font-mono text-content-secondary">{DEMO_WO.ttsn.toLocaleString()}h</span></span>
                        <span>Eng: <span className="font-mono text-content-secondary">{DEMO_WO.engineTtsn}h</span></span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-content-muted mb-0.5">Dates</p>
                      <p className="text-xs">Opened: <span className="text-content-secondary">{formatDate(DEMO_WO.dateOpened)}</span></p>
                      <p className="text-xs">Est. Close: <span className="text-content-secondary">{DEMO_WO.estimatedClose ? formatDate(DEMO_WO.estimatedClose) : '—'}</span></p>
                    </div>
                  </CardContent>
                </Card>

                {/* Task cards */}
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="text-sm">Task Cards</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-hover">
                          <th className="text-left py-2 px-4 text-content-muted font-semibold">Task</th>
                          <th className="text-left py-2 px-4 text-content-muted font-semibold">Description</th>
                          <th className="text-right py-2 px-4 text-content-muted font-semibold">Est h</th>
                          <th className="text-right py-2 px-4 text-content-muted font-semibold">Act h</th>
                          <th className="text-right py-2 px-4 text-content-muted font-semibold">Billed</th>
                          <th className="text-left py-2 px-4 text-content-muted font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-hover">
                        {DEMO_LINE_ITEMS.map(li => {
                          const variance = li.actualHours > 0 ? ((li.actualHours - li.estHours) / li.estHours) : 0;
                          return (
                            <tr key={li.id} className="hover:bg-surface-hover/30">
                              <td className="py-2.5 px-4 font-mono text-content-muted">{li.taskNumber}</td>
                              <td className="py-2.5 px-4 text-content-primary max-w-xs">{li.description}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-content-muted">{li.estHours.toFixed(1)}</td>
                              <td className={`py-2.5 px-4 text-right font-mono ${variance > 0.1 ? 'text-intent-warning' : variance > 0.3 ? 'text-intent-danger' : 'text-intent-success'}`}>
                                {li.actualHours > 0 ? li.actualHours.toFixed(1) : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-content-primary">
                                {formatCurrency(li.actualHours * li.laborRate)}
                              </td>
                              <td className="py-2.5 px-4">
                                <Badge variant={li.status === 'COMPLETE' ? 'complete' : li.status === 'IN_PROGRESS' ? 'in-progress' : 'open'}>
                                  {li.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Labor ─────────────────────────────────────────────────── */}
            <TabsContent value="labor">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-xs text-content-muted">Total Hours</p>
                      <p className="font-mono text-lg font-bold text-content-primary">{totalActualHours.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-content-muted">Labor Billed</p>
                      <p className="font-mono text-lg font-bold text-intent-gold">{formatCurrency(totalLaborBilled)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-content-muted">Est. Labor</p>
                      <p className="font-mono text-lg font-bold text-content-secondary">{formatCurrency(estimatedTotalLaborBilled)}</p>
                    </div>
                  </div>
                  <Button size="sm" className="h-8 text-xs">Log Time</Button>
                </div>

                <div className="rounded-lg border border-surface-hover overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-hover bg-surface-panel">
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Date</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Technician</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                        <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Hours</th>
                        <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Rate</th>
                        <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Amount</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-content-muted">Billable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-hover">
                      {DEMO_LABOR_ENTRIES.map(entry => (
                        <tr key={entry.id} className="hover:bg-surface-hover/30">
                          <td className="py-2.5 px-4 font-mono text-xs text-content-secondary">{entry.date}</td>
                          <td className="py-2.5 px-4 text-xs text-content-primary">{entry.technician}</td>
                          <td className="py-2.5 px-4 text-xs text-content-secondary max-w-xs truncate">{entry.description}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-content-primary">{entry.hours.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-content-muted">${entry.rate}/h</td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-intent-primary">{formatCurrency(entry.hours * entry.rate)}</td>
                          <td className="py-2.5 px-4">
                            {entry.billable
                              ? <CheckCircle2 className="h-4 w-4 text-intent-success" />
                              : <span className="text-xs text-content-muted">Non-billable</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ── Parts ─────────────────────────────────────────────────── */}
            <TabsContent value="parts">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-content-secondary">Parts requested for this work order</p>
                  <Button size="sm" className="h-8 text-xs">Request Part</Button>
                </div>
                <div className="rounded-lg border border-surface-hover p-8 text-center text-sm text-content-muted">
                  No parts requested yet for this work order.
                </div>
              </div>
            </TabsContent>

            {/* ── Billing ───────────────────────────────────────────────── */}
            <TabsContent value="billing">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Billing Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {[
                      { label: 'Labor', value: totalLaborBilled, color: 'text-content-primary' },
                      { label: 'Parts', value: 0, color: 'text-content-primary' },
                      { label: `Shop Supplies (${formatPct(DEMO_WO.shopSuppliesPct)})`, value: shopSupplies, color: 'text-content-muted' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-content-muted">{label}</span>
                        <span className={`font-mono font-semibold ${color}`}>{formatCurrency(value)}</span>
                      </div>
                    ))}
                    <div className="border-t border-surface-hover pt-2 flex justify-between font-semibold">
                      <span className="text-content-primary">Current Total</span>
                      <span className="font-mono text-intent-gold">{formatCurrency(totalLaborBilled + shopSupplies)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-content-muted">
                      <span>Est. Total</span>
                      <span className="font-mono">{formatCurrency(DEMO_WO.estimatedTotal)}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Progressive Billing Milestones</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-content-muted">No milestones configured. Add milestones to enable progress billing.</p>
                    <Button variant="outline" size="sm" className="mt-3 h-8 text-xs">Add Milestone</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Compliance ────────────────────────────────────────────── */}
            <TabsContent value="compliance">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-content-secondary">{DEMO_COMPLIANCE.length} compliance items</p>
                  <Button size="sm" className="h-8 text-xs">Add Item</Button>
                </div>
                {DEMO_COMPLIANCE.map(item => (
                  <div key={item.id} className="rounded-lg border border-surface-hover bg-surface-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={item.type === 'AD' ? 'aog' : 'inspection'}>{item.type}</Badge>
                          <span className="font-mono text-xs text-content-secondary">{item.referenceId}</span>
                        </div>
                        <p className="text-sm text-content-primary">{item.description}</p>
                      </div>
                      <div className="ml-4 shrink-0">
                        {item.completedAt
                          ? <span className="flex items-center gap-1 text-xs text-intent-success"><CheckCircle2 className="h-3.5 w-3.5" />Complied</span>
                          : <span className="flex items-center gap-1 text-xs text-intent-warning"><Clock className="h-3.5 w-3.5" />Pending</span>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── History ───────────────────────────────────────────────── */}
            <TabsContent value="history">
              <div className="space-y-2">
                {DEMO_AUDIT.map((entry, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-xs text-content-muted w-32 shrink-0">{entry.at}</span>
                    <span className="text-content-muted shrink-0">{entry.user}</span>
                    <span className="text-content-secondary">{entry.action}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Squawk side panel */}
      <SquawkPanel
        open={squawkPanelOpen}
        onClose={() => setSquawkPanelOpen(false)}
        squawks={DEMO_SQUAWKS}
        workOrderNumber={DEMO_WO.number}
      />
    </div>
  );
}
