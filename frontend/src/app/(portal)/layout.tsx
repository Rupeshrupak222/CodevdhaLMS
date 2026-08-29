"use client";

import { useLMS } from '@/context/LMSContext';
import { Layout } from '@/components/layout/Layout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useLMS();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return <Layout>{children}</Layout>;
}
