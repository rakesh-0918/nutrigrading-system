import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Srujuna',
  description: 'Voice-first food risk education for India'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


