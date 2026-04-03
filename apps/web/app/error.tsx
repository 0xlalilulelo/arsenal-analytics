'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-xl font-semibold text-content-primary">Something went wrong</h1>
            <p className="text-sm text-content-muted">
              An unexpected error occurred. If this persists, please contact support.
            </p>
            <Button onClick={reset} variant="outline" size="sm">
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
