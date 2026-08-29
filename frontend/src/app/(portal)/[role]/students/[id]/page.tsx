"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Avatar } from '@/components/common/Avatar';
import { ArrowLeft, Award, BookOpen, Clock, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLMS } from '@/context/LMSContext';

export default function StudentDetailPage() {
  const router = useRouter();
  const { id, role } = useParams();
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('All');
  const { activeRole } = useLMS();

  // Fetch student details from API
  const { data: student, error, isLoading } = useSWR(id ? `/users/${id}` : null, fetcher);
  
  // Fetch courses to filter by teacher's assigned courses
  const { data: courses = [], isLoading: isCoursesLoading } = useSWR(activeRole === 'faculty' ? '/courses' : null, fetcher);

  if (isLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading student profile...</div>;
  }

  if (error || !student) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        Error loading student profile details.
      </div>
    );
  }

  const facultyCourseIds = activeRole === 'faculty' ? courses.map((c: any) => c.id) : [];

  const enrolledCourseIds = (student.enrollments || []).map((e: any) => e.courseId);

  // Pre-calculate academic stats (filtered by selected course and faculty courses if applicable)
  const enrollments = (student.enrollments || []).filter((e: any) => 
    (activeRole === 'admin' || facultyCourseIds.includes(e.courseId)) &&
    (selectedCourseFilter === 'All' || e.courseId === selectedCourseFilter)
  );
  const attendances = (student.attendances || []).filter((a: any) => 
    (activeRole === 'admin' || facultyCourseIds.includes(a.courseId)) &&
    enrolledCourseIds.includes(a.courseId) &&
    (selectedCourseFilter === 'All' || a.courseId === selectedCourseFilter)
  );
  
  // Calculate attendance rate
  const attendanceRate = attendances.length > 0
    ? Math.round((attendances.filter((r: any) => r.status === 'PRESENT').length / attendances.length) * 100)
    : 100;

  // Filter task scores and quiz scores by selected course and faculty courses
  const filteredTaskSubmissions = (student.taskSubmissions || []).filter((sub: any) => 
    (activeRole === 'admin' || facultyCourseIds.includes(sub.task?.courseId)) &&
    (selectedCourseFilter === 'All' || sub.task?.courseId === selectedCourseFilter)
  );
  
  const filteredQuizAttemptsRaw = (student.quizAttempts || []).filter((att: any) => 
    (activeRole === 'admin' || facultyCourseIds.includes(att.quiz?.courseId)) &&
    (selectedCourseFilter === 'All' || att.quiz?.courseId === selectedCourseFilter)
  );

  // Calculate grade
  const taskScores = filteredTaskSubmissions.filter((sub: any) => sub.grade).map((sub: any) => {
    const gp = { 'O': 95, 'A_PLUS': 88, 'A': 78, 'B_PLUS': 68, 'B': 58, 'C': 48, 'D': 38 };
    return gp[sub.grade] || 0;
  });
  const quizScores = filteredQuizAttemptsRaw.map((q: any) => q.percentage);

  const components: number[] = [];
  if (taskScores.length > 0) {
    components.push(taskScores.reduce((sum: number, v: number) => sum + v, 0) / taskScores.length);
  }
  if (quizScores.length > 0) {
    components.push(quizScores.reduce((sum: number, v: number) => sum + v, 0) / quizScores.length);
  }
  if (attendances.length > 0 || enrollments.length > 0) {
    components.push(attendanceRate);
  }

  const avgScore = components.length > 0 ? components.reduce((sum, v) => sum + v, 0) / components.length : 0;
  let calculatedGrade = 'N/A';
  if (components.length > 0) {
    if (avgScore >= 90) calculatedGrade = 'O';
    else if (avgScore >= 80) calculatedGrade = 'A+';
    else if (avgScore >= 70) calculatedGrade = 'A';
    else if (avgScore >= 60) calculatedGrade = 'B+';
    else if (avgScore >= 50) calculatedGrade = 'B';
    else if (avgScore >= 40) calculatedGrade = 'C';
    else calculatedGrade = 'F';
  }

  // Average progress
  const progress = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum: number, e: any) => sum + e.progress, 0) / enrollments.length)
    : 0;

  // Filter options: list of courses student is enrolled in
  const studentCourses = enrollments.map((e: any) => ({
    id: e.courseId,
    title: e.course?.title || 'Unknown Course',
    durationDays: e.durationDays,
    batchName: e.batch?.name
  }));

  // Filtering Assignments & Quizzes
  const filteredSubmissions = filteredTaskSubmissions.filter((sub: any) => {
    if (selectedCourseFilter === 'All') return true;
    return sub.task?.courseId === selectedCourseFilter;
  });

  const filteredQuizAttempts = filteredQuizAttemptsRaw.filter((att: any) => {
    if (selectedCourseFilter === 'All') return true;
    return att.quiz?.courseId === selectedCourseFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => router.push(`/${role}/students`)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Students
        </button>
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-655 dark:text-slate-300">Filter Course:</label>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-355 focus:outline-none"
          >
            <option value="All">All Enrolled Courses</option>
            {studentCourses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: General Profile Info */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar src={student.avatar} alt={student.name} className="w-24 h-24 rounded-full border-4 border-[#a855f7] object-cover shadow-md" />
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{student.name}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{student.email}</p>
            </div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${student.isActive
              ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800'
            }`}>
              {student.isActive ? 'Active Student' : 'Inactive'}
            </span>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-405">Academic Overview</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Attendance</span>
                <span className="text-md font-black text-slate-900 dark:text-white">{attendanceRate}%</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Grade</span>
                <span className="text-md font-black text-[#a855f7]">{calculatedGrade}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Progress</span>
                <span className="text-md font-black text-slate-900 dark:text-white">{progress}%</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-405 mb-3">Enrolled Courses</h3>
            {studentCourses.length > 0 ? (
              <div className="space-y-2">
                {studentCourses.map((c: any) => (
                  <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#a855f7] shrink-0" />
                      <span className="text-sm font-black text-slate-900 dark:text-white truncate">{c.title}</span>
                    </div>
                    <div className="pl-6 text-[11px] font-bold text-slate-450 dark:text-slate-400">
                      {{
                        DAYS_30: '30 Days',
                        DAYS_45: '45 Days',
                        DAYS_90: '90 Days',
                        DAYS_180: '180 Days',
                      }[c.durationDays as string] || '90 Days'} • {c.batchName || 'No Batch'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-550 italic">Not enrolled in any courses</p>
            )}
          </div>
        </div>

        {/* Right Side: Performance History lists */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Assignment Performance */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" /> Assignment Performance ({filteredSubmissions.length})
            </h3>
            {filteredSubmissions.length > 0 ? (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {filteredSubmissions.map((sub: any) => (
                  <div key={sub.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate block">{sub.task?.title || 'Assignment'}</span>
                      {sub.task?.course?.title && (
                        <span className="text-[11px] text-[#a855f7] block mt-0.5">{sub.task.course.title}</span>
                      )}
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black">
                      {sub.grade ? sub.grade.replace('_', ' ') : 'PENDING'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-550 italic py-4">No assignments found matching the filter</p>
            )}
          </div>

          {/* Quiz Attempts */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" /> Quiz Attempts ({filteredQuizAttempts.length})
            </h3>
            {filteredQuizAttempts.length > 0 ? (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {filteredQuizAttempts.map((att: any) => (
                  <div key={att.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate block">{att.quiz?.title || 'Quiz'}</span>
                      {att.quiz?.course?.title && (
                        <span className="text-[11px] text-[#a855f7] block mt-0.5">{att.quiz.course.title}</span>
                      )}
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-black">
                      {att.percentage}% Score
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-550 italic py-4">No quizzes found matching the filter</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
