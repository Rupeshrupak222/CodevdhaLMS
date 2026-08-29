"use client";

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { FloatingCharacter } from '../common/FloatingCharacter';

export const Layout = ({ children }: { children: React.ReactNode }) => {
 const [sidebarOpen, setSidebarOpen] = useState(false);

 return (
 <div className="min-h-screen flex bg-bg-main text-text-main transition-colors duration-300 relative">
 {/* Sidebar Navigation Drawer/Collapsible */}
 <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

 {/* Main Content Pane */}
 <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
 <React.Suspense fallback={null}>
 <Header onMenuClick={() => setSidebarOpen(true)} />
 </React.Suspense>
 
 {/* Scrollable Viewport */}
 <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-16">
 <div className="max-w-9xl mx-auto w-full">
 <React.Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold">Loading...</div>}>
 {children}
 </React.Suspense>
 </div>
 </main>

 {/* <Footer /> */}
 
 {/* Floating Animated Character */}
 {/* <FloatingCharacter /> */}
 </div>
 </div>
 );
};
