"use client";

import { Suspense } from 'react';
import { Faculty } from '@/screens/Faculty';

export default function FacultyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Loading faculty...</div>}>
      <Faculty />
    </Suspense>
  );
}

