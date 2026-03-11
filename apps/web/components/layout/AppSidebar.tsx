'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  Package,
  FileText,
  ShieldCheck,
  BarChart3,
  Settings,
  Plane,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/work-orders', label: 'Work Orders',  icon: ClipboardList },
  { href: '/aog',        label: 'AOG',           icon: AlertTriangle,  highlight: true },
  { href: '/parts',      label: 'Parts & POs',   icon: Package },
  { href: '/invoices',   label: 'Invoices',      icon: FileText },
  { href: '/compliance', label: 'Compliance',    icon: ShieldCheck },
  { href: '/analytics',  label: 'Analytics',     icon: BarChart3 },
];

const settingsItems = [
  { href: '/settings',   label: 'Settings',      icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col bg-surface-panel border-r border-surface-hover">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-surface-hover px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-intent-primary/20">
          <Wrench className="h-4 w-4 text-intent-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-content-primary leading-tight">MRO Ops</p>
          <p className="text-xs text-content-muted leading-tight">Skyline Aviation</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, highlight }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-surface-active text-content-primary'
                      : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary',
                    highlight && !active && 'text-intent-danger hover:text-intent-danger',
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', highlight && !active && 'text-intent-danger')} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: settings */}
      <div className="border-t border-surface-hover py-3 px-2">
        {settingsItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-surface-active text-content-primary'
                  : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
