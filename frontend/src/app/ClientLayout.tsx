"use client";

import React, { useState, useEffect } from 'react';
import { LMSProvider } from '@/context/LMSContext';
import { Splash } from '@/auth/Splash';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

// Pages that should never show splash — they open instantly without any animation or redirect
const NO_SPLASH_PAGES = ['/privacy', '/terms', '/contact'];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isNoSplashPage = NO_SPLASH_PAGES.includes(pathname);
  const isLandingOrAuth = !isNoSplashPage && (pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/register');
  const [showSplash, setShowSplash] = useState(isLandingOrAuth);

  // If user navigates to a no-splash page, force splash off immediately
  useEffect(() => {
    if (isNoSplashPage) {
      setShowSplash(false);
    }
  }, [isNoSplashPage]);

  return (
    <LMSProvider skipAuthCheck={isNoSplashPage}>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#0F172A',
            color: '#FFFFFF',
            border: '1px solid #1E293B',
            fontSize: '12px',
            fontWeight: '600'
          }
        }} 
      />
      <AnimatePresence mode="wait">
        {showSplash ? (
          <Splash key="splash" onComplete={() => setShowSplash(false)} />
        ) : (
          <div key="routes" className="w-full h-full min-h-screen relative">
            {children}
          </div>
        )}
      </AnimatePresence>
    </LMSProvider>
  );
}
