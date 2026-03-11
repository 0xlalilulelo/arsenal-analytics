'use client';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

interface AogBannerProps {
  aogCount: number;
}

export function AogBanner({ aogCount }: AogBannerProps) {
  if (aogCount === 0) return null;

  return (
    <Link
      href="/aog"
      className="flex items-center justify-center gap-2 bg-intent-danger px-4 py-2 text-sm font-semibold text-white hover:bg-intent-danger/90 transition-colors"
    >
      <AlertTriangle className="h-4 w-4 animate-pulse" />
      <span>
        {aogCount} ACTIVE AOG {aogCount === 1 ? 'WORK ORDER' : 'WORK ORDERS'} — Click to view
      </span>
    </Link>
  );
}
