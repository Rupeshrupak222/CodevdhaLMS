"use client";

import { Suspense } from 'react';
import { Attendance } from '@/screens/Attendance';

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Loading attendance ledger...</div>}>
      <Attendance />
    </Suspense>
  );
}

