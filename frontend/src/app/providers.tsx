'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

const Web3Providers = dynamic(() => import('./web3-providers').then((m) => m.Web3Providers), {
  ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <Web3Providers>{children}</Web3Providers>;
}
