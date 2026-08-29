"use client";

import React, { useEffect } from 'react';
import { Auth } from '@/auth/Auth';
import { useLMS } from '@/context/LMSContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { user } = useLMS();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  if (user) return null;
  return <Auth />;
}
