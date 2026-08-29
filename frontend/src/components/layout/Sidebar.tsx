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
 className="flex flex-col h-full bg-[#F5F5F5] dark:bg-[#1E293B] text-[#222222] dark:text-white border-r border-gray-200 dark:border-slate-500 max-h-screen relative overflow-hidden"
 >
 {/* Brand Header */}
 <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-6 py-5 border-b border-gray-200 dark:border-slate-500 flex-shrink-0`}>
<Link href={`${dashboardPath}`} onClick={() => { if (onClose) onClose(); }} className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} cursor-pointer`}>
 <div className="w-12 h-12 rounded-full overflow-hidden shadow-md flex-shrink-0 bg-white flex items-center justify-center">
 <img
 src="/assets/logo-codvedha.png"
 alt="CodVedha Logo"
 className="w-full h-full object-contain p-1"
 />
 </div>
 <AnimatePresence>
 {!isCollapsed && (
 <motion.span 
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -10 }}
 className="font-semibold text-[20px] text-[#222222] dark:text-white whitespace-nowrap"
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
 className="p-1 rounded-lg bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors lg:hidden"
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
 className="px-5 py-3 border-b border-gray-200 dark:border-slate-800"
 >
 <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-semibold uppercase dark:bg-white dark:text-slate-900 dark:border-white ${
 activeRole === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-300 ' :
 activeRole === 'faculty' ? 'bg-sky-100 text-sky-700 border border-sky-300' :
 'bg-emerald-100 text-emerald-700 border border-emerald-300'
 }`}>
 <span className={`w-1.5 h-1.5 rounded-full ${
 activeRole === 'admin' ? 'bg-amber-500' :
 activeRole === 'faculty' ? 'bg-sky-500' :
 'bg-emerald-500'
 }`} />
 {activeRole} Portal
 </span>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Main Nav Scroll List - Hidden Scrollbar */}
 <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-hide">
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
 className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full px-4 py-3 rounded-[22px] font-medium text-[16px] transition-all duration-200 cursor-pointer group ${
 active 
 ? 'bg-[#F8A63A] text-white shadow-md shadow-orange-200/50' 
 : 'text-[#222222] dark:text-slate-300 hover:bg-[#EEE8DF] dark:hover:bg-slate-800/50 dark:hover:text-white'
 }`}
 title={isCollapsed ? item.label : ''}
 >
 <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
 <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-[#222222] dark:text-slate-400 group-hover:dark:text-white'}`} />
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
 </div>
 </Link>
 </div>
 );
 })}
 </div>

 {/* Sign Out Footer */}
 <div className="border-t border-gray-200 dark:border-slate-500 px-4 py-4 flex-shrink-0">
 <button
 onClick={handleSignOut}
 className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} rounded-[22px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-3 text-[#222222] dark:text-white hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-900 hover:text-red-600 dark:hover:text-red-400 transition-all group`}
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
 className="absolute -right-2 top-22 transform -translate-y-1/2 hidden lg:flex items-center justify-center w-9 h-9 rounded-full bg-white border-2 border-gray-200 shadow-md hover:bg-gray-50 hover:border-gray-300 transition-all z-10"
 aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
 >
 <motion.div
 animate={{ rotate: isCollapsed ? 180 : 0 }}
 transition={{ duration: 0.3 }}
 >
 <ChevronLeft className="w-4 h-4 text-gray-900" />
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
