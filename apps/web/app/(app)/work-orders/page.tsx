import { Topbar } from '@/components/layout/Topbar';
import { WorkOrdersTable } from '@/components/work-orders/WorkOrdersTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function WorkOrdersPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Work Orders"
        subtitle="All work orders · Jan 15, 2025"
        actions={
          <Link href="/work-orders/new">
            <Button size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <WorkOrdersTable />
      </div>
    </div>
  );
}
