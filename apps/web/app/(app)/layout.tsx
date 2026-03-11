import { AppSidebar } from '@/components/layout/AppSidebar';
import { AogBanner } from '@/components/layout/AogBanner';
import { TooltipProvider } from '@/components/ui/tooltip';

// In production, fetch active AOG count from DB
async function getAogCount(): Promise<number> {
  // This would be a server-side DB call
  // For demo: return 1 to show the AOG banner
  return 1;
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
