"use client";

import React, { useState, startTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLMS } from '@/context/LMSContext';
import { 
 LayoutDashboard, Users, BookOpen, FolderOpen, Award, 
 ClipboardList, Calendar, Video, ShieldAlert, BarChart3, 
 Settings, ChevronRight, GraduationCap, X, ChevronDown,
 LogOut, ChevronLeft, Menu, FileCheck, TrendingUp, Layers
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
 const pathname = usePathname();
 const router = useRouter();
 const { activeRole, logout } = useLMS();
 const [isCollapsed, setIsCollapsed] = useState(false);

 const toggleCollapse = () => setIsCollapsed(!isCollapsed);

 // ── Admin Menu Items ──
 const adminMenuItems = [
 { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
 { label: 'Student Management', icon: Users, path: '/students' },
 { label: 'Faculty Management', icon: GraduationCap, path: '/faculty' },
 { label: 'Course Management', icon: BookOpen, path: '/courses' },
 { label: 'Batch Management', icon: Layers, path: '/batches' },
 { label: 'Learning Materials', icon: FolderOpen, path: '/materials' },
 { label: 'Quiz Management', icon: Award, path: '/quizzes' },
 { label: 'Assignments', icon: ClipboardList, path: '/tasks' },
 { label: 'Online Classes', icon: Video, path: '/classes' },
 { label: 'Student Performance', icon: TrendingUp, path: '/performance' },
 { label: 'Attendance', icon: Calendar, path: '/attendance' },
 { label: 'Certificates', icon: FileCheck, path: '/certificates' },
 { label: 'Settings', icon: Settings, path: '/settings' }
 ];

 // ── Faculty Menu Items ──
 const facultyMenuItems = [
 { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
 { label: 'My Students', icon: Users, path: '/students' },
 { label: 'Course Management', icon: BookOpen, path: '/courses' },
 { label: 'Batch Management', icon: Layers, path: '/batches' },
 { label: 'Learning Materials', icon: FolderOpen, path: '/materials' },
 { label: 'Assignments', icon: ClipboardList, path: '/tasks' },
 { label: 'Quizzes', icon: Award, path: '/quizzes' },
 { label: 'Online Classes', icon: Video, path: '/classes' },
 { label: 'Student Performance', icon: TrendingUp, path: '/performance' },
 { label: 'Attendance', icon: Calendar, path: '/attendance' },
 { label: 'Settings', icon: Settings, path: '/settings' }
 ];

 // ── Student Menu Items ──
 const studentMenuItems = [
 { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
 { label: 'My Courses', icon: BookOpen, path: '/courses' },
 { label: 'Assignments', icon: ClipboardList, path: '/tasks' },
 { label: 'Quizzes', icon: Award, path: '/quizzes' },
 { label: 'Learning Materials', icon: FolderOpen, path: '/materials' },
 { label: 'Online Classes', icon: Video, path: '/classes' },
 { label: 'My Attendance', icon: Calendar, path: '/attendance' },
 { label: 'Certificates', icon: FileCheck, path: '/certificates' },
 { label: 'Settings', icon: Settings, path: '/settings' }
 ];

 // Select menu based on active role
 const menuItems = activeRole === 'admin' 
 ? adminMenuItems 
 : activeRole === 'faculty' 
 ? facultyMenuItems 
 : studentMenuItems;
 const roleBase = activeRole === 'faculty' ? '/teacher' : `/${activeRole}`;
 const dashboardPath = `${roleBase}/dashboard`;
 const scopedMenuItems = menuItems.map(item => ({
 ...item,
 path: item.path === '/' ? dashboardPath : `${roleBase}${item.path}`
 }));

 const handleMenuClick = (item) => {
 startTransition(() => {
   router.push(item.path);
 });
 if (onClose) onClose();
 };

 const handleSignOut = () => {
 logout();
 startTransition(() => {
   router.push('/login');
 });
 if (onClose) onClose();
 };

 const isMenuLinkActive = (item) => {
 if (item.path === '/') {
 return pathname === '/';
 }
 return pathname.startsWith(item.path);
 };

 const sidebarContent = (
 <motion.div 
 animate={{ width: isCollapsed ? 90 : 300 }}
 transition={{ type: 'spring', stiffness: 300, damping: 30 }}
 className="flex flex-col h-full text-white max-h-screen relative overflow-hidden"
 style={{ background: 'linear-gradient(180deg, #280192 0%, #3A0BB0 55%, #530AD9 100%)' }}
 >
 {/* Subtle dotted texture */}
 <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 0.6px, transparent 0.6px)', backgroundSize: '20px 20px' }} />

 {/* Brand Header */}
 <div className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-6 py-5 border-b border-white/10 flex-shrink-0`}>
<Link href={`${dashboardPath}`} onClick={() => { if (onClose) onClose(); }} className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} cursor-pointer`}>
 <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 bg-white flex items-center justify-center">
 <img
 src="/assets/logo-codvedha-icon.png"
 alt="CodVedha Logo"
 className="w-7 h-7 object-contain"
 />
 </div>
 <AnimatePresence>
 {!isCollapsed && (
 <motion.span 
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -10 }}
 className="font-extrabold text-[20px] text-white whitespace-nowrap tracking-tight"
 >
 CodVedha
 </motion.span>
 )}
 </AnimatePresence>
 </Link>
 
 {/* Mobile close button */}
 {onClose && (
 <button 
 onClick={onClose} 
 className="p-1 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors lg:hidden"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>

 {/* Role Badge */}
 <AnimatePresence>
 {!isCollapsed && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="relative px-5 py-3"
 >
 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold uppercase tracking-wide bg-white/10 text-white border border-white/20">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
 {activeRole} Portal
 </span>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Main Nav Scroll List - Hidden Scrollbar */}
 <div className="relative flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-hide">
 {scopedMenuItems.map((item) => {
 const active = isMenuLinkActive(item);

 return (
 <div key={item.label} className="flex flex-col">
 <Link
 href={item.path}
 onClick={(e) => {
   e.preventDefault();
   handleMenuClick(item);
 }}
 className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full px-4 py-2.5 rounded-xl font-medium text-[15px] transition-all duration-200 cursor-pointer group ${
 active 
 ? 'bg-white text-[#280192] shadow-lg shadow-black/20' 
 : 'text-white/75 hover:bg-white/10 hover:text-white'
 }`}
 title={isCollapsed ? item.label : ''}
 >
 {active && !isCollapsed && (
 <motion.span layoutId="sidebarActiveRail" className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full" style={{ backgroundColor: '#530AD9' }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
 )}
 <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#530AD9]' : 'text-white/70 group-hover:text-white'}`} />
 <AnimatePresence>
 {!isCollapsed && (
 <motion.span
 initial={{ opacity: 0, width: 0 }}
 animate={{ opacity: 1, width: 'auto' }}
 exit={{ opacity: 0, width: 0 }}
 className="whitespace-nowrap"
 >
 {item.label}
 </motion.span>
 )}
 </AnimatePresence>
 </Link>
 </div>
 );
 })}
 </div>

 {/* Sign Out Footer */}
 <div className="relative border-t border-white/10 px-3 py-4 flex-shrink-0">
 <button
 onClick={handleSignOut}
 className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-white hover:bg-red-500/90 hover:border-red-400 transition-all group`}
 title={isCollapsed ? 'Sign Out' : ''}
 >
 <LogOut size={18} className="flex-shrink-0" />
 <AnimatePresence>
 {!isCollapsed && (
 <motion.span
 initial={{ opacity: 0, width: 0 }}
 animate={{ opacity: 1, width: 'auto' }}
 exit={{ opacity: 0, width: 0 }}
 className="font-medium whitespace-nowrap"
 >
 Sign Out
 </motion.span>
 )}
 </AnimatePresence>
 </button>
 </div>

 {/* Collapse Button - On the dividing line */}
 <button 
 onClick={toggleCollapse} 
 className="absolute -right-2 top-22 transform -translate-y-1/2 hidden lg:flex items-center justify-center w-9 h-9 rounded-full bg-white border-2 border-purple-200 shadow-md hover:bg-purple-50 transition-all z-10"
 aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
 >
 <motion.div
 animate={{ rotate: isCollapsed ? 180 : 0 }}
 transition={{ duration: 0.3 }}
 >
 <ChevronLeft className="w-4 h-4" style={{ color: '#530AD9' }} />
 </motion.div>
 </button>
 </motion.div>
 );

 return (
 <>
 {/* Desktop Sidebar (Permanent display) */}
 <div className="hidden lg:block h-screen sticky top-0 relative">
 {sidebarContent}
 </div>

 {/* Mobile Drawer Overlay */}
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-50 lg:hidden flex">
 {/* Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 0.5 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 bg-black/50 backdrop-blur-sm"
 />
 {/* Sidebar drawer content */}
 <motion.div
 initial={{ x: '-100%' }}
 animate={{ x: 0 }}
 exit={{ x: '-100%' }}
 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
 className="relative z-50 h-full"
 >
 {sidebarContent}
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </>
 );
};
