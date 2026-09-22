"use client";

import { useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const { user, activeRole } = useLMS();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else {
      const basePath = activeRole === 'faculty' ? '/teacher' : `/${activeRole}`;
      router.replace(`${basePath}/dashboard`);
    }
  }, [user, activeRole, router]);

  return (
    <div className="p-8 text-center text-slate-500 font-semibold">
      Redirecting to portal...
    </div>
  );
}
