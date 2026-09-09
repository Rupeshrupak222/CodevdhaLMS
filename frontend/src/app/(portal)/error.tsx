"use client";

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error('[PortalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          An unexpected error occurred. You can try refreshing this page or contact support if the problem persists.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a855f7] hover:bg-purple-400 text-white font-semibold rounded-xl transition"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
