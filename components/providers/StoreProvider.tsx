'use client';

import { useEffect } from 'react';
import { useKYCStore } from '@/lib/store';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Manually trigger hydration
    useKYCStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
