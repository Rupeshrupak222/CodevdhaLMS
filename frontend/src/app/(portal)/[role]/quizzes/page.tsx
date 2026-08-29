"use client";

import { Suspense } from 'react';
import { Quizzes } from '@/screens/Quizzes';

export default function QuizzesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Loading quizzes...</div>}>
      <Quizzes />
    </Suspense>
  );
}

