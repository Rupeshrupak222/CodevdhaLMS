"use client";

import { Suspense } from 'react';
import { Tasks } from '@/screens/Tasks';

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Loading tasks...</div>}>
      <Tasks />
    </Suspense>
  );
}

