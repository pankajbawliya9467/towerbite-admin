import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { SessionProvider } from '@/components/Session';
import './globals.css';

export const metadata: Metadata = { title: 'TowerBites Cafe', description: 'Live orders, menu and admin for TowerBites cafes' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render per request, so every page gets the CSP nonce from proxy.ts.
  await connection();
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
