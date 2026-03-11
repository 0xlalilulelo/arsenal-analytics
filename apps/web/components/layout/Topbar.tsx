import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-surface-hover bg-surface-primary px-6">
      <div>
        <h1 className="text-base font-semibold text-content-primary">{title}</h1>
        {subtitle && <p className="text-xs text-content-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
