import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default:          'border-surface-hover bg-surface-card text-content-secondary',
        open:             'border-surface-hover bg-surface-card text-content-secondary',
        'in-progress':    'border-intent-primary/30 bg-intent-primary/20 text-intent-primary',
        'awaiting-parts': 'border-intent-warning/30 bg-intent-warning/20 text-intent-warning',
        'awaiting-approval': 'border-intent-gold/30 bg-intent-gold/20 text-intent-gold',
        complete:         'border-intent-success/30 bg-intent-success/20 text-intent-success',
        invoiced:         'border-intent-primary/30 bg-intent-primary/20 text-intent-primary',
        closed:           'border-surface-hover bg-surface-panel text-content-muted',
        aog:              'border-intent-danger bg-intent-danger text-white',
        paid:             'border-intent-success/30 bg-intent-success/20 text-intent-success',
        overdue:          'border-intent-danger/30 bg-intent-danger/20 text-intent-danger',
        draft:            'border-surface-hover bg-surface-card text-content-muted',
        sent:             'border-intent-primary/30 bg-intent-primary/20 text-intent-primary',
        partial:          'border-intent-warning/30 bg-intent-warning/20 text-intent-warning',
        inspection:       'border-intent-primary/30 bg-intent-primary/20 text-intent-primary',
        scheduled:        'border-surface-hover bg-surface-card text-content-secondary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
