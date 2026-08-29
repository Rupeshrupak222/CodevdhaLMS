import React from 'react';

export const metadata = {
  title: 'Face Verification — CODVEDHA LMS',
  description: 'Biometric identity verification for CODVEDHA LMS',
};

export default function MobileAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900">
      {children}
    </div>
  );
}
