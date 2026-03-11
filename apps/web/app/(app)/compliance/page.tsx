'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertTriangle, Search, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const DEMO_COMPLIANCE = [
  {
    id: 'c-1',
    type: 'AD',
    referenceId: 'AD 2023-09-11',
    title: 'Cessna: Elevator Trim Tab Actuator Inspection',
    aircraft: 'N5572K',
    make: 'Cessna 172S',
    description: 'Inspect and replace elevator trim tab actuator — recurring 100hr',
    dueDate: '2026-04-15',
    dueTtsn: 3200,
    currentTtsn: 3142.5,
    status: 'OPEN',
    isAirworthiness: true,
  },
  {
    id: 'c-2',
    type: 'AD',
    referenceId: 'AD 2022-14-03',
    title: 'Lycoming: Crankshaft Gear Inspection',
    aircraft: 'N88471',
    make: 'Piper PA-28',
    description: 'Inspect crankshaft gear for cracks at annual',
    dueDate: '2026-03-01',
    dueTtsn: null,
    currentTtsn: null,
    status: 'OPEN',
    isAirworthiness: true,
  },
  {
    id: 'c-3',
    type: 'SB',
    referenceId: 'Cessna SEB95-4',
    title: 'Fuel Injection System Cleaning',
    aircraft: 'N5572K',
    make: 'Cessna 172S',
    description: 'Fuel injection system cleaning service bulletin — at annual or 500hr',
    dueDate: null,
    dueTtsn: 3500,
    currentTtsn: 3142.5,
    status: 'OPEN',
    isAirworthiness: false,
  },
  {
    id: 'c-4',
    type: 'ANNUAL',
    referenceId: 'FAR 91.409',
    title: 'Annual Inspection',
    aircraft: 'N33401',
    make: 'Beechcraft Bonanza V35B',
    description: 'Annual airworthiness inspection per FAR 43 Appendix D',
    dueDate: '2026-06-30',
    dueTtsn: null,
    currentTtsn: null,
    status: 'OPEN',
    isAirworthiness: true,
  },
  {
    id: 'c-5',
    type: 'AD',
    referenceId: 'AD 2021-20-06',
    title: 'Bendix Magneto Inspection',
    aircraft: 'N88471',
    make: 'Piper PA-28',
    description: 'Inspect magneto points and timing — 500hr recurring',
    dueDate: '2026-05-10',
    dueTtsn: 2500,
    currentTtsn: 2387,
    status: 'COMPLETED',
    isAirworthiness: true,
  },
];

const TYPE_COLORS: Record<string, string> = {
  AD: 'aog',
  SB: 'scheduled',
  ANNUAL: 'inspection',
  '100HR': 'inspection',
  STC: 'default',
  FORM_337: 'default',
};

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  OPEN: { label: 'Open', icon: <Clock className="h-3.5 w-3.5" />, className: 'text-intent-warning' },
  COMPLETED: { label: 'Completed', icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: 'text-intent-success' },
  DEFERRED: { label: 'Deferred', icon: <AlertTriangle className="h-3.5 w-3.5" />, className: 'text-intent-danger' },
  IN_PROGRESS: { label: 'In Progress', icon: <Clock className="h-3.5 w-3.5" />, className: 'text-intent-primary' },
};

export default function CompliancePage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  const filtered = DEMO_COMPLIANCE.filter(item => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.referenceId.toLowerCase().includes(search.toLowerCase()) ||
      item.aircraft.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const openCount = DEMO_COMPLIANCE.filter(c => c.status === 'OPEN').length;
  const overdueCount = DEMO_COMPLIANCE.filter(c => {
    if (c.status !== 'OPEN' || !c.dueDate) return false;
    return new Date(c.dueDate) < new Date();
  }).length;

  const types = [...new Set(DEMO_COMPLIANCE.map(c => c.type))];

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Compliance Tracking"
        subtitle="ADs, Service Bulletins, and Inspection Due Lists"
        actions={
          <Button size="sm" className="h-8 text-xs">Add Compliance Item</Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Items', value: DEMO_COMPLIANCE.length, color: 'text-content-primary' },
            { label: 'Open / Due', value: openCount, color: 'text-intent-warning' },
            { label: 'Overdue', value: overdueCount, color: 'text-intent-danger' },
            { label: 'Completed', value: DEMO_COMPLIANCE.filter(c => c.status === 'COMPLETED').length, color: 'text-intent-success' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
            <Input
              placeholder="Search by reference, title, or aircraft..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Filter className="h-4 w-4 text-content-muted" />
          {types.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                filterType === type
                  ? 'bg-intent-primary/20 border-intent-primary text-intent-primary'
                  : 'border-surface-hover text-content-muted hover:text-content-primary'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Compliance table */}
        <div className="rounded-lg border border-surface-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-hover bg-surface-panel">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Type</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Reference</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Aircraft</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Due Date</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Due TTSN</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Status</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {filtered.map(item => {
                const isOverdue =
                  item.status === 'OPEN' && item.dueDate && new Date(item.dueDate) < new Date();
                const statusInfo = STATUS_LABELS[item.status] ?? STATUS_LABELS.OPEN;
                const hoursRemaining = item.dueTtsn && item.currentTtsn
                  ? item.dueTtsn - item.currentTtsn
                  : null;

                return (
                  <tr key={item.id} className={`hover:bg-surface-hover/30 ${isOverdue ? 'bg-intent-danger/5' : ''}`}>
                    <td className="py-3 px-4">
                      <Badge variant={TYPE_COLORS[item.type] as 'aog' | 'scheduled' | 'inspection' | 'default'}>
                        {item.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-content-secondary">{item.referenceId}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-content-primary font-medium text-xs">{item.title}</p>
                      <p className="text-content-muted text-xs truncate">{item.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono text-xs text-content-primary">{item.aircraft}</p>
                      <p className="text-xs text-content-muted">{item.make}</p>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {item.dueDate ? (
                        <span className={isOverdue ? 'text-intent-danger font-semibold' : 'text-content-secondary'}>
                          {formatDate(item.dueDate)}
                          {isOverdue && ' ⚠'}
                        </span>
                      ) : (
                        <span className="text-content-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {hoursRemaining !== null ? (
                        <span className={hoursRemaining < 100 ? 'text-intent-warning' : 'text-content-secondary'}>
                          {item.dueTtsn?.toLocaleString()}h
                          <span className="text-content-muted ml-1">({hoursRemaining.toFixed(0)}h rem)</span>
                        </span>
                      ) : item.dueTtsn ? (
                        <span className="text-content-secondary">{item.dueTtsn.toLocaleString()}h</span>
                      ) : (
                        <span className="text-content-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        {item.status === 'OPEN' ? 'Mark Complete' : 'View'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
