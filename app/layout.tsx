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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
