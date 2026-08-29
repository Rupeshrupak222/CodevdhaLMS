"use client";

import React, { useState } from 'react';
import { useLMS } from '@/context/LMSContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, AlertCircle, Info, Plus, X, ArrowLeft, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export const Notifications = () => {
  const { activeRole } = useLMS();
  const router = useRouter();
  const { data: notificationsData, mutate } = useSWR('/notifications', fetcher);
  const notifications = Array.isArray(notificationsData) ? notificationsData : [];

  const { data: coursesData } = useSWR(activeRole === 'admin' ? '/courses' : null, fetcher);
  const courses = coursesData?.data || [];

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewNotif, setPreviewNotif] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm();

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      mutate();
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      mutate();
      toast.success('Notification removed');
    } catch (err: any) {
      toast.error('Failed to remove notification');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await api.post('/notifications', data);
      toast.success('Announcement created successfully');
      setIsCreateOpen(false);
      reset();
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create announcement');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'WARNING': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'ERROR': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 ">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => router.back()}
            className="mt-1 p-2 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700  transition cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-[#a855f7]" />
              Notifications
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">View your latest updates and announcements.</p>
          </div>
        </div>
        {activeRole === 'admin' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#a855f7] hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Create Announcement
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900  overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="font-medium text-slate-900 dark:text-white">No notifications yet</p>
            <p className="text-sm">You are all caught up!</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((notif: any) => (
              <li 
                key={notif.id} 
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex gap-4 ${!notif.isRead ? 'bg-amber-50/50 dark:bg-slate-800/80' : ''}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notif.type)}
                </div>
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setPreviewNotif(notif)}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {notif.title}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {notif.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-shrink-0 self-center items-center gap-2">
                  {activeRole !== 'admin' && !notif.isRead && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 rounded-full transition"
                    >
                      Mark as read
                    </button>
                  )}
                  {activeRole !== 'admin' && (
                    <button 
                      onClick={(e) => handleDeleteNotification(e, notif.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition"
                      title="Remove notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewNotif && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewNotif(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {getIcon(previewNotif.type)}
                  Notification
                </h2>
                <button
                  onClick={() => setPreviewNotif(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <h3 className="text-md font-bold text-slate-900 dark:text-white mb-2">{previewNotif.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{previewNotif.description}</p>
                <div className="mt-4 text-xs text-slate-400 font-medium">
                  {new Date(previewNotif.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Announcement Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#a855f7]" />
                  Create Announcement
                </h2>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Title
                    </label>
                    <input
                      {...register('title', { required: true })}
                      type="text"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#a855f7] focus:border-transparent outline-none bg-slate-50 dark:bg-slate-800 dark:text-white transition"
                      placeholder="e.g. System Maintenance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Message
                    </label>
                    <textarea
                      {...register('description', { required: true })}
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#a855f7] focus:border-transparent outline-none bg-slate-50 dark:bg-slate-800 dark:text-white transition resize-none"
                      placeholder="Describe the announcement..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Type
                      </label>
                      <select
                        {...register('type')}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#a855f7] focus:border-transparent outline-none bg-slate-50 dark:bg-slate-800 dark:text-white transition"
                      >
                        <option value="INFO">Information</option>
                        <option value="SUCCESS">Success</option>
                        <option value="WARNING">Warning</option>
                        <option value="ERROR">Alert / Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Target Audience
                      </label>
                      <select
                        {...register('targetAudience', { required: true })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#a855f7] focus:border-transparent outline-none bg-slate-50 dark:bg-slate-800 dark:text-white transition max-h-60 overflow-y-auto"
                      >
                        <option value="all_students">All Students</option>
                        <option value="all_teachers">All Teachers</option>
                        <option value="both">Both (Students & Teachers)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-sm font-medium bg-[#a855f7] hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 transition active:scale-95"
                    >
                      Send Announcement
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
