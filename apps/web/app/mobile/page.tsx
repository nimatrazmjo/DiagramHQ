'use client';

import React, { useEffect, useState } from 'react';
import { MobileCompanion } from '../../components/enterprise/mobile-companion';

export default function MobilePage(): JSX.Element {
  const [viewportWidth, setViewportWidth] = useState<number>(375);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setViewportWidth(window.innerWidth);
      const handleResize = () => setViewportWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return (
    <main className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col">
      <MobileCompanion isOpen={true} viewportWidth={viewportWidth} />
    </main>
  );
}
