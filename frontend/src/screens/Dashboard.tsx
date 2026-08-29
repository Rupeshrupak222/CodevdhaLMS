"use client";

import React, { useState } from 'react';
import { useLMS } from '@/context/LMSContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, DollarSign, CalendarCheck2, Clock, 
  ArrowUpRight, Video, BellRing, ArrowDownRight, Award,
  ClipboardList, X
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { CourseAnalyticsExplorer } from '../components/CourseAnalyticsExplorer';
export const Dashboard = () => {
  const { activeRole, user } = useLMS();
  const router = useRouter();
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isAllCoursesModalOpen, setIsAllCoursesModalOpen] = useState(false);
  
  // Fetch real dashboard data from backend
  const { data: dashboardResponse, error, isLoading } = useSWR('/analytics/dashboard', fetcher);

  const dashboardData = dashboardResponse || {};
  const stats = dashboardData?.stats || [];
  const recentActivities = dashboardData?.recentActivities || [];
  const studentGrowth = dashboardData?.studentGrowth || [];
  const attendanceTrend = dashboardData?.attendanceTrend || [];
  const courseProgression = dashboardData?.courseProgression || [];
  const allCourses = dashboardData?.allCourses || [];
  const topPerformingCourses = dashboardData?.topPerformingCourses || [];
  const upcomingClasses = dashboardData?.upcomingClasses || [];
  const performanceAnalytics = dashboardData?.performanceAnalytics || [];
  const historicalPerformance = dashboardData?.historicalPerformance || [];
  const currentPerformance = performanceAnalytics[0] || {
    'Quiz Submitted': 0,
    'Quiz Pending': 0,
    'Assignment Submitted': 0,
    'Assignment Pending': 0,
  };

  const avgProgression = courseProgression.length > 0
    ? Math.round(courseProgression.reduce((sum: number, c: any) => sum + c.value, 0) / courseProgression.length)
    : 0;

  const pieData = courseProgression.map((c: any) => ({
    ...c,
    renderValue: Math.max(c.value, 2)
  }));

  const handleStatClick = (title: string) => {
    const rolePath = activeRole === 'admin' ? '/admin' : activeRole === 'faculty' ? '/teacher' : '/student';
    if (title.includes('Students')) {
      router.push(`${rolePath}/students`);
    } else if (title.includes('Courses')) {
      router.push(`${rolePath}/courses`);
    } else if (title.includes('Tasks') || title.includes('Assignments')) {
      router.push(`${rolePath}/tasks`);
    } else if (title.includes('Classes')) {
      router.push(`${rolePath}/classes`);
    } else if (title.includes('Attendance')) {
      router.push(`${rolePath}/attendance`);
    } else if (title.includes('Teachers') || title.includes('Faculties') || title.includes('Faculty') || title.includes('Teacher')) {
      router.push(`${rolePath}/faculty`);
    }
  };

  const renderStatsGrid = (stats: any) => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${stats.length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-4`}>
      {stats.map((stat: any, idx: number) => {
        let Icon = Users;
        if (stat.title.includes('Courses') || stat.title.includes('Course')) Icon = BookOpen;
        else if (stat.title.includes('Tasks') || stat.title.includes('Pending') || stat.title.includes('Assignments')) Icon = ClipboardList;
        else if (stat.title.includes('Classes')) Icon = Video;
        else if (stat.title.includes('Attendance')) Icon = Clock;

        const color = stat.isPositive ? 'from-emerald-500/20 to-green-500/5' : 'from-rose-500/20 to-red-500/5';
        const iconColor = stat.isPositive ? 'text-emerald-400' : 'text-rose-400';

        return (
          <motion.div
            onClick={() => handleStatClick(stat.title)}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            key={stat.title}
            className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 hover:shadow-lg cursor-pointer transition-all duration-300 relative overflow-hidden group"
          >
            <div className={`absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full blur-xl group-hover:scale-125 transition-transform duration-500`} />
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <p className="text-[16px] text-slate-600 dark:text-slate-300 font-semibold">{stat.title}</p>
                <h3 className="text-2xl font-black mt-2 text-slate-900 dark:text-slate-300 ">
                  {stat.value}
                </h3>
              </div>
              <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 ${iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-[16px] font-medium z-10 relative">
              {stat.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span className={stat.isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                {stat.change}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading dashboard...</div>;
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header and Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-2xl font-semibold text-slate-900 dark:text-white">
            {user ? user.name + "'s Dashboard" : 'Dashboard'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
            Welcome back, {user ? user.name : 'User'}! Here is your summary.
          </p>
        </div>

        {/* CODVEDHA AI Button */}
        <a
          href="https://ai.codvedha.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#ff8c00] text-white font-semibold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all duration-300 cursor-pointer"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          CODVEDHA AI
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
        </a>
      </div>

      {/* Role-Based Stats Grid */}
      {stats.length > 0 && renderStatsGrid(stats)}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        {activeRole !== 'student' ? (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Student Enrollment</h3>
                <span className="text-[14px] text-slate-600">6 Months</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={studentGrowth} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                        borderColor: '#475569', 
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px' 
                      }} 
                    />
                    <Area type="monotone" dataKey="students" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStudents)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {activeRole === 'admin' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top Performing Courses</h3>
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                  {topPerformingCourses.length > 0 ? (
                    topPerformingCourses.map((course: any, idx: number) => {
                      const medalColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
                      return (
                        <div key={course.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className={`text-[15px] font-bold ${idx < 3 ? medalColors[idx] : 'text-slate-400'} flex-shrink-0`}>
                              #{idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 truncate">{course.title}</p>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400">Avg. Progress: {course.avgProgress}%</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0 ml-4">
                            <span className="text-[14px] font-bold text-slate-950 dark:text-white whitespace-nowrap">
                              {course.enrollmentCount} {course.enrollmentCount === 1 ? 'student' : 'students'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Enrolled</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-sm">No courses recorded</div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                onClick={() => activeRole === 'admin' && setIsCourseModalOpen(true)}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 ${activeRole === 'admin' ? 'cursor-pointer hover:shadow-md transition' : ''}`}
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Course Progression</h3>
                <div className="h-48 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={courseProgression}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {courseProgression.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <span className="text-[16px] text-slate-600 dark:text-slate-300 font-semibold">Average</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{avgProgression}%</p>
                  </div>
                </div>
              </motion.div>
            )}

            <CourseAnalyticsExplorer />
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">My Attendance Trend</h3>
                <span className="text-[14px] text-slate-600 ">Weekly</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceTrend} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="attendance" fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Course Completion Pie Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Course Progression</h3>
                {allCourses.length > 3 && (
                  <button
                    onClick={() => setIsAllCoursesModalOpen(true)}
                    className="text-xs font-medium text-sky-500 hover:text-sky-600 transition-colors"
                  >
                    All Courses
                  </button>
                )}
              </div>
              <div className="h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="renderValue"
                      nameKey="name"
                      stroke="none"
                    >
                      {pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${props.payload.value}%`, name]} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <span className="text-[16px] text-slate-600 dark:text-slate-300 font-semibold">Average</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{avgProgression}%</p>
                </div>
              </div>
            </motion.div>

            {/* Premium Learning Performance Analytics Section */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Learning Activity</h3>
                <span className="text-[14px] text-slate-600">All Courses</span>
              </div>

              <div className="h-64 grid grid-cols-2 gap-3">
                <div 
                  onClick={() => router.push(`/${activeRole}/quizzes`)}
                  className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 flex flex-col justify-center items-center cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Quiz Submitted</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{currentPerformance['Quiz Submitted']}</span>
                </div>
                <div 
                  onClick={() => router.push(`/${activeRole}/quizzes`)}
                  className="rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 flex flex-col justify-center items-center cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors"
                >
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 block mb-1">Quiz Pending</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{currentPerformance['Quiz Pending']}</span>
                </div>
                <div 
                  onClick={() => router.push(`/${activeRole}/tasks`)}
                  className="rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/20 flex flex-col justify-center items-center cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/20 transition-colors"
                >
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 block mb-1">Assig. Submitted</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{currentPerformance['Assignment Submitted']}</span>
                </div>
                <div 
                  onClick={() => router.push(`/${activeRole}/tasks`)}
                  className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex flex-col justify-center items-center cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mb-1">Assig. Pending</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{currentPerformance['Assignment Pending']}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Grid: Recent Activity and Upcoming Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activities</h3>
            <BellRing className="w-4.5 h-4.5 text-[#a855f7]" />
          </div>
          <div className="space-y-3.5">
            {recentActivities.length > 0 ? recentActivities.map((act: any) => (
              <div key={act.id} className="flex justify-between items-start text-[16px] border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-slate-850 dark:text-slate-300 truncate">{act.student}</p>
                  <p className="text-[14px] text-slate-450 dark:text-slate-300 mt-0.5">{act.action} &bull; <span className="font-medium text-slate-500 dark:text-slate-300">{act.details}</span></p>
                </div>
                <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[14px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 ">
                    {act.status}
                  </span>
                  <span className="text-[14px] text-slate-600 dark:text-slate-300 font-medium">{act.time}</span>
                </div>
              </div>
            )) : (
              <div className="text-sm text-slate-500 text-center py-4">No recent activities</div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming Classes</h3>
            <CalendarCheck2 className="w-4.5 h-4.5 text-[#38BDF8]" />
          </div>
          <div className="space-y-3.5">
            {upcomingClasses.length > 0 ? upcomingClasses.map((cls: any) => {
              const date = new Date(cls.scheduledAt);
              return (
                <div key={cls.id} className="flex justify-between items-start text-[16px] border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0 last:pb-0">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-850 dark:text-slate-300 truncate">{cls.title}</p>
                    <p className="text-[14px] text-slate-450 dark:text-slate-300 mt-0.5">
                      {cls.courseName} &bull; <span className="font-medium text-slate-500 dark:text-slate-300">{cls.teacherName}</span>
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[14px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      {date.toLocaleDateString()}
                    </span>
                    <span className="text-[14px] text-slate-600 dark:text-slate-300 font-medium">
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-sm text-slate-500 text-center py-4">No upcoming classes scheduled</div>
            )}
          </div>
        </motion.div>
      </div>
      {/* All Courses Modal (Student) */}
      {isAllCoursesModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsAllCoursesModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">All Enrolled Courses</h2>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {allCourses.map((course: any, idx: number) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{course.fullName || course.name}</span>
                    <span className="text-sm font-bold" style={{ color: course.color }}>{course.value}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${course.value}%`, backgroundColor: course.color }}></div>
                  </div>
                </div>
              ))}
              {allCourses.length === 0 && (
                <p className="text-slate-500 text-center py-8">No courses enrolled</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Course Progression Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCourseModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Subject-wise Course Progression</h2>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {courseProgression.map((course: any, idx: number) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{course.name}</span>
                    <span className="text-sm font-bold" style={{ color: course.color }}>{course.value}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${course.value}%`, backgroundColor: course.color }}></div>
                  </div>
                </div>
              ))}
              {courseProgression.length === 0 && (
                <p className="text-slate-500 text-center py-8">No course data available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Dashboard;
