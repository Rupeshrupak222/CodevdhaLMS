"use client";

import { useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const { user, activeRole } = useLMS();
  const router = useRouter();

  console.log('[RootPage] user:', user, 'activeRole:', activeRole);

  useEffect(() => {
    if (!user) {
      console.log('[RootPage] No user, redirecting to /login');
      router.replace('/login');
    } else {
      const basePath = activeRole === 'faculty' ? '/teacher' : `/${activeRole}`;
      console.log('[RootPage] Redirecting to:', `${basePath}/dashboard`);
      router.replace(`${basePath}/dashboard`);
    }
  }, [user, activeRole, router]);

  return (
    <div className="p-8 text-center text-slate-500 font-semibold">
      Redirecting to portal...
    </div>
  );
}
