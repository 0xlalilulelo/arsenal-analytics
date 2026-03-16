import { AppSidebar } from '@/components/layout/AppSidebar';
import { AogBanner } from '@/components/layout/AogBanner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { prisma } from '@mro/db';

async function getAogCount(): Promise<number> {
  try {
    return await prisma.workOrder.count({
      where: { type: 'AOG', status: { in: ['OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL'] } },
    });
  } catch {
    return 0;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const aogCount = await getAogCount();

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-surface-base">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AogBanner aogCount={aogCount} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
