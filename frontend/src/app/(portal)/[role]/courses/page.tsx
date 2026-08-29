"use client";

import { Suspense } from 'react';
import { Courses } from '@/screens/Courses';

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Loading courses...</div>}>
      <Courses />
    </Suspense>
  );
}

