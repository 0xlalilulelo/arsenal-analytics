import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MRO Ops — Aviation Financial Platform',
  description: 'Purpose-built financial operations for aviation MRO shops',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-primary text-content-primary antialiased">
        {children}
      </body>
    </html>
  );
}
