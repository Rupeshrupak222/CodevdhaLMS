import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useLMS } from '@/context/LMSContext';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  Users, BookOpen, Clock, Activity, Award, CheckCircle2, AlertTriangle, Calendar 
} from 'lucide-react';

export const CourseAnalyticsExplorer = () => {
  const { activeRole } = useLMS();
  const [selectedCourseId, setSelectedCourseId] = useState<string>(activeRole === 'admin' ? 'all' : '');
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'quizzes' | 'progress' | 'timeline'>('overview');

  // Fetch all courses for the dropdown
  const { data: courses = [] } = useSWR('/courses', fetcher);

  // Set initial course for faculty if not admin and empty
  useEffect(() => {
    if (activeRole !== 'admin' && selectedCourseId === '' && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, activeRole, selectedCourseId]);

  // Fetch the specific analytics data (only fetch if selectedCourseId is not empty)
  const { data: rawData, isLoading } = useSWR(
    selectedCourseId ? `/analytics/course-explorer?courseId=${selectedCourseId}&timeRange=${timeRange}` : null,
    fetcher
  );

  const data = rawData || {};
  const isAll = data.type === 'all';

  const renderAllStats = () => {
    if (!data.stats) return null;
    const s = data.stats;
    const cards = [
      { title: 'Total Courses', value: s.totalCourses, icon: BookOpen, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/20', cardBg: 'bg-indigo-50/60 dark:bg-indigo-900/10', border: 'border-indigo-100 dark:border-indigo-800/30' },
      { title: 'Total Enrollments', value: s.totalEnrollments, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20', cardBg: 'bg-blue-50/60 dark:bg-blue-900/10', border: 'border-blue-100 dark:border-blue-800/30' },
      { title: 'Classes Conducted', value: s.totalClasses, icon: Calendar, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', cardBg: 'bg-emerald-50/60 dark:bg-emerald-900/10', border: 'border-emerald-100 dark:border-emerald-800/30' },
      { title: 'Overall Attendance', value: `${s.overallAttendance}%`, icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/20', cardBg: 'bg-purple-50/60 dark:bg-purple-900/10', border: 'border-purple-100 dark:border-purple-800/30' },
      { title: 'Avg Quiz Score', value: `${s.overallQuizCompletion}%`, icon: Award, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/20', cardBg: 'bg-purple-50/60 dark:bg-purple-900/10', border: 'border-purple-100 dark:border-purple-800/30' },
      { title: 'Avg Course Progress', value: `${s.overallCourseCompletion}%`, icon: CheckCircle2, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-500/20', cardBg: 'bg-rose-50/60 dark:bg-rose-900/10', border: 'border-rose-100 dark:border-rose-800/30' },
    ];

    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        {cards.map((c, i) => (
          <div key={i} className={`p-3 rounded-xl border ${c.border} ${c.cardBg} flex flex-col justify-center transition-transform hover:scale-[1.02] cursor-default`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg ${c.bg} ${c.color}`}>
                <c.icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[12px] font-semibold ${c.color}`}>{c.title}</span>
            </div>
            <span className="text-lg font-black text-slate-800 dark:text-white ml-1">{c.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderSingleCourseTabs = () => {
    if (!data.overview) return null;

    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'attendance', label: 'Attendance' },
      { id: 'quizzes', label: 'Quizzes' },
      { id: 'progress', label: 'Progress' },
      { id: 'timeline', label: 'Timeline' },
    ];

    return (
      <div className="mt-3 flex flex-col h-full">
        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
                activeTab === t.id 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-[140px] overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 gap-3 h-full">
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 hover:scale-[1.02] transition-transform cursor-default">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span className="block text-[12px] text-blue-600 dark:text-blue-400 font-semibold">Instructor</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate block">{data.overview.instructor}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:scale-[1.02] transition-transform cursor-default">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="block text-[12px] text-emerald-600 dark:text-emerald-400 font-semibold">Enrolled</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{data.overview.totalEnrolled} Students</span>
                  </div>
                  <div className="p-3 bg-purple-50/60 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30 hover:scale-[1.02] transition-transform cursor-default">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity className="w-3.5 h-3.5 text-purple-500" />
                      <span className="block text-[12px] text-purple-600 dark:text-purple-400 font-semibold">Active</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{data.overview.activeStudents} Students</span>
                  </div>
                  <div className="p-3 bg-purple-50/60 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30 hover:scale-[1.02] transition-transform cursor-default">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Award className="w-3.5 h-3.5 text-purple-500" />
                      <span className="block text-[12px] text-purple-600 dark:text-purple-400 font-semibold">Avg Completion</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{data.overview.completionRate}%</span>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="h-full min-h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.attendanceTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '4px' }} />
                      <Area type="monotone" dataKey="attendance" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorAtt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeTab === 'quizzes' && (
                <div className="h-full min-h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.quizPerformance} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                      <XAxis dataKey="title" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '4px' }} />
                      <Bar dataKey="avgScore" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeTab === 'progress' && (
                <div className="h-full min-h-[140px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.progressDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                      >
                        {data.progressDistribution?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} Students`, name]} contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '4px' }} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="h-full min-h-[140px] overflow-y-auto scrollbar-hide pr-2 space-y-2">
                  {data.timeline?.length > 0 ? data.timeline.map((item: any) => {
                    const date = new Date(item.date);
                    return (
                      <div key={item.id} className="flex gap-2 items-start relative">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${item.isUpcoming ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                          <div className="w-px h-full bg-slate-200 dark:bg-slate-700 absolute top-4 bottom-[-8px] left-[3.5px] -z-10" />
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-700 flex-1">
                          <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {date.toLocaleDateString()} &bull; {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  }) : (
                     <div className="text-center text-xs text-slate-500 py-4">No timeline events found.</div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quick Insights (Only in course mode) */}
        {/* <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Quick Insights</p>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" />
              Top: <b className="text-slate-800 dark:text-white truncate max-w-[60px]">{data.insights?.mostActiveStudent}</b>
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              Risk: <b className="text-slate-800 dark:text-white truncate max-w-[60px]">{data.insights?.atRiskStudent}</b>
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3 text-purple-500" />
              High: <b className="text-slate-800 dark:text-white">{data.insights?.highestQuizScore}%</b>
            </span>
          </div>
        </div> */}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="lg:col-span-1 p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 flex flex-col h-[290px]"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#a855f7]" /> 
          Course Analytics
        </h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-[12px] font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-[#a855f7]"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>
      
      <div className=" border-b border-slate-100 dark:border-slate-800 pb-1 shrink-0">
        <select
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setActiveTab('overview');
          }}
          className="w-full text-sm font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#a855f7] transition-colors"
        >
          {activeRole === 'admin' && <option value="all">All Courses (Platform Overview)</option>}
          {courses.map((c: any) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium animate-pulse">
          Loading analytics...
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
          {isAll ? renderAllStats() : renderSingleCourseTabs()}
        </div>
      )}
    </motion.div>
  );
};
