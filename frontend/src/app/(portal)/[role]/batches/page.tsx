"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  Plus, Search, Calendar, Users, Clock, ChevronRight,
  ToggleLeft, ToggleRight, Trash2, X, Loader2, BookOpen,
  CheckCircle, AlertCircle, Eye, Pencil
} from 'lucide-react';

const DURATION_LABELS: Record<string, string> = {
  DAYS_30: '30 Days',
  DAYS_45: '45 Days',
  DAYS_90: '90 Days',
  DAYS_180: '180 Days',
};

const DURATION_COLORS: Record<string, string> = {
  DAYS_30: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  DAYS_45: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  DAYS_90: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  DAYS_180: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
};

export default function BatchesPage() {
  const { activeRole } = useLMS();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterCourseId, setFilterCourseId] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({ courseId: '', name: '', startDate: '', durationDays: 'DAYS_90' });
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', startDate: '', durationDays: 'DAYS_90' });
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 9;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenEdit = (batch: any) => {
    setEditBatchId(batch.id);
    const formattedDate = batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '';
    setEditForm({
      name: batch.name,
      startDate: formattedDate,
      durationDays: batch.durationDays || 'DAYS_90'
    });
  };

  // Fetch batches & courses
  const batchesFetcher = (url: string) => api.get(url).then(res => ({
    batches: res.data.data,
    meta: res.data.meta
  }));

  const { data: batchData, isLoading } = useSWR(
    `/batches?page=${currentPage}&limit=${pageSize}${filterCourseId ? `&courseId=${filterCourseId}` : ''}${filterActive ? `&isActive=${filterActive}` : ''}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`,
    batchesFetcher
  );

  // Separate call for stats (all batches, no pagination)
  const { data: allBatchData } = useSWR('/batches?limit=1000', batchesFetcher);

  const { data: coursesData } = useSWR('/courses?limit=200', fetcher);

  const batches: any[] = batchData?.batches || [];
  const meta = batchData?.meta || { page: 1, totalPages: 1, total: 0, hasNextPage: false, hasPrevPage: false };
  const allBatches: any[] = allBatchData?.batches || [];
  const courses: any[] = Array.isArray(coursesData) ? coursesData : (coursesData?.courses || coursesData?.data?.courses || []);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCourseId, filterActive, debouncedSearch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !form.name || !form.startDate) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/batches', form);
      toast.success('Batch created successfully!');
      setShowCreateModal(false);
      setForm({ courseId: '', name: '', startDate: '', durationDays: 'DAYS_90' });
      mutate((key: string) => typeof key === 'string' && key.startsWith('/batches'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (batch: any) => {
    try {
      await api.patch(`/batches/${batch.id}/toggle`);
      toast.success(`Batch ${batch.isActive ? 'deactivated' : 'activated'} successfully`);
      mutate((key: string) => typeof key === 'string' && key.startsWith('/batches'));
    } catch {
      toast.error('Failed to toggle batch status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/batches/${id}`);
      toast.success('Batch deleted. Students remain enrolled in the course.');
      setDeleteConfirmId(null);
      mutate((key: string) => typeof key === 'string' && key.startsWith('/batches'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete batch');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.startDate) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/batches/${editBatchId}`, editForm);
      toast.success('Batch updated successfully!');
      setEditBatchId(null);
      mutate((key: string) => typeof key === 'string' && key.startsWith('/batches'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update batch');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute preview end date for form
  const durationDaysMap: Record<string, number> = { DAYS_30: 30, DAYS_45: 45, DAYS_90: 90, DAYS_180: 180 };
  const previewEndDate = form.startDate && form.durationDays
    ? (() => {
        const d = new Date(form.startDate);
        d.setDate(d.getDate() + (durationDaysMap[form.durationDays] || 90));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      })()
    : null;

  const previewEditEndDate = editForm.startDate && editForm.durationDays
    ? (() => {
        const d = new Date(editForm.startDate);
        d.setDate(d.getDate() + (durationDaysMap[editForm.durationDays] || 90));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      })()
    : null;

  const getDayProgress = (batch: any) => {
    const start = new Date(batch.startDate).getTime();
    const end = new Date(batch.endDate).getTime();
    const now = Date.now();
    if (now < start) return { day: 0, total: Math.round((end - start) / 86400000), pct: 0, notStarted: true };
    if (now > end) return { day: Math.round((end - start) / 86400000), total: Math.round((end - start) / 86400000), pct: 100, finished: true };
    const day = Math.round((now - start) / 86400000);
    const total = Math.round((end - start) / 86400000);
    return { day, total, pct: Math.round((day / total) * 100) };
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#a855f7]" />
            Batch Management
          </h1>
          <p className="text-[15px] text-slate-500 dark:text-slate-300 mt-0.5">
            Create and scope course sections, quizzes, and live classes to targeted batches.
          </p>
        </div>
        {activeRole === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Batch
          </button>
        )}
      </div>

      {/* Stats Row */}
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Batches', value: allBatches.length, icon: <BookOpen className="w-4 h-4" />, color: 'text-indigo-500 bg-indigo-500/10' },
            { label: 'Active Batches', value: allBatches.filter(b => b.isActive).length, icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-500 bg-emerald-500/10' },
            { label: 'Total Students', value: allBatches.reduce((a, b) => a + (b._count?.enrollments || 0), 0), icon: <Users className="w-4 h-4" />, color: 'text-blue-500 bg-blue-500/10' },
            { label: 'Courses with Batches', value: new Set(allBatches.map(b => b.courseId)).size, icon: <BookOpen className="w-4 h-4" />, color: 'text-amber-500 bg-amber-500/10' },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.color}`}>{stat.icon}</div>
              <div>
                <div className="text-xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search batches by name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>
        <select
          value={filterCourseId}
          onChange={e => setFilterCourseId(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Batch Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12 text-[#a855f7]"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : batches.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-500">
          <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-350" />
          <p className="text-sm font-semibold">No batches found. {activeRole === 'admin' ? 'Create your first batch!' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch, idx) => {
            const prog = getDayProgress(batch);
            const badgeClass = DURATION_COLORS[batch.durationDays] || 'text-slate-500 bg-slate-500/10 border-slate-500/20';

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                      {DURATION_LABELS[batch.durationDays] || 'N/A'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${batch.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200/50 dark:bg-slate-800 text-slate-500'}`}>
                      {batch.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-sm leading-snug">{batch.name}</h3>
                  <p className="text-xs text-[#a855f7] font-semibold mt-0.5">{batch.course?.title}</p>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 mt-4 py-2.5 border-t border-b border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Start Date</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{new Date(batch.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">End Date</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{new Date(batch.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Day Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-slate-500 font-semibold">
                        {prog.notStarted ? 'Not started' : prog.finished ? 'Finished' : `Day ${prog.day} of ${prog.total}`}
                      </span>
                      <span className="text-indigo-500 font-black">{prog.pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${prog.pct}%` }} />
                    </div>
                  </div>

                  {/* Stats list */}
                  <div className="flex gap-4 mt-4 text-[11px] text-slate-405 font-bold">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {batch._count?.enrollments || 0} Students</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {batch._count?.quizzes || 0} Quizzes</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    onClick={() => router.push(`/${activeRole}/batches/${batch.id}`)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Batch
                  </button>
                  {activeRole === 'admin' && (
                    <>
                      <button
                        onClick={() => handleToggle(batch)}
                        className={`px-3 py-2 border rounded-xl text-xs transition ${batch.isActive ? 'border-amber-200 text-amber-500 hover:bg-amber-500/10' : 'border-emerald-250 text-emerald-500 hover:bg-emerald-500/10'}`}
                      >
                        {batch.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(batch)}
                        className="px-3 py-2 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(batch.id)}
                        className="px-3 py-2 border border-rose-250 text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={!meta.hasPrevPage}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer hover:border-amber-400 transition"
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Page {currentPage} of {meta.totalPages}
          </span>
          <button
            disabled={!meta.hasNextPage}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, meta.totalPages))}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer hover:border-amber-400 transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Batch Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-955/65 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Create New Batch</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-655 hover:text-slate-655 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-sm font-semibold">
                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Cohort</label>
                  <select
                    value={form.courseId}
                    onChange={e => setForm({ ...form, courseId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    required
                  >
                    <option value="">Select a course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Batch Duration</label>
                  <select
                    value={form.durationDays}
                    onChange={e => setForm({ ...form, durationDays: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="DAYS_30">30 Days</option>
                    <option value="DAYS_45">45 Days</option>
                    <option value="DAYS_90">90 Days</option>
                    <option value="DAYS_180">180 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Batch Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. July 2025, Batch A"
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                  {previewEndDate && (
                    <p className="text-xs text-indigo-500 font-semibold mt-2">
                      ✓ Batch ends on <strong>{previewEndDate}</strong>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#a855f7] hover:bg-amber-400 text-slate-955 font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Batch
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Batch Modal */}
      <AnimatePresence>
        {editBatchId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-955/65 backdrop-blur-sm" onClick={() => setEditBatchId(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Edit Batch</h3>
                <button onClick={() => setEditBatchId(null)} className="text-slate-655 hover:text-slate-655 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-sm font-semibold">
                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Cohort</label>
                  <input
                    value={batches.find(b => b.id === editBatchId)?.course?.title || ''}
                    disabled
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-slate-400 dark:text-slate-500 focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Batch Duration</label>
                  <select
                    value={editForm.durationDays}
                    onChange={e => setEditForm({ ...editForm, durationDays: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="DAYS_30">30 Days</option>
                    <option value="DAYS_45">45 Days</option>
                    <option value="DAYS_90">90 Days</option>
                    <option value="DAYS_180">180 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Batch Name</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g. July 2025, Batch A"
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                  {previewEditEndDate && (
                    <p className="text-xs text-indigo-500 font-semibold mt-2">
                      ✓ Batch ends on <strong>{previewEditEndDate}</strong>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#a855f7] hover:bg-amber-400 text-slate-955 font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-955/65 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content text-center"
            >
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Delete Batch?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                This will permanently delete the batch. Students will remain enrolled in the course.
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
