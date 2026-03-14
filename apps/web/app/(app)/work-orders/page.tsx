'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { WorkOrdersTable } from '@/components/work-orders/WorkOrdersTable';
import { WorkOrderCalendar } from '@/components/work-orders/WorkOrderCalendar';
import { Button } from '@/components/ui/button';
import { Plus, List, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'calendar';

export default function WorkOrdersPage() {
  const [view, setView] = useState<ViewMode>('list');

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Work Orders"
        subtitle={view === 'calendar' ? 'Calendar view' : 'All work orders'}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-md border border-surface-hover bg-surface-card p-0.5 gap-0.5">
              <button
                onClick={() => setView('list')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors',
                  view === 'list'
                    ? 'bg-surface-panel text-content-primary shadow-sm'
                    : 'text-content-muted hover:text-content-primary',
                )}
              >
                <List className="h-3.5 w-3.5" />List
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors',
                  view === 'calendar'
                    ? 'bg-surface-panel text-content-primary shadow-sm'
                    : 'text-content-muted hover:text-content-primary',
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />Calendar
              </button>
            </div>

            <Link href="/work-orders/new">
              <Button size="sm" className="h-8 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />New
              </Button>
            </Link>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {view === 'list' ? (
          <WorkOrdersTable />
        ) : (
          <WorkOrderCalendar />
        )}
      </div>
    </div>
  );
}
