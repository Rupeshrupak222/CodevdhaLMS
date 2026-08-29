"use client";

import { Suspense } from 'react';
import { Students } from '@/screens/Students';

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Loading students...</div>}>
      <Students />
    </Suspense>
  );
}

