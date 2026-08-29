"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, TrendingUp, Users, BookOpen, Clock, Activity } from 'lucide-react';
import { 
 AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
 XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export const Analytics = () => {
  const pathname = usePathname(); 
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch real analytics/dashboard data from backend
  const { data: dashboardResponse, error, isLoading } = useSWR('/analytics/dashboard', fetcher);

  const dashboardData = dashboardResponse?.data || {};
  const stats = dashboardData?.stats || [];
  const studentGrowth = dashboardData?.studentGrowth || [];
  const attendanceTrend = dashboardData?.attendanceTrend || [];
  const courseProgression = dashboardData?.courseProgression || [];
  const engagementMetrics = dashboardData?.engagementMetrics || [];
  const revenueTrend = dashboardData?.revenueTrend || [];

  // Tab: 'students' | 'courses'
  const [activeTab, setActiveTab] = useState('students');

  // Sync tab with URL queries ?view=students, ?view=courses
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const view = params.get('view');
    if (view && ['students', 'courses'].includes(view)) {
      setActiveTab(view);
    }
  }, [searchParams.toString()]);

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
 <BarChart3 className="w-7 h-7 text-[#a855f7]" />
 Analytics Suite
 </h1>
 <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
 Monitor academic engagement metrics and review completion logs.
 </p>
 </div>
 </div>

 {/* Tabs */}
 <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 text-[16px] font-semibold ">
 {[
 { id: 'students', label: 'Student Engagement', path: '?view=students' },
 { id: 'courses', label: 'Course Progressions', path: '?view=courses' }
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => router.push(`${pathname}${tab.path}`)}
 className={`pb-3 transition relative cursor-pointer ${
 activeTab === tab.id
 ? 'text-[#a855f7] font-black'
 : 'text-slate-600 hover:text-slate-655 dark:hover:text-slate-200'
 }`}
 >
 {tab.label}
 {activeTab === tab.id && (
 <motion.div
 layoutId="activeAnalyticsTab"
 className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]"
 />
 )}
 </button>
 ))}
 </div>

  {/* TAB VISUALIZATIONS */}
  {/* 1. Student Engagement (Bar + Line) */}
  {activeTab === 'students' && (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
        {/* Watch time vs Quiz Scores (Bar Chart) */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
          <h3 className="text-[16px] font-semibold text-slate-905 dark:text-white mb-4 flex items-center gap-1.5">
            <Clock className="w-4.5 h-4.5 text-sky-400" /> Weekly Learning & Quiz Performance
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementMetrics} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="watchTime" name="Watch Time (mins)" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quizScore" name="Avg Quiz Score (%)" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Metrics Summary */}
        <div className="p-5 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-[16px] font-semibold text-slate-905 dark:text-white flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-emerald-400" /> Engagement Statistics
            </h3>
            <div className="space-y-3.5 pt-2">
              <div className="flex justify-between items-center text-[16px]">
                <span className="text-slate-600 font-semibold">Average Active Days</span>
                <span className="font-semibold text-slate-800 dark:text-white ">5.2 Days / wk</span>
              </div>
              <div className="flex justify-between items-center text-[16px]">
                <span className="text-slate-600 font-semibold">Lessons Watched Ratio</span>
                <span className="font-semibold text-slate-800 dark:text-white ">84% completed</span>
              </div>
              <div className="flex justify-between items-center text-[16px]">
                <span className="text-slate-600 font-semibold">Quiz Passing Rate</span>
                <span className="font-semibold text-slate-800 dark:text-white ">91.8% ratio</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[14px] text-slate-600 font-semibold">
            💡 Student study engagement has climbed by 12% following the launch of interactive Daily Task Sheets.
          </div>
        </div>

      </div>
    </div>
  )}

  {/* 2. Course Progressions (Pie + Growth Line) */}
  {activeTab === 'courses' && (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
        {/* Course Completion donut (Pie Chart) */}
        <div className="p-5 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
          <h3 className="text-[16px] font-semibold text-slate-905 dark:text-white mb-4 flex items-center gap-1.5">
            <PieIcon className="w-4.5 h-4.5 text-purple-400" /> Course Progress Breakdown
          </h3>
          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courseProgression}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
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
              <span className="text-[14px] text-slate-600 font-semibold block ">Finished Ratios</span>
              <span className="text-2xl font-black text-slate-850 dark:text-white ">{courseProgression.length} Tracks</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-[14px] font-semibold">
            {courseProgression.map((d: any) => (
              <div key={d.name} className="flex justify-between items-center border border-slate-200/40 dark:border-slate-800/50 p-2 rounded-lg">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="text-slate-800 dark:text-slate-300 font-semibold">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Attendance Trend (Line Chart) */}
        <div className="p-5 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
          <h3 className="text-[16px] font-semibold text-slate-905 dark:text-white mb-4 flex items-center gap-1.5">
            <LineIcon className="w-4.5 h-4.5 text-[#a855f7]" /> Weekly Attendance Fluctuations
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[50, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" name="Attendance (%)" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[14px] text-slate-600 mt-4 font-semibold">
            📈 Attendance rates consistently peak on Thursdays following weekly cohort project releases.
          </p>
        </div>

      </div>
    </div>
  )}
 </div>
 );
};
export default Analytics;
