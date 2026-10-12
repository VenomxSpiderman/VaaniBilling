import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VaaniBilling | Ambient Voice-to-Ledger for Bharat',
  description: 'AI-powered voice POS, vernacular invoicing, and udhaar ledger for Indian merchants powered by Sarvam AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-stone-50 text-stone-900 selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}

