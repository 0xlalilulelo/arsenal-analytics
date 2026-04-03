'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
      <AlertTriangle className="h-8 w-8 text-intent-warning" />
      <h2 className="text-lg font-semibold text-content-primary">Something went wrong</h2>
      <p className="text-sm text-content-muted text-center max-w-sm">
        {error.message || 'An unexpected error occurred loading this page.'}
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  );
}
