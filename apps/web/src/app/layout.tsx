import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Devigo — quantitative +EV ticket construction',
  description:
    'See what a bet really pays: we strip the bookmaker commission out of the odds, compare across books, and show how often a ticket like yours actually cashes.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Devigo' },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas font-sans text-[#f4f4f5] antialiased">{children}</body>
    </html>
  );
}
