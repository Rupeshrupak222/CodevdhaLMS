"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { motion } from 'framer-motion';
import { TrendingUp, Users, BookOpen, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

import { Avatar } from '@/components/common/Avatar';

export const Performance = () => {
  const { activeRole } = useLMS();

  // API Data Fetching
  const { data: rawStudents = [], isLoading: isStudentsLoading } = useSWR('/users/students', fetcher);
  const { data: coursesData, isLoading: isCoursesLoading } = useSWR('/courses', fetcher);
  const courses = coursesData || [];

  const [selectedCourse, setSelectedCourse] = useState('All');

  // Load attendance records if a course is selected
  const { data: rawAttendance = [] } = useSWR(
    selectedCourse !== 'All' ? `/attendance?courseId=${selectedCourse}` : null,
    fetcher
  );

  // Map students to extract their enrolled courses and progress
  const mappedStudents = rawStudents.map((s: any) => {
    // A student might be enrolled in multiple courses, pick the first one matching filter or default
    const matchingEnrollment = selectedCourse === 'All'
      ? s.enrollments?.[0]
      : s.enrollments?.find((e: any) => e.courseId === selectedCourse);

    const progress = matchingEnrollment?.progress || 0;
    const courseName = matchingEnrollment?.course?.title || 'Not Enrolled';
    const courseId = matchingEnrollment?.courseId || '';

    const enrolledCourseIds = (s.enrollments || []).map((e: any) => e.courseId);
    // Calculate attendance rate dynamically from database records loaded on the student object
    const atts = s.attendances || [];
    const filteredAtts = selectedCourse === 'All'
      ? atts.filter((a: any) => enrolledCourseIds.includes(a.courseId))
      : atts.filter((a: any) => a.courseId === selectedCourse);

    const attendance = filteredAtts.length > 0
      ? Math.round((filteredAtts.filter((r: any) => r.status === 'PRESENT').length / filteredAtts.length) * 100)
      : 100;

    // Calculate Grade from task submissions, quiz attempts, and attendance
    const taskScores = s.taskSubmissions?.filter((sub: any) => sub.grade).map((sub: any) => {
      const gp = { 'O': 95, 'A_PLUS': 88, 'A': 78, 'B_PLUS': 68, 'B': 58, 'C': 48, 'D': 38 };
      return gp[sub.grade] || 0;
    }) || [];
    const quizScores = s.quizAttempts?.map((q: any) => q.percentage) || [];

    const components: number[] = [];
    if (taskScores.length > 0) {
      components.push(taskScores.reduce((sum: number, v: number) => sum + v, 0) / taskScores.length);
    }
    if (quizScores.length > 0) {
      components.push(quizScores.reduce((sum: number, v: number) => sum + v, 0) / quizScores.length);
    }
    // Attendance is always a component in grade calculation
    components.push(attendance);

    const avgScore = components.reduce((sum, v) => sum + v, 0) / components.length;
    let grade = 'F';
    if (avgScore >= 90) grade = 'O';
    else if (avgScore >= 80) grade = 'A+';
    else if (avgScore >= 70) grade = 'A';
    else if (avgScore >= 60) grade = 'B+';
    else if (avgScore >= 50) grade = 'B';
    else if (avgScore >= 40) grade = 'C';
    else grade = 'F';

    return {
      id: s.id,
      name: s.name,
      avatar: s.avatar || null,
      courseId,
      courseName,
      progress,
      attendance,
      quizzesTaken: s.quizAttempts?.length || 0,
      grade
    };
  });

  const facultyCourseIds = courses.map((c: any) => c.id);

  // Filter students by selected course and faculty access scope
  const filteredStudents = mappedStudents.filter((s: any) => {
    if (!s.courseId) return false;
    // Faculty can only see students enrolled in their assigned courses
    if (activeRole === 'faculty' && !facultyCourseIds.includes(s.courseId)) {
      return false;
    }
    if (selectedCourse !== 'All' && s.courseId !== selectedCourse) {
      return false;
    }
    return true;
  });

  const getPerformanceData = (progress: number) => {
    const base = Math.max(50, progress - 20);
    return Array.from({ length: 6 }, (_, i) => ({
      name: `Week ${i + 1}`,
      score: Math.min(100, Math.round(base + (i * (progress - base) / 5)))
    }));
  };

  if (isStudentsLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading student performance...</div>;
  }

  if (filteredStudents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-[#a855f7]" />
              Student Performance
            </h1>
            <p className="text-[16px] text-slate-500 dark:text-slate-400 mt-0.5">
              Track grades, attendance, and course progress for your students.
            </p>
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#a855f7]"
          >
            <option value="All">All Courses</option>
            {courses.map((course: any) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Enrolled Students</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                There are no students enrolled in the selected course cohort yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avgAttendance = Math.round(filteredStudents.reduce((acc: number, s: any) => acc + s.attendance, 0) / filteredStudents.length);
  const avgProgress = Math.round(filteredStudents.reduce((acc: number, s: any) => acc + s.progress, 0) / filteredStudents.length);
const totalQuizCompletions = filteredStudents.reduce(
  (acc: number, s: any) => acc + s.quizzesTaken,
  0
);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-[#a855f7]" />
            Student Performance
          </h1>
          <p className="text-[16px] text-slate-500 dark:text-slate-400 mt-0.5">
            Track grades, attendance, and course progress for your students.
          </p>
        </div>

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#a855f7]"
        >
          <option value="All">All Courses</option>
          {courses.map((course: any) => (
            <option key={course.id} value={course.id}>{course.title}</option>
          ))}
        </select>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[16px] text-slate-500 dark:text-slate-400 font-semibold">Total Students</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{filteredStudents.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[16px] text-slate-500 dark:text-slate-400 font-semibold">Avg Attendance</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{avgAttendance}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[16px] text-slate-500 dark:text-slate-400 font-semibold">Avg Progress</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{avgProgress}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[16px] text-slate-500 dark:text-slate-400 font-semibold">Quiz Completion</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{totalQuizCompletions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredStudents.map((student: any, idx: number) => {
          const performanceData = getPerformanceData(student.progress);
          const avgScore = performanceData.reduce((acc, curr) => acc + curr.score, 0) / performanceData.length;

          return (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              key={student.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-200 font-semibold text-[16px]"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={student.avatar}
                    alt={student.name}
                    className="w-12 h-12 rounded-full border-2 border-slate-100 dark:border-slate-800 object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">{student.name}</h3>
                    <p className="text-[14px] text-[#a855f7] font-semibold">{student.courseName}</p>
                  </div>
                </div>
                {/* <div className="text-right">
                  <span className="text-[14px] text-slate-400 block font-semibold">Overall Grade</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{student.grade}</span>
                </div> */}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-6 text-[14px]">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[14px] text-slate-400 font-semibold block">Attendance</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{student.attendance}%</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[14px] text-slate-400 font-semibold block">Progress</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{student.progress}%</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[14px] text-slate-400 font-semibold block">Quizzes</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{student.quizzesTaken}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[14px] font-semibold text-slate-400">Performance Trend</h4>
                  <span className="text-[14px] font-semibold text-slate-600 dark:text-slate-400">
                    Avg: {Math.round(avgScore)}%
                  </span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(30, 41, 59, 0.9)',
                          borderColor: '#475569',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '10px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#38BDF8"
                        strokeWidth={3}
                        dot={{ fill: '#38BDF8', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
export default Performance;
