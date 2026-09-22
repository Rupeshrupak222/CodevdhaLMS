"use client";

import { useLMS } from '@/context/LMSContext';
import { Layout } from '@/components/layout/Layout';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Maps a user's DB role to the URL segment they are allowed to access.
const ROLE_TO_PATH: Record<string, string> = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useLMS();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Not loaded yet — wait
    if (isLoading) return;

    // Not logged in — go to login
    if (!user) {
      router.replace('/login');
      return;
    }

    // Derive the URL role segment from the current path (e.g. /admin/..., /teacher/..., /student/...)
    const urlRoleSegment = pathname.split('/')[1]; // 'admin' | 'teacher' | 'student'
    const allowedSegment = ROLE_TO_PATH[user.role as string];

    // If the URL role doesn't match the user's actual role, redirect to their correct dashboard.
    // This prevents a STUDENT from visiting /admin/students, /teacher/dashboard etc.
    if (allowedSegment && urlRoleSegment !== allowedSegment) {
      router.replace(`/${allowedSegment}/dashboard`);
    }
  }, [user, isLoading, router, pathname]);

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
