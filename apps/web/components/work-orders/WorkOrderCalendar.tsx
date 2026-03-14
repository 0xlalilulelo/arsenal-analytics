'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CalWO = {
  id: string;
  number: string;
  type: string;
  status: string;
  dateOpened: string;
  estimatedClose: string | null;
  closedAt: string | null;
  customer: { name: string };
  aircraft: { nNumber: string } | null;
};

const TYPE_COLOR: Record<string, string> = {
  SCHEDULED:    'bg-intent-primary/20 text-intent-primary border-intent-primary/40',
  INSPECTION:   'bg-intent-success/20 text-intent-success border-intent-success/40',
  UNSCHEDULED:  'bg-intent-warning/20 text-intent-warning border-intent-warning/40',
  AOG:          'bg-intent-danger/20 text-intent-danger border-intent-danger/40',
};

const STATUS_DOT: Record<string, string> = {
  OPEN: 'bg-intent-primary',
  IN_PROGRESS: 'bg-intent-warning',
  AWAITING_PARTS: 'bg-intent-gold',
  AWAITING_APPROVAL: 'bg-purple-400',
  COMPLETE: 'bg-intent-success',
  INVOICED: 'bg-content-muted',
  CLOSED: 'bg-content-muted',
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function woSpansDay(wo: CalWO, day: Date): boolean {
  const opened = new Date(wo.dateOpened);
  const close = wo.closedAt ? new Date(wo.closedAt) : (wo.estimatedClose ? new Date(wo.estimatedClose) : null);
  if (close) {
    return opened <= day && day <= close;
  }
  // No close date: only show on opened day
  return isSameDay(opened, day);
}

export function WorkOrderCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['wo-calendar', year, month],
    queryFn: () => fetch(`/api/work-orders/calendar?year=${year}&month=${month}`).then(r => r.json()) as Promise<{ data: CalWO[] }>,
  });

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = i - firstDay + 1;
    cells.push(d >= 1 && d <= daysInMonth ? new Date(year, month - 1, d) : null);
  }

  const wos = data?.data ?? [];

  // Selected WO detail panel
  const selectedWo = selected ? wos.find(w => w.id === selected) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-content-primary">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Calendar grid */}
          <div className="flex-1 min-w-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-surface-hover mb-0">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-1.5 text-center text-xs font-semibold text-content-muted">
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="grid grid-cols-7 border-l border-t border-surface-hover">
              {cells.map((day, i) => {
                const dayWos = day ? wos.filter(wo => woSpansDay(wo, day)) : [];
                const isToday = day ? isSameDay(day, today) : false;
                return (
                  <div
                    key={i}
                    className={cn(
                      'border-r border-b border-surface-hover min-h-[90px] p-1 relative',
                      !day && 'bg-surface-hover/20',
                      isToday && 'bg-intent-primary/5',
                    )}
                  >
                    {day && (
                      <>
                        <span className={cn(
                          'text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full mb-1',
                          isToday
                            ? 'bg-intent-primary text-white'
                            : 'text-content-muted',
                        )}>
                          {day.getDate()}
                        </span>
                        <div className="space-y-0.5">
                          {dayWos.slice(0, 3).map(wo => (
                            <button
                              key={wo.id}
                              onClick={() => setSelected(selected === wo.id ? null : wo.id)}
                              className={cn(
                                'w-full text-left px-1.5 py-0.5 rounded border text-xs truncate flex items-center gap-1 transition-opacity hover:opacity-80',
                                TYPE_COLOR[wo.type] ?? TYPE_COLOR.SCHEDULED,
                                selected === wo.id && 'ring-1 ring-intent-primary',
                              )}
                            >
                              <span
                                className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[wo.status] ?? 'bg-content-muted')}
                              />
                              <span className="font-mono">{wo.number}</span>
                            </button>
                          ))}
                          {dayWos.length > 3 && (
                            <p className="text-xs text-content-muted pl-1">+{dayWos.length - 3} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {Object.entries(TYPE_COLOR).map(([type, cls]) => (
                <span key={type} className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs', cls)}>
                  {type}
                </span>
              ))}
              <span className="text-xs text-content-muted ml-auto">Click a work order to view details</span>
            </div>
          </div>

          {/* Detail side panel */}
          {selectedWo && (
            <div className="w-64 shrink-0 rounded-lg border border-surface-hover bg-surface-panel p-4 space-y-3 self-start sticky top-0">
              <div>
                <p className="font-mono text-sm font-bold text-intent-primary">{selectedWo.number}</p>
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs mt-1', TYPE_COLOR[selectedWo.type] ?? '')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[selectedWo.status] ?? 'bg-content-muted')} />
                  {selectedWo.type} · {selectedWo.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <p className="text-content-muted">Customer</p>
                  <p className="text-content-primary font-medium">{selectedWo.customer.name}</p>
                </div>
                {selectedWo.aircraft && (
                  <div>
                    <p className="text-content-muted">Aircraft</p>
                    <p className="font-mono text-content-primary">{selectedWo.aircraft.nNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-content-muted">Opened</p>
                  <p className="text-content-primary">{new Date(selectedWo.dateOpened).toLocaleDateString()}</p>
                </div>
                {selectedWo.estimatedClose && (
                  <div>
                    <p className="text-content-muted">Est. Close</p>
                    <p className="text-content-primary">{new Date(selectedWo.estimatedClose).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedWo.closedAt && (
                  <div>
                    <p className="text-content-muted">Closed</p>
                    <p className="text-intent-success">{new Date(selectedWo.closedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              <Link href={`/work-orders/${selectedWo.id}`} className="block">
                <Button size="sm" className="w-full h-7 text-xs">Open Work Order</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
