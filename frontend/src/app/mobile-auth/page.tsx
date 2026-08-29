'use client';

import React, { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const FaceAuthModal = dynamic(
  () => import('@/auth/FaceAuthModal').then(mod => mod.FaceAuthModal),
  { ssr: false, loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )}
);

function MobileAuthContent() {
  const searchParams = useSearchParams();
  const tempToken = searchParams.get('tempToken') || '';
  const mode = (searchParams.get('mode') as 'enroll' | 'verify') || 'verify';
  const avatarUrl = searchParams.get('avatarUrl') || null;

  const [isLoading, setIsLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!tempToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="text-center">
          <p className="text-red-400 font-semibold text-lg">Invalid session.</p>
          <p className="text-slate-400 mt-2 text-sm">Please return to the app and try logging in again.</p>
          <button
            onClick={() => { window.location.href = 'codvedhalms://auth?cancelled=true'; }}
            className="mt-6 px-6 py-3 bg-indigo-600 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-400 font-bold text-xl">Verified!</p>
          <p className="text-slate-400 mt-2 text-sm">Returning to CODVEDHA LMS app...</p>
          <p className="text-slate-500 mt-4 text-xs">If the app didn't open automatically, tap the button below.</p>
          <button
            onClick={() => { window.location.href = 'codvedhalms://auth?token=' + encodeURIComponent(sessionStorage.getItem('_mob_token') || ''); }}
            className="mt-4 px-6 py-3 bg-emerald-600 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm"
          >
            Open App
          </button>
        </div>
      </div>
    );
  }

  const handleSuccess = async (embedding: number[], imageBase64?: string) => {
    setIsLoading(true);
    setExternalError(null);

    try {
      const endpoint = mode === 'enroll' ? '/auth/face-enroll' : '/auth/face-verify';
      const payload = mode === 'enroll'
        ? { tempToken, embedding, imageBase64 }
        : { tempToken, embedding };

      const res = await api.post(endpoint, payload);
      const accessToken = res.data?.data?.accessToken || res.data?.accessToken;
      const userName = res.data?.data?.user?.name || '';
      const userRole = res.data?.data?.user?.role || '';

      if (!accessToken) throw new Error('No access token in response');

      // Store token temporarily for the fallback button
      sessionStorage.setItem('_mob_token', accessToken);
      setDone(true);

      // Redirect back to app via deep link
      const deepLink = `codvedhalms://auth?token=${encodeURIComponent(accessToken)}&name=${encodeURIComponent(userName)}&role=${encodeURIComponent(userRole)}`;
      window.location.href = deepLink;

    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification failed. Please try again.';
      setExternalError(msg);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    window.location.href = 'codvedhalms://auth?cancelled=true';
  };

  return (
    <FaceAuthModal
      mode={mode}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      isLoading={isLoading}
      avatarUrl={avatarUrl}
      externalError={externalError}
    />
  );
}

export default function MobileAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MobileAuthContent />
    </Suspense>
  );
}
