'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export type PartRow = {
  id: string;
  partNumber: string;
  altPartNumber?: string | null;
  description: string;
  manufacturer?: string | null;
  condition: string;
  qtyOnHand: number;
  reorderPoint?: number | null;
  unitCost: number;
  defaultMarkupPct: number;
  location?: string | null;
  isTraceable: boolean;
};

const CONDITION_VARIANT: Record<string, 'complete' | 'in-progress' | 'open' | 'inspection' | 'default'> = {
  NEW: 'complete',
  SERVICEABLE: 'inspection',
  OVERHAULED: 'inspection',
  REPAIRED: 'in-progress',
  AS_REMOVED: 'open',
  CORE: 'open',
};

export function PartsTable({ parts, onEdit }: { parts: PartRow[]; onEdit?: (part: PartRow) => void }) {
  if (parts.length === 0) {
    return (
      <div className="rounded-lg border border-surface-hover p-12 text-center">
        <p className="text-sm text-content-muted">No parts in inventory. Add your first part to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-hover overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-hover bg-surface-panel">
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Part Number</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Condition</th>
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Qty on Hand</th>
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Unit Cost</th>
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Markup</th>
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Sell Price</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Location</th>
            <th className="py-2.5 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-hover">
          {parts.map(part => {
            const sellPrice = part.unitCost * (1 + part.defaultMarkupPct / 100);
            const isLow = part.reorderPoint !== null && part.reorderPoint !== undefined && part.qtyOnHand <= part.reorderPoint;

            return (
              <tr key={part.id} className={`hover:bg-surface-hover/30 ${isLow ? 'bg-intent-warning/5' : ''}`}>
                <td className="py-3 px-4">
                  <p className="font-mono text-xs font-semibold text-content-primary">{part.partNumber}</p>
                  {part.altPartNumber && (
                    <p className="font-mono text-xs text-content-muted">Alt: {part.altPartNumber}</p>
                  )}
                  {part.isTraceable && (
                    <span className="text-xs text-intent-primary">8130-3 req.</span>
                  )}
                </td>
                <td className="py-3 px-4 max-w-xs">
                  <p className="text-xs text-content-primary">{part.description}</p>
                  {part.manufacturer && (
                    <p className="text-xs text-content-muted">{part.manufacturer}</p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={CONDITION_VARIANT[part.condition] ?? 'default'}>
                    {part.condition.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isLow && <AlertTriangle className="h-3.5 w-3.5 text-intent-warning" />}
                    <span className={`font-mono text-xs font-semibold ${isLow ? 'text-intent-warning' : 'text-content-primary'}`}>
                      {part.qtyOnHand}
                    </span>
                  </div>
                  {part.reorderPoint !== null && part.reorderPoint !== undefined && (
                    <p className="text-xs text-content-muted">Min: {part.reorderPoint}</p>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-content-muted">
                  {formatCurrency(part.unitCost)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-content-secondary">
                  {part.defaultMarkupPct.toFixed(0)}%
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-intent-primary font-semibold">
                  {formatCurrency(sellPrice)}
                </td>
                <td className="py-3 px-4 text-xs text-content-muted font-mono">
                  {part.location ?? '—'}
                </td>
                <td className="py-3 px-4">
                  {onEdit && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit(part)}>
                      Edit
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
