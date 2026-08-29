"use client";

import React, { useState, useRef, useEffect, startTransition } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/common/Avatar';
import { Sun, Moon, Bell, Search, User, LogOut, Settings, Menu, Shield, MessageSquare, ChevronDown, Home, ChevronRight, X } from 'lucide-react';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export const Header = ({ onMenuClick }) => {
 const { theme, toggleTheme, user, activeRole, logout, searchQuery, setSearchQuery } = useLMS();
 const pathname = usePathname(); 
 const searchParams = useSearchParams();
 const router = useRouter();
 const [profileOpen, setProfileOpen] = useState(false);
 
 const { data: notificationsData } = useSWR('/notifications', fetcher);
 const notifications = Array.isArray(notificationsData) ? notificationsData : [];
 const unreadCount = activeRole === 'admin' ? 0 : notifications.filter((n: any) => !n.isRead).length;
 
 // Refs for dropdown
 const profileDropdownRef = useRef<HTMLDivElement>(null);
 const profileButtonRef = useRef<HTMLButtonElement>(null);
 
 // FIX: Role base path mapping - faculty uses 'teacher' in URL
 const getRoleBase = (role: string | null) => {
   if (!role) return '';
   if (role === 'faculty') return '/teacher';
   return `/${role}`;
 };

 // FIX: Role display name mapping
 const getRoleDisplayName = (role: string | null) => {
   if (!role) return '';
   if (role === 'faculty') return 'Faculty';
   if (role === 'admin') return 'Admin';
   if (role === 'student') return 'Student';
   return role.charAt(0).toUpperCase() + role.slice(1);
 };

 const roleBase = activeRole ? getRoleBase(activeRole) : '';
 const roleDisplayName = getRoleDisplayName(activeRole);
 
 // Handle click outside to close dropdown - FIXED: Changed from mousedown to click
 useEffect(() => {
   const handleClickOutside = (event: MouseEvent) => {
     // Check if click is outside both the dropdown and the button
     if (
       profileDropdownRef.current && 
       !profileDropdownRef.current.contains(event.target as Node) &&
       profileButtonRef.current &&
       !profileButtonRef.current.contains(event.target as Node)
     ) {
       setProfileOpen(false);
     }
   };

   // Add event listener when dropdown is open - FIXED: Using 'click' instead of 'mousedown'
   if (profileOpen) {
     document.addEventListener('click', handleClickOutside);
   }

   // Cleanup event listener
   return () => {
     document.removeEventListener('click', handleClickOutside);
   };
 }, [profileOpen]);

 // Handle escape key to close dropdown
 useEffect(() => {
   const handleEscapeKey = (event: KeyboardEvent) => {
     if (event.key === 'Escape') {
       if (profileOpen) setProfileOpen(false);
     }
   };

   document.addEventListener('keydown', handleEscapeKey);
   return () => {
     document.removeEventListener('keydown', handleEscapeKey);
   };
 }, [profileOpen]);
 
 const handleLogout = () => {
   setProfileOpen(false);
   logout();
   startTransition(() => {
     router.push('/login');
   });
 };

 // Generate breadcrumb items based on current path and role
 const getBreadcrumbs = () => {
   const path = pathname;
   const paths = path.split('/').filter(p => p !== '');

   // Define role-based display names
   const roleMap = {
     'admin': 'Admin',
     'student': 'Student',
     'teacher': 'Faculty', // FIX: teacher → Faculty
     'faculty': 'Faculty'
   };

   // Define route display names
   const routeMap = {
     'dashboard': 'Dashboard',
     'students': 'Students',
     'courses': 'Courses',
     'materials': 'Materials',
     'quizzes': 'Quizzes',
     'assignments': 'Assignments',
     'performance': 'Performance',
     'attendance': 'Attendance',
     'reports': 'Reports',
     'settings': 'Settings',
     'profile': 'Profile',
     'messages': 'Messages',
     'notifications': 'Notifications',
     'calendar': 'Calendar',
     'grades': 'Grades',
     'submissions': 'Submissions',
     'enrollments': 'Enrollments',
     'announcements': 'Announcements',
     'lesson': 'Lesson',
     'topic': 'Topic',
     'faculty': 'Faculty Management'
   };

   const breadcrumbs: any[] = [];
   let currentPath = '';

   // Get role label using display name
   const roleLabel = getRoleDisplayName(activeRole);

   // FIX: Add Role as first item with proper path
   // For faculty, path is /teacher, but display shows Faculty
   const rolePath = getRoleBase(activeRole);
   breadcrumbs.push({
     label: roleLabel,
     path: rolePath,
     isRole: true
   });

   // If only role is present (e.g., /admin, /teacher)
   if (paths.length === 0 || (paths.length === 1 && paths[0] === activeRole) || 
       (paths.length === 1 && paths[0] === 'teacher' && activeRole === 'faculty')) {
     return breadcrumbs;
   }

   // Remove role from paths for processing
   let pathSegments = paths.filter(segment => segment !== activeRole);
   
   // FIX: For faculty, also remove 'teacher' from paths if present
   if (activeRole === 'faculty') {
     pathSegments = pathSegments.filter(segment => segment !== 'teacher');
   }

   // Build path progressively
   pathSegments.forEach((segment, index) => {
     // Build current path
     if (index === 0) {
       currentPath = `${roleBase}/${segment}`;
     } else {
       currentPath = currentPath + '/' + segment;
     }
     
     // Get display name for the route
     let label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
     
     // Check if this is a dynamic ID (like course/:id, student/:id)
     if (segment.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) || 
         segment.match(/^[0-9]+$/)) {
       // This is likely an ID, use previous segment as label
       const prevSegment = pathSegments[index - 1];
       if (prevSegment) {
         const prevLabel = routeMap[prevSegment] || prevSegment.charAt(0).toUpperCase() + prevSegment.slice(1);
         label = `${prevLabel} Details`;
       }
     }

     // Check if this is a tab parameter (like ?tab=PDF)
     const queryParams = new URLSearchParams(searchParams.toString());
     const tabParam = queryParams.get('tab');
     if (tabParam && index === pathSegments.length - 1) {
       label = routeMap[tabParam] || tabParam;
     }

     // Check if this is an action parameter (like ?action=create)
     const actionParam = queryParams.get('action');
     if (actionParam && index === pathSegments.length - 1) {
       const actionMap = {
         'create': 'Create New',
         'edit': 'Edit',
         'view': 'View',
         'preview': 'Preview'
       };
       label = `${actionMap[actionParam] || actionParam} ${routeMap[pathSegments[index-1]] || ''}`.trim() || label;
     }

     breadcrumbs.push({
       label: label,
       path: currentPath
     });
   });

   // Remove duplicates
   const uniqueBreadcrumbs: any[] = [];
   const seenPaths = new Set();
   breadcrumbs.forEach(item => {
     if (!seenPaths.has(item.path)) {
       seenPaths.add(item.path);
       uniqueBreadcrumbs.push(item);
     }
   });

   return uniqueBreadcrumbs;
 };

 const breadcrumbs = getBreadcrumbs();

 // Get page title for mobile
 const getPageTitle = () => {
   const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
   return lastBreadcrumb ? lastBreadcrumb.label : 'Dashboard';
 };

 return (
   <header className="sticky top-0 z-30 w-full border-b border-slate-200/50 dark:border-slate-800/50 min-h-16 flex items-center justify-between px-4 md:px-6 transition-colors duration-300 bg-white dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
     {/* Left Section */}
     <div className="flex items-center gap-3 min-w-0">
       {/* Desktop: Breadcrumb Navigation only */}
       <nav className="hidden lg:flex items-center gap-1 text-sm min-w-0 overflow-x-auto" aria-label="Breadcrumb">
         {breadcrumbs.map((item, index) => (
           <div key={item.path} className="flex items-center gap-1 flex-shrink-0">
             {index === 0 && (
               <Home className="w-4 h-4 text-[#a855f7] flex-shrink-0" />
             )}
             {index > 0 && (
               <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
             )}
             {index === breadcrumbs.length - 1 ? (
               // Last item - current page (not clickable)
               <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px] md:max-w-[200px] lg:max-w-none">
                 {item.label}
               </span>
             ) : (
               // All other items - clickable links
               <Link
                 href={item.path}
                 className="text-slate-500 hover:text-[#a855f7] dark:text-slate-400 dark:hover:text-[#a855f7] transition-colors truncate max-w-[100px] md:max-w-[150px]"
               >
                 {item.label}
               </Link>
             )}
           </div>
         ))}
       </nav>

       <button
         onClick={onMenuClick}
         className="lg:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex-shrink-0 cursor-pointer"
       >
         <Menu className="w-6 h-6" />
       </button>

       {/* Mobile: Logo + Brand Name only */}
       <Link href="/home" className="flex lg:hidden items-center gap-1 flex-shrink-0">
         <img
           src="/assets/logo-codvedha.png"
           alt="CodVedha Logo"
           className="h-10 w-auto object-contain"
         />
         <span className="text-xl font-bold text-slate-900 dark:text-white whitespace-nowrap">
           CodVedha
         </span>
       </Link>
     </div>

     {/* Center: Global Search Bar - Desktop only */}
     <div className="hidden md:flex items-center w-80 relative md:flex-shrink-0">
       <input
          type="text"
          placeholder="Search students, courses, tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] text-sm focus:outline-none dark:text-white transition"
        />
       <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
     </div>

     {/* Right: Actions Menu */}
     <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
       {/* Theme Toggle - Visible on all screens */}
       <button
         onClick={toggleTheme}
         className="p-2 rounded-full text-slate-600 dark:text-slate-200 transition cursor-pointer"
         title="Toggle Light/Dark Theme"
       >
         {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
       </button>

       {/* Notifications Link */}
       <div className="relative">
         <Link
           href={`${roleBase}/notifications`}
           className="p-2 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-200 transition cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 relative"
           title="View Notifications"
         >
           <Bell className="w-5 h-5" />
           {unreadCount > 0 && (
             <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold text-white flex items-center justify-center rounded-full bg-red-500 border border-white dark:border-slate-900">
               {unreadCount}
             </span>
           )}
         </Link>
       </div>

       {/* Desktop: Profile Dropdown (with Chevron) */}
       <div className="hidden md:block relative">
         <button
           ref={profileButtonRef}
           onClick={() => setProfileOpen(!profileOpen)}
           className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
         >
           <Avatar src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full object-cover border border-[#a855f7]" />
           <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
         </button>

         {/* Profile Dropdown Items */}
         {profileOpen && (
           <div 
             ref={profileDropdownRef}
             className="absolute right-0 mt-3 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-2 z-50"
           >
             <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
               <p className="text-sm font-semibold text-slate-950 dark:text-white truncate">
                 {user ? user.name : 'Administrator'}
               </p>
               <p className="text-[16px] text-slate-500 dark:text-slate-400 truncate">
                 {user ? user.email : 'admin@codvedha.com'}
               </p>
               <span className="inline-block mt-2 px-2 py-0.5 text-[14px] font-semibold uppercase rounded bg-purple-100 text-purple-700 border border-purple-200">
                 {roleDisplayName || 'User'}
               </span>
             </div>

             <div className="py-1">
               <Link href={`${roleBase}/settings`}
                 onClick={() => setProfileOpen(false)}
                 className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
               >
                 <User className="w-4 h-4 text-slate-400" />
                 My Profile
               </Link>
               <Link href={`${roleBase}/settings`}
                 onClick={() => setProfileOpen(false)}
                 className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
               >
                 <Settings className="w-4 h-4 text-slate-400" />
                 System Settings
               </Link>
             </div>

             <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
               <button
                 onClick={handleLogout}
                 className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition text-left"
               >
                 <LogOut className="w-4 h-4" />
                 Log Out
               </button>
             </div>
           </div>
         )}
       </div>

       {/* Mobile: Profile + Menu Button */}
       <div className="flex md:hidden items-center gap-2">
         {/* Mobile Profile Dropdown (without Chevron) */}
         <div className="relative">
           <button
             ref={profileButtonRef}
             onClick={() => setProfileOpen(!profileOpen)}
             className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
           >
             <Avatar src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full object-cover border border-[#a855f7]" />
           </button>

           {/* Profile Dropdown Items */}
           {profileOpen && (
             <div 
               ref={profileDropdownRef}
               className="absolute right-0 mt-3 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-2 z-50"
             >
               <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                 <p className="text-sm font-semibold text-slate-950 dark:text-white truncate">
                   {user ? user.name : 'Administrator'}
                 </p>
                 <p className="text-[16px] text-slate-500 dark:text-slate-400 truncate">
                   {user ? user.email : 'admin@codvedha.com'}
                 </p>
                 <span className="inline-block mt-2 px-2 py-0.5 text-[14px] font-semibold uppercase rounded bg-purple-100 text-purple-700 border border-purple-200">
                   {roleDisplayName || 'User'}
                 </span>
               </div>

               <div className="py-1">
                 <Link href={`${roleBase}/settings`}
                   onClick={() => setProfileOpen(false)}
                   className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                 >
                   <User className="w-4 h-4 text-slate-400" />
                   My Profile
                 </Link>
                 <Link href={`${roleBase}/settings`}
                   onClick={() => setProfileOpen(false)}
                   className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                 >
                   <Settings className="w-4 h-4 text-slate-400" />
                   System Settings
                 </Link>
               </div>

               <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                 <button
                   onClick={handleLogout}
                   className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition text-left"
                 >
                   <LogOut className="w-4 h-4" />
                   Log Out
                 </button>
               </div>
             </div>
           )}
         </div>
       </div>
      </div>
     </header>
   );
};
