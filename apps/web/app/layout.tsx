import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: 'Arsenal Analytics — Aviation MRO Platform',
  description: 'Purpose-built financial operations for aviation MRO shops',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-primary text-content-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
