import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'DiagramHQ',
  description: 'Model-first architecture intelligence platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
