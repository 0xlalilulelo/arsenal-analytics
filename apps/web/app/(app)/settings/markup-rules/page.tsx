'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_MARKUP_TIERS, getMarkupBreakdown } from '@mro/core';
import { Save, RefreshCw, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type MarkupRuleRow = {
  id: string | null;
  orgId: string;
  label: string;
  minCost: number;
  maxCost: number | null;
  markupPct: number;
  sortOrder: number;
};

const PREVIEW_COSTS = [10, 50, 200, 1000, 3000, 8000];

function useMarkupRules() {
  return useQuery({
    queryKey: ['markup-rules'],
    queryFn: async () => {
      const res = await fetch('/api/settings/markup-rules');
      if (!res.ok) throw new Error('Failed to load markup rules');
      return res.json() as Promise<{ data: MarkupRuleRow[]; isDefault: boolean }>;
    },
  });
}

function useSaveMarkupRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rules: MarkupRuleRow[]) => {
      const res = await fetch('/api/settings/markup-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) throw new Error('Failed to save markup rules');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markup-rules'] }),
  });
}

export default function MarkupRulesPage() {
  const { data, isLoading } = useMarkupRules();
  const { mutateAsync: saveRules, isPending: saving, isSuccess: saved } = useSaveMarkupRules();

  const [rows, setRows] = useState<MarkupRuleRow[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.data) {
      setRows(data.data);
      setDirty(false);
    }
  }, [data]);

  function updateRow(idx: number, field: keyof MarkupRuleRow, value: string | number | null) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    setDirty(true);
  }

  function resetDefaults() {
    const org = data?.data?.[0]?.orgId ?? '';
    setRows(DEFAULT_MARKUP_TIERS.map((t, i) => ({
      id: null,
      orgId: org,
      label: t.label,
      minCost: t.minCost,
      maxCost: t.maxCost,
      markupPct: t.markupPct,
      sortOrder: i,
    })));
    setDirty(true);
  }

  async function handleSave() {
    await saveRules(rows);
    setDirty(false);
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Markup Rules"
        subtitle="Sliding-scale parts markup tiers"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={resetDefaults}>
              <RefreshCw className="h-3.5 w-3.5" />Reset Defaults
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : saved && !dirty
                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                  : <Save className="h-3.5 w-3.5" />
              }
              {saved && !dirty ? 'Saved' : 'Save Rules'}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
          </div>
        ) : (
          <>
            {data?.isDefault && (
              <div className="flex items-center gap-2 rounded-md border border-intent-warning/40 bg-intent-warning/10 px-4 py-2.5 text-xs text-content-secondary">
                <AlertTriangle className="h-4 w-4 text-intent-warning shrink-0" />
                Using default industry-standard tiers. Save to persist custom rules.
              </div>
            )}

            {/* Editable tiers */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Markup Tiers</p>
                <p className="text-xs text-content-muted">Set the markup percentage for each cost range. Last tier should have no upper bound.</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 pb-1">
                    <div className="col-span-3 text-xs font-medium text-content-muted">Label</div>
                    <div className="col-span-2 text-xs font-medium text-content-muted">Min Cost ($)</div>
                    <div className="col-span-2 text-xs font-medium text-content-muted">Max Cost ($)</div>
                    <div className="col-span-2 text-xs font-medium text-content-muted">Markup %</div>
                    <div className="col-span-3 text-xs font-medium text-content-muted">Preview (sell @ min)</div>
                  </div>
                  {rows.map((row, idx) => {
                    const sampleCost = row.minCost === 0 ? 10 : row.minCost;
                    const sellPrice = sampleCost * (1 + row.markupPct);
                    const margin = ((sellPrice - sampleCost) / sellPrice) * 100;
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <Input
                            value={row.label}
                            onChange={e => updateRow(idx, 'label', e.target.value)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            value={row.minCost}
                            onChange={e => updateRow(idx, 'minCost', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            placeholder="∞"
                            value={row.maxCost ?? ''}
                            onChange={e => updateRow(idx, 'maxCost', e.target.value ? parseFloat(e.target.value) : null)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.05"
                            min="0"
                            max="10"
                            value={(row.markupPct * 100).toFixed(0)}
                            onChange={e => updateRow(idx, 'markupPct', (parseFloat(e.target.value) || 0) / 100)}
                            className="h-8 text-xs font-mono"
                          />
                          <span className="text-xs text-content-muted">%</span>
                        </div>
                        <div className="col-span-3 text-xs font-mono text-content-secondary">
                          {formatCurrency(sampleCost)} → <span className="text-intent-primary font-semibold">{formatCurrency(sellPrice)}</span>
                          <span className="text-content-muted ml-1">({margin.toFixed(0)}% margin)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Live preview table */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Live Preview</p>
                <p className="text-xs text-content-muted">How sample part costs map to sell prices under current rules.</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="rounded-lg border border-surface-hover overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-hover bg-surface-panel">
                        <th className="text-right py-2 px-4 text-content-muted font-semibold">Cost</th>
                        <th className="text-left py-2 px-4 text-content-muted font-semibold">Tier</th>
                        <th className="text-right py-2 px-4 text-content-muted font-semibold">Markup %</th>
                        <th className="text-right py-2 px-4 text-content-muted font-semibold">Markup $</th>
                        <th className="text-right py-2 px-4 text-content-muted font-semibold">Sell Price</th>
                        <th className="text-right py-2 px-4 text-content-muted font-semibold">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-hover">
                      {PREVIEW_COSTS.map(cost => {
                        const activeTiers = rows.length > 0 ? rows.map(r => ({
                          label: r.label,
                          minCost: r.minCost,
                          maxCost: r.maxCost,
                          markupPct: r.markupPct,
                        })) : undefined;
                        const bd = getMarkupBreakdown(cost, activeTiers);
                        return (
                          <tr key={cost} className="hover:bg-surface-hover/30">
                            <td className="py-2 px-4 text-right font-mono text-content-muted">{formatCurrency(cost)}</td>
                            <td className="py-2 px-4">
                              <Badge variant="default" className="text-xs">{bd.tierLabel}</Badge>
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-content-secondary">{(bd.markupPct * 100).toFixed(0)}%</td>
                            <td className="py-2 px-4 text-right font-mono text-content-secondary">+{formatCurrency(bd.markupAmount)}</td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-intent-primary">{formatCurrency(bd.billPrice)}</td>
                            <td className="py-2 px-4 text-right font-mono text-content-secondary">{(bd.marginPct * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
