"use client";

import React, { useState } from 'react';
import { useLMS } from '@/context/LMSContext';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Users, BookOpen, Calendar, ClipboardList, Video,
  Plus, Trash2, ToggleLeft, ToggleRight, X, Loader2, Search,
  AlertCircle, UserMinus, UserPlus, CheckCircle
} from 'lucide-react';

const DURATION_LABELS: Record<string, string> = {
  DAYS_30: '30 Days', DAYS_45: '45 Days', DAYS_90: '90 Days', DAYS_180: '180 Days',
};

type Tab = 'students' | 'quizzes' | 'tasks' | 'classes';

export default function BatchDetailPage() {
  const { activeRole } = useLMS();
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  const { data: batchRaw, isLoading } = useSWR(`/batches/${batchId}`, fetcher);
  const batch: any = batchRaw?.data || batchRaw;

  const { data: quizzesRaw } = useSWR(batch?.courseId ? `/quizzes?courseId=${batch.courseId}&batchId=${batchId}` : null, fetcher);
  const { data: tasksRaw } = useSWR(batch?.courseId ? `/tasks?courseId=${batch.courseId}&batchId=${batchId}` : null, fetcher);
  const { data: classesRaw } = useSWR(batch?.courseId ? `/live-classes?courseId=${batch.courseId}&batchId=${batchId}` : null, fetcher);
  const { data: allStudentsRaw } = useSWR(batch?.courseId && showAssignModal ? `/courses/${batch.courseId}/students` : null, fetcher);

  const quizzes: any[] = Array.isArray(quizzesRaw?.data) ? quizzesRaw.data : (quizzesRaw?.quizzes || quizzesRaw || []);
  const tasks: any[] = Array.isArray(tasksRaw?.data) ? tasksRaw.data : (tasksRaw?.tasks || tasksRaw || []);
  const classes: any[] = Array.isArray(classesRaw?.data) ? classesRaw.data : (classesRaw?.classes || classesRaw || []);
  const batchStudents: any[] = batch?.enrollments || [];
  const batchStudentIds = new Set(batchStudents.map((e: any) => e.student.id));

  const allCourseStudents: any[] = (Array.isArray(allStudentsRaw?.data) ? allStudentsRaw.data : (allStudentsRaw || [])).filter(
    (e: any) => !batchStudentIds.has(e.student?.id || e.id)
  );

  const filteredCourseStudents = allCourseStudents.filter((s: any) =>
    (s.student?.name || s.name || '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleToggle = async () => {
    try {
      await api.patch(`/batches/${batchId}/toggle`);
      toast.success(`Batch ${batch.isActive ? 'deactivated' : 'activated'} successfully`);
      mutate(`/batches/${batchId}`);
    } catch { toast.error('Failed to toggle batch'); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/batches/${batchId}`);
      toast.success('Batch deleted successfully');
      router.push(`/${activeRole}/batches`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to delete batch'); }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      await api.delete(`/batches/${batchId}/students/${studentId}`);
      toast.success('Student removed from batch successfully');
      mutate(`/batches/${batchId}`);
    } catch { toast.error('Failed to remove student'); }
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0) return;
    setAssigning(true);
    try {
      await api.post(`/batches/${batchId}/students`, { studentIds: selectedStudents });
      toast.success(`${selectedStudents.length} student(s) assigned to batch`);
      setShowAssignModal(false);
      setSelectedStudents([]);
      mutate(`/batches/${batchId}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to assign students');
    } finally { setAssigning(false); }
  };

  const getDayProgress = () => {
    if (!batch) return { day: 0, total: 90, pct: 0 };
    const start = new Date(batch.startDate).getTime();
    const end = new Date(batch.endDate).getTime();
    const now = Date.now();
    const total = Math.round((end - start) / 86400000);
    if (now < start) return { day: 0, total, pct: 0, notStarted: true };
    if (now > end) return { day: total, total, pct: 100, finished: true };
    const day = Math.round((now - start) / 86400000);
    return { day, total, pct: Math.round((day / total) * 100) };
  };

  const prog = getDayProgress();

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'students', label: 'Students', icon: <Users className="w-4 h-4" />, count: batchStudents.length },
    { key: 'quizzes', label: 'Quizzes', icon: <BookOpen className="w-4 h-4" />, count: quizzes.length },
    { key: 'tasks', label: 'Assignments', icon: <ClipboardList className="w-4 h-4" />, count: tasks.length },
    { key: 'classes', label: 'Live Classes', icon: <Video className="w-4 h-4" />, count: classes.length },
  ];

  if (isLoading) return (
    <div className="flex justify-center items-center h-96 text-[#a855f7]">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );

  if (!batch) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
      <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
      <p className="text-sm font-semibold">Batch not found</p>
      <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer">Go Back</button>
    </div>
  );

  return (
    <div className="space-y-6 p-1">
      {/* Back */}
      <button
        onClick={() => router.push(`/${activeRole}/batches`)}
        className="flex items-center gap-1 text-xs font-bold text-slate-550 dark:text-slate-400 hover:text-[#a855f7] transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Batches
      </button>

      {/* Header Card */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a855f7] to-amber-500" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 border border-indigo-200 dark:border-indigo-500/20">
                {DURATION_LABELS[batch.durationDays] || 'N/A'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${batch.isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {batch.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">{batch.name}</h1>
            <p className="text-sm text-[#a855f7] font-semibold mt-0.5">{batch.course?.title}</p>
          </div>

          {activeRole === 'admin' && (
            <div className="flex gap-2">
              <button
                onClick={handleToggle}
                className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition cursor-pointer ${batch.isActive ? 'border-amber-200 text-amber-500 hover:bg-amber-500/5' : 'border-emerald-250 text-emerald-500 hover:bg-emerald-500/5'}`}
              >
                {batch.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {batch.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-rose-250 text-rose-500 hover:bg-rose-500/5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Batch
              </button>
            </div>
          )}
        </div>

        {/* Date + Progress */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Start Date</span>
              <span className="text-sm text-slate-800 dark:text-slate-200 font-bold">{new Date(batch.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">End Date</span>
              <span className="text-sm text-slate-800 dark:text-slate-200 font-bold">{new Date(batch.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Progress</span>
              <span className="text-sm text-indigo-500 font-black">
                {prog.notStarted ? 'Not started' : prog.finished ? 'Completed' : `Day ${prog.day} of ${prog.total}`}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${prog.pct}%` }}
              transition={{ duration: 0.8 }}
              className="h-full bg-gradient-to-r from-indigo-500 to-[#a855f7] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 dark:bg-[#1E293B] p-1 rounded-2xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${activeTab === tab.key ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
          >
            {tab.icon} {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-550 dark:text-slate-400'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* ── Students Tab ── */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {activeRole === 'admin' && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center justify-center gap-1.5 bg-[#a855f7] hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Assign Students
                </button>
              </div>
            )}
            {batchStudents.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                <p className="text-xs font-semibold">No students assigned to this batch yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {batchStudents.map((enrollment: any) => {
                  const s = enrollment.student;
                  return (
                    <div
                      key={s.id}
                      className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#a855f7]/10 text-[#a855f7] flex items-center justify-center font-bold text-sm">
                          {s.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{s.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{s.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-850 dark:text-slate-200">{enrollment.progress}%</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Progress</div>
                        </div>
                        {activeRole === 'admin' && (
                          <button
                            onClick={() => handleRemoveStudent(s.id)}
                            className="p-2 border border-rose-250 hover:bg-rose-500/5 text-rose-500 rounded-xl transition cursor-pointer"
                            title="Remove from batch"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Quizzes Tab ── */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            {activeRole !== 'student' && (
              <div className="flex justify-end">
                <button
                  onClick={() => router.push(`/${activeRole}/quizzes?courseId=${batch.courseId}&batchId=${batchId}`)}
                  className="flex items-center justify-center gap-1.5 bg-[#a855f7] hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Batch Quiz
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz: any) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{quiz.title}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{quiz._count?.questions || 0} questions • {quiz.durationMinutes} min</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 border border-indigo-100 dark:border-indigo-550/20">
                    Batch Quiz
                  </span>
                </div>
              ))}
              {quizzes.length === 0 && (
                <div className="col-span-2 py-12 text-center bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                  <p className="text-xs font-semibold">No quizzes for this batch yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tasks Tab ── */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {activeRole !== 'student' && (
              <div className="flex justify-end">
                <button
                  onClick={() => router.push(`/${activeRole}/tasks?courseId=${batch.courseId}&batchId=${batchId}`)}
                  className="flex items-center justify-center gap-1.5 bg-[#a855f7] hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Batch Assignment
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{task.title}</div>
                      <div className="text-[11px] text-slate-400 font-medium">Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-500 border border-amber-100 dark:border-amber-550/20">
                    Batch Task
                  </span>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="col-span-2 py-12 text-center bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-500">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                  <p className="text-xs font-semibold">No assignments for this batch yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Live Classes Tab ── */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            {activeRole !== 'student' && (
              <div className="flex justify-end">
                <button
                  onClick={() => router.push(`/${activeRole}/classes?courseId=${batch.courseId}&batchId=${batchId}`)}
                  className="flex items-center justify-center gap-1.5 bg-[#a855f7] hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Schedule Batch Class
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((cls: any) => (
                <div
                  key={cls.id}
                  className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{cls.title}</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {new Date(cls.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cls.status === 'LIVE_NOW' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {cls.status === 'LIVE_NOW' ? '🔴 Live' : 'Scheduled'}
                    </span>
                  </div>
                </div>
              ))}
              {classes.length === 0 && (
                <div className="col-span-2 py-12 text-center bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-500">
                  <Video className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                  <p className="text-xs font-semibold">No live classes scheduled for this batch yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Assign Students Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Assign Students to Batch</h3>
                <button onClick={() => setShowAssignModal(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search students by name..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 scrollbar-thin">
                {filteredCourseStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {allCourseStudents.length === 0 ? 'All enrolled students are already in this batch.' : 'No students match your search.'}
                  </div>
                ) : (
                  filteredCourseStudents.map((enrollment: any) => {
                    const s = enrollment.student || enrollment;
                    const sid = s.id;
                    const checked = selectedStudents.includes(sid);
                    return (
                      <div
                        key={sid}
                        onClick={() => setSelectedStudents(prev => checked ? prev.filter(id => id !== sid) : [...prev, sid])}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${checked ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500/40 text-slate-900 dark:text-white' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100'}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-400'}`}>
                          {checked && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {s.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate leading-snug">{s.name}</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{s.email}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-3 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignStudents}
                  disabled={assigning || selectedStudents.length === 0}
                  className="flex-2 py-2 bg-[#a855f7] hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {assigning ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Assign {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-955/65 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content text-center"
            >
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Delete "{batch.name}"?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                This batch will be permanently deleted. All students will remain enrolled in the course, just without a batch assignment.
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-350 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition"
                >
                  Delete Batch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
