import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type IntentColor = 'primary' | 'success' | 'warning' | 'danger' | 'gold' | 'muted';

interface KpiCardProps {
  title: string;
  value: string;
  subvalue?: string;
  delta?: string;
  deltaLabel?: string;
  deltaPositive?: boolean;
  icon?: LucideIcon;
  intent?: IntentColor;
  tooltip?: string;
}

const intentClasses: Record<IntentColor, string> = {
  primary: 'text-intent-primary',
  success: 'text-intent-success',
  warning: 'text-intent-warning',
  danger:  'text-intent-danger',
  gold:    'text-intent-gold',
  muted:   'text-content-muted',
};

const intentBgClasses: Record<IntentColor, string> = {
  primary: 'bg-intent-primary/10',
  success: 'bg-intent-success/10',
  warning: 'bg-intent-warning/10',
  danger:  'bg-intent-danger/10',
  gold:    'bg-intent-gold/10',
  muted:   'bg-surface-hover',
};

export function KpiCard({
  title,
  value,
  subvalue,
  delta,
  deltaLabel,
  deltaPositive,
  icon: Icon,
  intent = 'primary',
  tooltip,
}: KpiCardProps) {
  return (
    <Card className="bg-surface-card border-surface-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-medium uppercase tracking-wider text-content-muted truncate">{title}</p>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-content-muted shrink-0 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className={cn('text-2xl font-bold tabular-data', intentClasses[intent])}>{value}</p>
            {subvalue && <p className="mt-0.5 text-xs text-content-muted">{subvalue}</p>}
          </div>
          {Icon && (
            <div className={cn('ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', intentBgClasses[intent])}>
              <Icon className={cn('h-4 w-4', intentClasses[intent])} />
            </div>
          )}
        </div>
        {delta && (
          <div className="mt-3 flex items-center gap-1">
            <span className={cn('text-xs font-medium', deltaPositive ? 'text-intent-success' : 'text-intent-danger')}>
              {delta}
            </span>
            {deltaLabel && <span className="text-xs text-content-muted">{deltaLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
