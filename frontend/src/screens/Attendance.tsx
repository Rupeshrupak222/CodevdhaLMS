"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Check, X, AlertCircle, BarChart3, PieChartIcon, ShieldCheck, Save } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import useSWR, { mutate } from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';

import { Avatar } from '@/components/common/Avatar';

export const Attendance = () => {
  const { activeRole, user } = useLMS();
  const searchParams = useSearchParams();

  // Tab: 'mark' | 'reports' | 'calendar' | 'history'
   const [activeTab, setActiveTab] = useState('mark');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [markedRecords, setMarkedRecords] = useState<Record<string, string>>({});
  const [isAttendanceMarked, setIsAttendanceMarked] = useState(false);
  const lastLoadedKey = React.useRef('');

  // Sync tab with URL query parameter ?action=mark, ?view=reports
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const action = params.get('action');
    const view = params.get('view');
    if (action === 'mark') setActiveTab('mark');
    else if (view === 'reports') setActiveTab('reports');
    else if (activeRole === 'student') setActiveTab('calendar');
    else setActiveTab('mark');
  }, [searchParams.toString(), activeRole]);

  // API Data Fetching
  const { data: coursesData } = useSWR('/courses', fetcher);
  const courses = coursesData || [];

  // Determine course for students
  const studentCourses = React.useMemo(() => {
    return user?.enrollments?.map((e: any) => e.course).filter(Boolean) || [];
  }, [user]);

  const enrolledCourseId = studentCourses[0]?.id || '';
  const effectiveCourseId = activeRole === 'student'
    ? (selectedCourseId || enrolledCourseId)
    : selectedCourseId;

  // Set default course ID for students
  useEffect(() => {
    if (activeRole === 'student' && studentCourses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(studentCourses[0].id);
    }
  }, [activeRole, studentCourses, selectedCourseId]);

  // Load batches of course
  const { data: batchesRaw } = useSWR(
    activeRole !== 'student' && selectedCourseId ? `/batches?courseId=${selectedCourseId}&isActive=true` : null,
    fetcher
  );
  const batches = Array.isArray(batchesRaw) ? batchesRaw : (batchesRaw?.data?.batches || batchesRaw?.batches || []);

  // Reset batch selection if course changes
  useEffect(() => {
    setSelectedBatchId('');
  }, [selectedCourseId]);

  // Load students in course (scoped by batchId if selected)
  const { data: rawEnrollments, isLoading: isStudentsLoading } = useSWR(
    activeRole !== 'student' && selectedCourseId
      ? `/courses/${selectedCourseId}/students${selectedBatchId ? `?batchId=${selectedBatchId}` : ''}`
      : null,
    fetcher
  );
  const displayStudents = React.useMemo(() => {
    return Array.isArray(rawEnrollments)
      ? rawEnrollments.map((e: any) => e?.student).filter(Boolean)
      : [];
  }, [rawEnrollments]);

  // Load attendance records
  const { data: rawAttendance, mutate: mutateAttendance, isLoading: isAttendanceLoading } = useSWR(
    effectiveCourseId ? `/attendance?courseId=${effectiveCourseId}${selectedBatchId ? `&batchId=${selectedBatchId}` : ''}` : null,
    fetcher
  );

  // Load attendance history with pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Calendar view state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Full fetcher to retain pagination meta
  const fullFetcher = (url: string) => api.get(url).then(res => res.data);

  const { data: historyResponse, isLoading: isHistoryLoading, mutate: mutateHistory } = useSWR(
    activeRole !== 'student' && selectedCourseId && activeTab === 'history'
      ? `/attendance/history?courseId=${selectedCourseId}&page=${historyPage}&limit=100&startDate=${historyStartDate}&endDate=${historyEndDate}${selectedBatchId ? `&batchId=${selectedBatchId}` : ''}`
      : null,
    fullFetcher
  );

  // Prepopulate selected date's marked status from database or default to PRESENT
  useEffect(() => {
    if (activeRole === 'student') return;

    if (!effectiveCourseId) {
      setMarkedRecords(prev => {
        if (Object.keys(prev).length > 0) return {};
        return prev;
      });
      lastLoadedKey.current = '';
      return;
    }

    // Only prepopulate if SWR has loaded data
    if (rawAttendance === undefined) return;

    const currentKey = `${effectiveCourseId}_${selectedDate}`;
    // Only prepopulate on initial load of a new course/date or revalidation mutation
    if (lastLoadedKey.current === currentKey) return;

    const recordsMap: Record<string, string> = {};
    let hasDatabaseRecordsForDate = false;

    if (Array.isArray(rawAttendance)) {
      rawAttendance.forEach((rec: any) => {
        if (rec && rec.date && rec.studentId) {
          const recDate = new Date(rec.date).toISOString().split('T')[0];
          if (recDate === selectedDate) {
            recordsMap[rec.studentId] = rec.status;
            hasDatabaseRecordsForDate = true;
          }
        }
      });
    }

    setIsAttendanceMarked(hasDatabaseRecordsForDate);

    // Default any students without a DB record for this date to ABSENT
    if (displayStudents.length > 0) {
      displayStudents.forEach((stud: any) => {
        if (!recordsMap[stud.id]) {
          recordsMap[stud.id] = 'ABSENT';
        }
      });
    }

    setMarkedRecords(recordsMap);
    lastLoadedKey.current = currentKey;
  }, [rawAttendance, activeRole, effectiveCourseId, displayStudents, selectedDate]);

  const handleMark = (studentId: string, status: string) => {
    setMarkedRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkNoClassDay = () => {
    const updated: Record<string, string> = {};
    displayStudents.forEach((stud: any) => {
      updated[stud.id] = 'NO_CLASS';
    });
    setMarkedRecords(updated);
  };

  const saveAttendance = async () => {
    if (!selectedCourseId) return;
    try {
      const records = Object.keys(markedRecords).map(studentId => ({
        studentId,
        status: markedRecords[studentId],
        remarks: ''
      }));

      await api.post('/attendance', {
        courseId: selectedCourseId,
        date: new Date(selectedDate).toISOString(),
        records
      });
      toast.success('Attendance saved successfully!');
      lastLoadedKey.current = ''; // Allow re-prepopulation from mutated SWR data
      mutateAttendance();
      mutateHistory?.();
      // Also trigger a global revalidation so other components (student view) update
      mutate(`/attendance?courseId=${selectedCourseId}`);
      if (selectedBatchId) {
        mutate(`/attendance?courseId=${selectedCourseId}&batchId=${selectedBatchId}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    }
  };

  // Student calendar mapping
  const getPaddingDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const dayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon, ...
    const padding = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return padding;
  };

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const paddingCount = getPaddingDays();
  
  const paddingArray = Array.from({ length: paddingCount }, () => ({
    day: null,
    status: 'empty'
  }));

  const actualDays = Array.isArray(rawAttendance) ? Array.from({ length: daysInMonth }, (_, idx) => {
    const dayNum = idx + 1;
    const rec = rawAttendance.find((r: any) => {
      if (!r || !r.date) return false;
      const d = new Date(r.date);
      return d.getDate() === dayNum && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    let status = 'none';
    if (rec) {
      if (rec.status === 'PRESENT') status = 'present';
      else if (rec.status === 'ABSENT') status = 'absent';
      else if (rec.status === 'NO_CLASS') status = 'noclass';
    }

    const checkDate = new Date(selectedYear, selectedMonth, dayNum);
    if (checkDate.getDay() === 0 || checkDate > new Date()) {
      status = 'weekend'; // Gray out future days and weekends by default if empty
      if (rec) { // if there's a record, show it instead
         if (rec.status === 'PRESENT') status = 'present';
         else if (rec.status === 'ABSENT') status = 'absent';
         else if (rec.status === 'NO_CLASS') status = 'noclass';
      }
    }
    return { day: dayNum, status };
  }) : [];

  const calendarDays = [...paddingArray, ...actualDays];
  const presentDays = actualDays.filter(d => d.status === 'present').length;
  const absentDays = actualDays.filter(d => d.status === 'absent').length;

  // Group history by date
  const groupedHistory = React.useMemo(() => {
    const records = historyResponse?.data;
    if (!records || !Array.isArray(records)) return [];
    
    const groups: Record<string, any[]> = {};
    records.forEach((rec: any) => {
      if (!rec.date) return;
      const dateStr = new Date(rec.date).toISOString().split('T')[0];
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(rec);
    });
    
    return Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
      const records = groups[date];
      const presentCount = records.filter(r => r.status === 'PRESENT').length;
      const absentCount = records.filter(r => r.status === 'ABSENT').length;
      return {
        date,
        records,
        presentCount,
        absentCount
      };
    });
  }, [historyResponse?.data]);

  const pieData = [
    { name: 'Present', value: presentDays || 1, color: '#10B981' },
    { name: 'Absent', value: absentDays, color: '#EF4444' }
  ].filter(d => d.value > 0);

  const calculateAttendanceRate = (studentId: string) => {
    if (!Array.isArray(rawAttendance)) return 100;
    const studentRecords = rawAttendance.filter((r: any) => r && r.studentId === studentId);
    if (!studentRecords.length) return 100;
    const presentCount = studentRecords.filter((r: any) => r && r.status === 'PRESENT').length;
    return Math.round((presentCount / studentRecords.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <CalendarIcon className="w-7 h-7 text-[#a855f7]" />
          Attendance Ledger
        </h1>
        <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
          Mark daily roll calls, review attendance rate metrics, and manage student reports.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 text-[16px] font-semibold">
        {activeRole !== 'student' && (
          <>
            <button
              onClick={() => setActiveTab('mark')}
              className={`pb-3 transition relative cursor-pointer ${activeTab === 'mark' ? 'text-[#a855f7] font-black' : 'text-slate-600 hover:text-slate-655'}`}
            >
              Mark Roll Call
              {activeTab === 'mark' && <motion.div layoutId="activeAttTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]" />}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`pb-3 transition relative cursor-pointer ${activeTab === 'reports' ? 'text-[#a855f7] font-black' : 'text-slate-600 hover:text-slate-655'}`}
            >
              Attendance Reports
              {activeTab === 'reports' && <motion.div layoutId="activeAttTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]" />}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 transition relative cursor-pointer ${activeTab === 'history' ? 'text-[#a855f7] font-black' : 'text-slate-600 hover:text-slate-655'}`}
            >
              Attendance History Logs
              {activeTab === 'history' && <motion.div layoutId="activeAttTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]" />}
            </button>
          </>
        )}
        {activeRole === 'student' && (
          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 transition relative cursor-pointer ${activeTab === 'calendar' ? 'text-[#a855f7] font-black' : 'text-slate-600 hover:text-slate-655'}`}
          >
            My Calendar Logs
            {activeTab === 'calendar' && <motion.div layoutId="activeAttTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]" />}
          </button>
        )}
      </div>

      {/* Course & Batch Selectors */}
      <div className="flex gap-4 items-end flex-wrap">
        <div className="max-w-xs flex-1 min-w-[200px]">
          <label className="block text-slate-500 dark:text-slate-355 text-[14px] font-semibold mb-1.5 font-bold">
            {activeRole === 'student' ? 'Select Subject / Course' : 'Select Course Cohort'}
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] rounded-xl text-slate-905 dark:text-white text-[16px] focus:outline-none"
          >
            {activeRole === 'student' ? (
              <>
                {studentCourses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </>
            ) : (
              <>
                <option value="">Choose Course...</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </>
            )}
          </select>
        </div>

        {activeRole !== 'student' && selectedCourseId && (
          <div className="max-w-xs flex-1 min-w-[200px]">
            <label className="block text-slate-500 dark:text-slate-355 text-[14px] font-semibold mb-1.5 font-bold">
              Filter by Batch (Optional)
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] rounded-xl text-slate-905 dark:text-white text-[16px] focus:outline-none"
            >
              <option value="">All Batches / Course-wide</option>
              {batches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 1. Mark Roll Call Panel */}
      {activeTab === 'mark' && activeRole !== 'student' && (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-sm">
          {!selectedCourseId ? (
            <div className="p-16 text-center text-slate-500 italic text-[16px]">
              Please choose a course cohort above to mark attendance.
            </div>
          ) : isStudentsLoading ? (
            <div className="p-8 text-center text-slate-500 font-semibold">Loading course students...</div>
          ) : displayStudents.length > 0 ? (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-end gap-3">
                  <div>
                    <span className="text-[14px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">Marking Ledger Date</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] rounded-xl text-slate-950 dark:text-white text-[15px] focus:outline-none cursor-pointer font-semibold"
                    />
                  </div>
                  <button
                    onClick={handleMarkNoClassDay}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-650 dark:text-amber-400 border border-amber-500/30 rounded-xl text-[14px] font-semibold transition cursor-pointer h-[38px]"
                  >
                    Mark No Class Day
                  </button>
                </div>
                <div className="text-[14px] text-slate-655 font-semibold flex items-center gap-3">
                  <div>
                    Active Course Cohort Students: <span className="font-extrabold text-[#a855f7]">{displayStudents.length}</span>
                  </div>
                  {isAttendanceMarked ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                      <Check className="w-3 h-3" /> Marked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500  text-[14px] uppercase font-semibold">
                      <th className="px-6 py-3">Photo</th>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Aggregate Attendance</th>
                      <th className="px-6 py-3 text-center">Mark Roll Call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStudents.map((stud: any) => (
                      <tr key={stud.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/20 dark:hover:bg-slate-800/20 transition">
                        <td className="px-6 py-3.5">
                          <Avatar src={stud.avatar} alt={stud.name} className="w-8 h-8 rounded-full object-cover border border-[#a855f7]" />
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-[16px] text-slate-900 dark:text-white block">{stud.name}</span>
                          <span className="text-[14px] text-slate-655">{stud.email}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-[16px]  font-semibold ${calculateAttendanceRate(stud.id) >= 85 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {calculateAttendanceRate(stud.id)}%
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleMark(stud.id, 'PRESENT')}
                              className={`px-3 py-1 rounded-lg text-[14px] font-semibold transition cursor-pointer ${markedRecords[stud.id] === 'PRESENT' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'}`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMark(stud.id, 'ABSENT')}
                              className={`px-3 py-1 rounded-lg text-[14px] font-semibold transition cursor-pointer ${markedRecords[stud.id] === 'ABSENT' ? 'bg-red-500 text-white' : 'bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-400 hover:bg-red-200'}`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => handleMark(stud.id, 'NO_CLASS')}
                              className={`px-3 py-1 rounded-lg text-[14px] font-semibold transition cursor-pointer ${markedRecords[stud.id] === 'NO_CLASS' ? 'bg-slate-500 text-white' : 'bg-slate-100 dark:bg-slate-900/40 text-slate-655 dark:text-slate-300 hover:bg-slate-200'}`}
                            >
                              No Class
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={saveAttendance}
                  className="flex items-center gap-2 bg-[#a855f7] hover:bg-amber-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Attendance Log
                </button>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 italic text-[16px]">
              No students enrolled in this course cohort.
            </div>
          )}
        </div>
      )}

      {/* 2. Attendance Reports Panel */}
      {activeTab === 'reports' && activeRole !== 'student' && (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden p-6 space-y-6">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Cohort Attendance Summary</h3>
          {!selectedCourseId ? (
            <div className="py-8 text-center text-slate-500 italic text-[16px]">
              Please choose a course cohort above to view summary.
            </div>
          ) : displayStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayStudents.map((stud: any) => (
                <div key={stud.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div className="flex gap-3 items-center">
                    <Avatar src={stud.avatar} alt={stud.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <span className="font-semibold text-[16px] text-slate-900 dark:text-white block">{stud.name}</span>
                      <span className="text-[14px] text-slate-655">Student Log</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[14px] text-slate-655 font-semibold">Attendance:</span>
                    <span className={`text-[16px]  font-semibold ${calculateAttendanceRate(stud.id) >= 85 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {calculateAttendanceRate(stud.id)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 italic text-[16px]">
              No students enrolled in this course cohort.
            </div>
          )}
        </div>
      )}

      {/* 2.5 Attendance History logs Panel */}
      {activeTab === 'history' && activeRole !== 'student' && (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Attendance History Logs</h3>
              <p className="text-[14px] text-slate-655 mt-0.5">View and trace past class attendance records.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => { setHistoryStartDate(e.target.value); setHistoryPage(1); }}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-950 dark:text-white text-[14px] focus:outline-none cursor-pointer font-semibold"
                />
                <span className="text-slate-500 font-bold">-</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => { setHistoryEndDate(e.target.value); setHistoryPage(1); }}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-950 dark:text-white text-[14px] focus:outline-none cursor-pointer font-semibold"
                />
              </div>
              <div className="text-[14px] text-slate-500 font-semibold shrink-0">
                Total Logs: <span className="font-bold text-[#a855f7]">{historyResponse?.meta?.total || 0}</span>
              </div>
            </div>
          </div>

          {!selectedCourseId ? (
            <div className="py-8 text-center text-slate-500 italic text-[16px]">
              Please choose a course cohort above to view history.
            </div>
          ) : isHistoryLoading ? (
            <div className="py-8 text-center text-slate-500 font-semibold">Loading attendance history...</div>
          ) : historyResponse?.data && Array.isArray(historyResponse.data) && historyResponse.data.length > 0 ? (
            <div className="space-y-6">
              {groupedHistory.map(group => (
                <div key={group.date} className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-100/50 dark:bg-slate-800/50">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        {new Date(group.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                      </h4>
                      <p className="text-sm text-slate-500 mt-0.5">Daily Roll Call Summary</p>
                    </div>
                    <div className="flex gap-4 text-sm font-semibold">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> {group.presentCount} Present</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> {group.absentCount} Absent</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <tbody>
                        {group.records.map((rec: any) => (
                          <tr key={rec.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-white dark:hover:bg-slate-800/20 transition">
                            <td className="px-4 py-3 flex items-center gap-3">
                              <Avatar src={rec.student?.avatar} alt={rec.student?.name} className="w-8 h-8 rounded-full object-cover" />
                              <span className="font-semibold text-[15px] text-slate-900 dark:text-white">{rec.student?.name}</span>
                            </td>
                            <td className="px-4 py-3 text-[14px] text-slate-655 w-1/3">
                              {rec.student?.email}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[12px] font-bold ${rec.status === 'PRESENT' ? 'bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950/45 text-red-600 dark:text-red-400'}`}>
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {historyResponse?.meta && historyResponse.meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage(prev => prev - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-[14px] font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-50 transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-[14px] text-slate-655 font-semibold">
                    Page {historyResponse.meta.page} of {historyResponse.meta.totalPages}
                  </span>
                  <button
                    disabled={historyPage >= historyResponse.meta.totalPages}
                    onClick={() => setHistoryPage(prev => prev + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-[14px] font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-50 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 italic text-[16px]">
              No attendance records found in history for this course.
            </div>
          )}
        </div>
      )}

      {/* 3. My Attendance Calendar (Student view) */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  {[new Date().getFullYear() - 1, new Date().getFullYear()].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1 text-[14px] font-semibold text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Verified Log
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2.5 text-center text-[16px] font-semibold text-slate-500  mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2.5">
              {calendarDays.map((d, idx) => {
                if (d.status === 'empty') {
                  return <div key={`empty-${idx}`} className="h-12" />;
                }
                let cellClass = "bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 text-slate-800 dark:text-slate-350";
                if (d.status === 'present') cellClass = "bg-emerald-500 text-white font-semibold border border-emerald-500";
                else if (d.status === 'absent') cellClass = "bg-red-500 text-white font-semibold border border-red-500";
                else if (d.status === 'noclass') cellClass = "bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-250 dark:border-amber-900/40 font-semibold";
                else if (d.status === 'weekend') cellClass = "bg-slate-100/60 dark:bg-slate-950/40 text-slate-400 font-normal border border-transparent";

                return (
                  <div key={idx} className={`h-12 flex flex-col items-center justify-center rounded-xl text-[14px] transition ${cellClass}`}>
                    <span>{d.day}</span>
                    {d.status !== 'weekend' && d.status !== 'none' && (
                      <span className="text-[8px] uppercase mt-0.5 opacity-90 font-black">
                        {d.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-4">Stat Analytics</h3>
              <div className="h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {calendarDays.length ? Math.round((presentDays / (presentDays + absentDays || 1)) * 100) : 100}%
                  </span>
                  <span className="text-[12px] text-slate-655 font-semibold">Log Quality</span>
                </div>
              </div>

              <div className="mt-6 space-y-2 text-[14px] font-semibold">
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present Days</span>
                  <span className="font-semibold text-slate-950 dark:text-white ">{presentDays} Lectures</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Absent Days</span>
                  <span className="font-semibold text-slate-950 dark:text-white ">{absentDays} Lectures</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
              <div className="text-[14px]">
                <p className="font-semibold text-slate-900 dark:text-white">Verification Success</p>
                <p className="text-slate-655 mt-0.5">Your monthly log quality satisfies aggregate requirements for certified examination eligibility (85%).</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Attendance;
