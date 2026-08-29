"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Calendar, Clock, User, Link as LinkIcon, X, CheckCircle2, PlayCircle, Plus, Trash2, Check, Upload, Loader2, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Avatar } from '@/components/common/Avatar';

export const Classes = () => {
  const { activeRole } = useLMS();
  const router = useRouter();

  // API Data Fetching
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const { data: coursesData, isLoading: isCoursesLoading } = useSWR('/courses', fetcher);
  const { data: batchesData } = useSWR('/batches?limit=500', fetcher);
  const courses = coursesData || [];
  const batches = Array.isArray(batchesData) ? batchesData : (batchesData?.batches || batchesData?.data?.batches || []);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const { data: rawClasses = [], mutate: mutateClasses, isLoading: isClassesLoading } = useSWR(
    selectedCourseId 
      ? `/live-classes?courseId=${selectedCourseId}${selectedBatchId ? `&batchId=${selectedBatchId}` : ''}`
      : null,
    fetcher
  );

  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Cancel Modal State
  const [cancelModalClass, setCancelModalClass] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Recording Upload State
  const [recordingModalClass, setRecordingModalClass] = useState<any>(null);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState<{ percent: number; loaded: number; total: number } | null>(null);

  // Edit Modal State
  const [editModalClass, setEditModalClass] = useState<any>(null);

  // Form Hooks
  const { register, handleSubmit, reset, watch } = useForm();

  const creatorCourseId = watch('courseId');
  const { data: creatorBatchesRaw } = useSWR(creatorCourseId ? `/batches?courseId=${creatorCourseId}&isActive=true` : null, fetcher);
  const creatorBatches = Array.isArray(creatorBatchesRaw) ? creatorBatchesRaw : (creatorBatchesRaw?.data?.batches || creatorBatchesRaw?.batches || []);

  // Automatic status updater for upcoming classes
  useEffect(() => {
    const checkAndUpdateStatus = async () => {
      const now = new Date();
      let hasUpdates = false;
      
      const parseDurationToMs = (durationStr?: string | null) => {
        if (!durationStr) return 2 * 60 * 60 * 1000;
        const str = String(durationStr).toLowerCase();
        let val = parseFloat(str);
        if (isNaN(val)) return 2 * 60 * 60 * 1000;
        if (str.includes('min') || str.includes('m')) return val * 60 * 1000;
        if (str.includes('hour') || str.includes('hr') || str.includes('h')) return val * 60 * 60 * 1000;
        if (val < 10) return val * 60 * 60 * 1000;
        return val * 60 * 1000;
      };

      // Filter classes to expire
      const classesToExpire = rawClasses.filter((item: any) => {
        const scheduledTime = new Date(item.scheduledAt).getTime();
        const durationMs = parseDurationToMs(item.duration);
        const expiresAt = scheduledTime + durationMs;
        
        // Classes expire after their scheduled start time + their actual duration
        if (item.status === 'SCHEDULED' || item.status === 'LIVE_NOW') {
          if (now.getTime() >= expiresAt) {
            return true;
          }
        }
        
        return false;
      });

      if (classesToExpire.length === 0) return;

      // Update each expired upcoming/live class
      for (const item of classesToExpire) {
        try {
          await api.put(`/live-classes/${item.id}`, {
            status: 'COMPLETED'
          });
          hasUpdates = true;
        } catch (err) {
          console.error('Failed to update class status:', err);
        }
      }

      if (hasUpdates) {
        mutateClasses();
        toast.success(`${classesToExpire.length} class(es) marked as completed`);
      }
    };

    // Check immediately and then every 30 seconds
    checkAndUpdateStatus();
    const interval = setInterval(checkAndUpdateStatus, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [rawClasses, mutateClasses]);

  // Group classes by status/type after mapping
  const mappedClasses = rawClasses.map((item: any) => {
    const dt = new Date(item.scheduledAt);
    const now = currentTime;
    
    // Parse duration to calculate expiration
    const durationStr = item.duration ? String(item.duration).toLowerCase() : '';
    let val = parseFloat(durationStr);
    let durationMs = 2 * 60 * 60 * 1000;
    if (!isNaN(val)) {
      if (durationStr.includes('min') || durationStr.includes('m')) durationMs = val * 60 * 1000;
      else if (durationStr.includes('hour') || durationStr.includes('hr') || durationStr.includes('h')) durationMs = val * 60 * 60 * 1000;
      else if (val < 10) durationMs = val * 60 * 60 * 1000;
      else durationMs = val * 60 * 1000;
    }
    const expiresAt = new Date(dt.getTime() + durationMs);

    let type = '';
    let status = '';
    
    if (item.status === 'CANCELLED') {
      type = 'Cancelled';
      status = 'Cancelled';
    } else if (item.type === 'RECORDED') {
      type = 'Recorded';
      status = 'Archived';
    } else if (item.status === 'COMPLETED' || expiresAt <= now) {
      type = 'Completed';
      status = 'Completed';
    } else if (item.status === 'LIVE_NOW' || (dt <= now && expiresAt > now)) {
      type = 'Live';
      status = 'Live Now';
    } else {
      type = 'Upcoming';
      status = 'Scheduled';
    }

    return {
      ...item,
      type,
      status,
      date: dt.toLocaleDateString(),
      time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      trainer: item.teacher?.name || 'Head Professor',
      trainerRole: item.teacher?.role || 'TEACHER',
      avatar: item.teacher?.avatar || null,
      courseName: item.course?.title || 'General',
      link: item.meetingLink,
      isExpired: dt <= now && item.type === 'UPCOMING' && item.status === 'SCHEDULED'
    };
  });

  // Filter classes with new logic
  const liveClasses = mappedClasses.filter(c => c.type === 'Live');
  const upcomingClasses = mappedClasses.filter(c => c.type === 'Upcoming');
  const recordedClasses = mappedClasses.filter(c => c.type === 'Recorded');
  const completedClasses = mappedClasses.filter(c => c.type === 'Completed').sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  const cancelledClasses = mappedClasses.filter(c => c.type === 'Cancelled');

  const getStatusColor = (status: string) => {
    if (status === 'Live Now') return 'bg-red-500 text-white animate-pulse';
    if (status === 'Scheduled') return 'bg-[#a855f7] text-slate-950';
    if (status === 'Completed') return 'bg-green-500 text-white';
    if (status === 'Cancelled') return 'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    return 'bg-slate-500 text-white';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Completed') return <Check className="w-3 h-3" />;
    if (status === 'Cancelled') return <X className="w-3 h-3" />;
    return null;
  };

  const onSubmit = async (data: any) => {
    try {
      await api.post('/live-classes', {
        title: data.title,
        courseId: data.courseId,
        batchId: data.batchId || null,
        type: data.type,
        status: data.status,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        duration: data.duration || undefined,
        meetingLink: data.meetingLink
      });
      toast.success('Live room created successfully!');
      mutateClasses();
      reset();
      setIsCreateOpen(false);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errorMsg = err.response.data.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        toast.error(`Validation Error: ${errorMsg}`);
      } else {
        toast.error(err.response?.data?.message || 'Failed to create room');
      }
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await api.delete(`/live-classes/${id}`);
      toast.success('Live room deleted successfully!');
      mutateClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete room');
    }
  };

  const confirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalClass) return;

    try {
      await api.put(`/live-classes/${cancelModalClass.id}`, { status: 'CANCELLED', cancelReason: cancelReason });
      toast.success('Live room cancelled successfully!');
      mutateClasses();
      setCancelModalClass(null);
      setCancelReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel room');
    }
  };

  const markAsCompleted = async (id: string) => {
    try {
      await api.put(`/live-classes/${id}`, { status: 'COMPLETED' });
      toast.success('Class marked as completed!');
      mutateClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to mark class as completed');
    }
  };

  const handleRecordingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recordingModalClass) return;

    setUploadingRecording(true);
    setRecordingProgress(null);
    try {
      const { uploadFileToS3 } = await import('@/lib/upload');
      const folder = `lectures/live-class/${recordingModalClass.courseId || 'general'}`;
      const { url } = await uploadFileToS3(file, folder, (progress) => {
        setRecordingProgress(progress);
      });

      // Save recording URL to the live class
      await api.put(`/live-classes/${recordingModalClass.id}`, { recordingUrl: url });
      toast.success('Recording uploaded successfully!');
      mutateClasses();
      setRecordingModalClass(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload recording');
      console.error(err);
    } finally {
      setUploadingRecording(false);
      setRecordingProgress(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editModalClass) return;
    const formData = new FormData(e.currentTarget);
    const payload: any = {};
    const title = formData.get('title') as string;
    const type = formData.get('type') as string;
    const status = formData.get('status') as string;
    const scheduledAt = formData.get('scheduledAt') as string;
    const duration = formData.get('duration') as string;
    const meetingLink = formData.get('meetingLink') as string;

    if (title) payload.title = title;
    if (type) payload.type = type;
    if (status) payload.status = status;
    if (scheduledAt) payload.scheduledAt = new Date(scheduledAt).toISOString();
    if (duration) payload.duration = duration;
    if (meetingLink) payload.meetingLink = meetingLink;

    try {
      await api.put(`/live-classes/${editModalClass.id}`, payload);
      toast.success('Class updated successfully!');
      mutateClasses();
      setEditModalClass(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update class');
    }
  };

  if (isClassesLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading lecture rooms...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Video className="w-7 h-7 text-[#a855f7]" />
            Online Lecture Rooms
          </h1>
          <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
            Enter live video rooms, register for upcoming calendar webinars, or watch archived lecture streams.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-755 dark:text-slate-300">Select Course:</label>
              <select
                className="bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedBatchId(''); // Reset batch when course changes
                }}
              >
                {courses.map((course: any) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>

            {(activeRole === 'admin' || activeRole === 'faculty') && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-755 dark:text-slate-300">Select Batch:</label>
                <select
                  className="bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                >
                  <option value="">All Batches (Global)</option>
                  {batches.filter((b: any) => b.courseId === selectedCourseId).map((batch: any) => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        {(activeRole === 'admin' || activeRole === 'faculty') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-purple-400 text-slate-950 px-4 py-2 rounded-xl text-[16px] font-semibold transition shadow-lg shadow-purple-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Schedule Room
          </button>
        )}
      </div>

      {/* Grid of Sections */}
      {activeRole === 'student' && rawClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-[#a855f7]" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">No Lecture Rooms Scheduled</h3>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">You must be enrolled in a course to access live classrooms, schedule webinars, or review archives.</p>
          <button onClick={() => router.push(`/${activeRole}/courses`)} className="mt-5 px-5 py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition">
            Go to My Courses
          </button>
        </div>
      ) : (activeRole !== 'student' && rawClasses.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-[#a855f7]" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">No Classes Found</h3>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            No live classes have been scheduled for this course{selectedBatchId ? ' and batch' : ''} yet. Click "Schedule Room" to create one.
          </p>
        </div>
      ) : (
      <div className="space-y-8">
        
        {/* 1. Live Now Section */}
        {liveClasses.length > 0 && (
          <div className="space-y-3">
            <span className="text-[14px] font-black text-red-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Live Lecturing
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveClasses.map((item) => (
                <motion.div
                  whileHover={{ y: -4 }}
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-[#1E293B] border-2 border-red-500/30 dark:border-red-500/10 p-5 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-955/20 text-red-650 dark:text-red-400 ">
                        {item.status}
                      </span>
                      <span className="text-[14px] text-slate-600 font-semibold">{item.date}</span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-4">{item.title}</h3>
                    <p className="text-[14px] text-[#a855f7] mt-1">{item.courseName}</p>

                    <div className="mt-5 flex items-center gap-3">
                      <Avatar src={item.avatar} alt={item.trainer} className="w-8 h-8 rounded-full object-cover border border-[#a855f7]" />
                      <div className="text-[14px]">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{item.trainer}</p>
                        <p className="text-[14px] text-slate-600">
                          {item.trainerRole === 'ADMIN' ? 'Admin' : `Faculty ${item.courseName}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[14px] text-slate-600 font-semibold  flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {item.time}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedClass(item)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-850 hover:border-purple-400 text-[14px] font-semibold rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-purple-400 transition"
                      >
                        Info
                      </button>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-500 text-white rounded-xl text-[14px] font-semibold transition shadow shadow-red-500/10"
                      >
                        <Video className="w-3 h-3" /> Enter Room
                      </a>
                      {(activeRole === 'admin' || activeRole === 'faculty') && (
                        <>
                          <button
                            onClick={() => setEditModalClass(item)}
                            title="Edit Class"
                            className="p-1.5 bg-slate-50 hover:bg-blue-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => markAsCompleted(item.id)}
                            title="Mark as Completed"
                            className="p-1.5 bg-slate-50 hover:bg-green-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCancelModalClass(item)}
                            title="Cancel Class"
                            className="p-1.5 bg-slate-50 hover:bg-purple-500 hover:text-slate-900 dark:bg-slate-900 rounded-lg transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(item.id)}
                            title="Delete Class"
                            className="p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Upcoming Schedule Section */}
        {upcomingClasses.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <span className="text-[14px] font-black text-purple-500 flex items-center gap-1.5">
              <Calendar className="w-4.5 h-4.5" /> Upcoming Syllabus Broadcasts
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingClasses.map((item) => (
                <motion.div
                  whileHover={{ y: -4 }}
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)} {item.status}
                      </span>
                      <span className="text-[14px] text-slate-655 font-semibold">{item.date}</span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-4">{item.title}</h3>
                    <p className="text-[14px] text-[#a855f7] mt-1">{item.courseName}</p>

                    <div className="mt-5 flex items-center gap-3">
                      <Avatar src={item.avatar} alt={item.trainer} className="w-8 h-8 rounded-full object-cover border border-[#a855f7]" />
                      <div className="text-[14px]">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{item.trainer}</p>
                        <p className="text-[14px] text-slate-600">
                          {item.trainerRole === 'ADMIN' ? 'Admin' : `Faculty ${item.courseName}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-slate-105 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[14px] text-slate-600 font-semibold  flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {item.time}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedClass(item)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-850 hover:border-purple-400 text-[14px] font-semibold rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-purple-400 transition"
                      >
                        Info
                      </button>
                      <button
                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-405 dark:text-slate-300 rounded-xl text-[14px] font-semibold cursor-not-allowed"
                      >
                        Locked
                      </button>
                      {(activeRole === 'admin' || activeRole === 'faculty') && (
                        <>
                          <button
                            onClick={() => setEditModalClass(item)}
                            title="Edit Class"
                            className="p-1.5 bg-slate-50 hover:bg-blue-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCancelModalClass(item)}
                            title="Cancel Class"
                            className="p-1.5 bg-slate-50 hover:bg-purple-500 hover:text-slate-900 dark:bg-slate-900 rounded-lg transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(item.id)}
                            title="Delete Class"
                            className="p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Completed Section - New Section for completed classes */}
        {completedClasses.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <span className="text-[14px] font-black text-green-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4.5 h-4.5" /> Completed Sessions
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedClasses.map((item) => (
                <motion.div
                  whileHover={{ y: -4 }}
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-[#1E293B] border border-green-200/50 dark:border-green-800/30 p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <Check className="w-3 h-3 inline mr-1" /> Completed
                      </span>
                      <span className="text-[14px] text-slate-655 font-semibold">{item.date}</span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-4">{item.title}</h3>
                    <p className="text-[14px] text-[#a855f7] mt-1">{item.courseName}</p>

                    <div className="mt-5 flex items-center gap-3">
                      <Avatar src={item.avatar} alt={item.trainer} className="w-8 h-8 rounded-full object-cover border border-[#a855f7]" />
                      <div className="text-[14px]">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{item.trainer}</p>
                        <p className="text-[14px] text-slate-600">
                          {item.trainerRole === 'ADMIN' ? 'Admin' : `Faculty ${item.courseName}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-slate-105 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[14px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Session Completed
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedClass(item)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-850 hover:border-purple-400 text-[14px] font-semibold rounded-lg text-slate-500 hover:text-slate-905 dark:hover:text-purple-400 transition"
                      >
                        Info
                      </button>
                      {item.recordingUrl && (
                        <a
                          href={item.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 rounded-lg text-[14px] font-semibold transition"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Watch
                        </a>
                      )}
                      {(activeRole === 'admin' || activeRole === 'faculty') && !item.recordingUrl && (
                        <button
                          onClick={() => setRecordingModalClass(item)}
                          title="Upload Recording"
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-500 hover:text-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg text-[14px] font-semibold transition"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload
                        </button>
                      )}
                      {(activeRole === 'admin' || activeRole === 'faculty') && (
                        <>
                          <button
                            onClick={() => setEditModalClass(item)}
                            title="Edit Class"
                            className="p-1.5 bg-slate-50 hover:bg-blue-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(item.id)}
                            className="p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Recorded Archives Section */}
        {recordedClasses.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <span className="text-[14px] font-black text-slate-655 flex items-center gap-1.5">
              <PlayCircle className="w-4.5 h-4.5" /> Recorded Lecture Streams
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recordedClasses.map((item) => (
                <motion.div
                  whileHover={{ y: -4 }}
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 ">
                        Archived
                      </span>
                      <span className="text-[14px] text-slate-600 font-semibold">{item.date}</span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-4">{item.title}</h3>
                    <p className="text-[14px] text-[#a855f7] mt-1">{item.courseName}</p>

                    <div className="mt-5 flex items-center gap-3">
                      <Avatar src={item.avatar} alt={item.trainer} className="w-8 h-8 rounded-full object-cover border border-[#a855f7]" />
                      <div className="text-[14px]">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{item.trainer}</p>
                        <p className="text-[14px] text-slate-600">
                          {item.trainerRole === 'ADMIN' ? 'Admin' : `Faculty ${item.courseName}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[14px] text-slate-655 font-semibold  flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {item.time}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedClass(item)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-850 hover:border-purple-400 text-[14px] font-semibold rounded-lg text-slate-500 hover:text-slate-905 dark:hover:text-purple-400 transition"
                      >
                        Info
                      </button>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 rounded-xl text-[14px] font-semibold transition shadow shadow-purple-500/10 animate-pulse"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Replay Session
                      </a>
                      {(activeRole === 'admin' || activeRole === 'faculty') && (
                        <button
                          onClick={() => confirmDelete(item.id)}
                          className="p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Cancelled Classes Section */}
        {cancelledClasses.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <span className="text-[14px] font-black text-slate-500 flex items-center gap-1.5">
              <X className="w-4.5 h-4.5" /> Cancelled Rooms
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cancelledClasses.map((item) => (
                <motion.div
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 ">
                        Cancelled
                      </span>
                      <span className="text-[14px] text-slate-600 font-semibold">{item.date}</span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-4">{item.title}</h3>
                    <p className="text-[14px] text-slate-400 mt-1">{item.courseName}</p>

                    {item.cancelReason && (
                      <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                        <p className="text-[12px] text-red-600 dark:text-red-400 font-medium">
                          <strong className="font-bold">Reason:</strong> {item.cancelReason}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[14px] text-slate-400 font-semibold  flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {item.time}
                    </span>
                    {(activeRole === 'admin' || activeRole === 'faculty') && (
                      <button
                        onClick={() => confirmDelete(item.id)}
                        className="p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

      </div>
      )}

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {selectedClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setSelectedClass(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[16px] font-semibold text-[#a855f7] ">Lecture Syllabus</span>
                <button onClick={() => setSelectedClass(null)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{selectedClass.title}</h3>
                  <p className="text-[14px] text-slate-600 mt-1 font-semibold">{selectedClass.courseName}</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[16px] space-y-2 text-slate-500 dark:text-slate-300">
                  <p className="flex justify-between"><span>Session Type:</span><span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClass.type} Lecture</span></p>
                  <p className="flex justify-between"><span>Scheduled Time:</span><span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClass.time}</span></p>
                  <p className="flex justify-between"><span>Duration:</span><span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClass.duration || 'Not specified'}</span></p>
                  <p className="flex justify-between"><span>Scope Date:</span><span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClass.date}</span></p>
                  {selectedClass.status === 'Completed' && (
                    <p className="flex justify-between text-green-600">
                      <span>Status:</span>
                      <span className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Completed
                      </span>
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[14px] font-semibold text-slate-600 block mb-2">Professor {selectedClass.courseName}</span>
                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                    <Avatar src={selectedClass.avatar} alt={selectedClass.trainer} className="w-10 h-10 rounded-full object-cover border border-[#a855f7]" />
                    <div className="text-[16px]">
                      <p className="font-semibold text-slate-850 dark:text-slate-100">{selectedClass.trainer}</p>
                      <p className="text-[14px] text-slate-600">
                        {selectedClass.trainerRole === 'ADMIN' ? 'Administrator' : `Specializes in ${selectedClass.courseName}`}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedClass.type === 'Live' && (
                  <a
                    href={selectedClass.link}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-center block py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-[16px] transition shadow shadow-red-500/10 mt-4"
                  >
                    Enter Live Video Room
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content font-semibold text-[16px]"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[16px] font-semibold text-[#a855f7]">Schedule Online Lecture Room</span>
                <button onClick={() => setIsCreateOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Lecture Room Title</label>
                  <input
                    type="text"
                    required
                    {...register('title')}
                    placeholder="e.g., Intro to Advanced Networking"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">CourseCohort</label>
                    <select
                      required
                      {...register('courseId')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="">Select Course</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Assign to Batch (Optional)</label>
                    <select
                      {...register('batchId')}
                      disabled={!creatorCourseId}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Course-wide (All Batches)</option>
                      {creatorBatches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Lecture Format</label>
                    <select
                      required
                      {...register('type')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="LIVE">Live Lecture</option>
                      <option value="UPCOMING">Upcoming Broadcast</option>
                      <option value="RECORDED">Recorded Stream</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Live Status</label>
                    <select
                      required
                      {...register('status')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="LIVE_NOW">Live Now</option>
                      <option value="COMPLETED">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Scheduled Time</label>
                    <input
                      type="datetime-local"
                      required
                      {...register('scheduledAt')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Duration (Optional)</label>
                    <input
                      type="text"
                      {...register('duration')}
                      placeholder="e.g., 1.5 Hours"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Meeting Link (URL)</label>
                    <input
                      type="url"
                      required
                      {...register('meetingLink')}
                      placeholder="https://meet.google.com/abc"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition mt-4"
                >
                  Publish Room
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL MODAL */}
      <AnimatePresence>
        {cancelModalClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setCancelModalClass(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[16px] font-semibold text-red-500 flex items-center gap-2">
                  <X className="w-5 h-5" /> Cancel Live Room
                </span>
                <button onClick={() => setCancelModalClass(null)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-[14px] text-slate-600 dark:text-slate-300">
                  You are about to cancel <strong className="text-slate-900 dark:text-white">{cancelModalClass.title}</strong>. 
                  This will notify all enrolled students.
                </p>
              </div>

              <form onSubmit={confirmCancel} className="space-y-4">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 text-[13px]">Reason for Cancellation</label>
                  <textarea
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Instructor is unavailable, internet outage..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none min-h-[100px]"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelModalClass(null)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition"
                  >
                    Keep Class
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition"
                  >
                    Confirm Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editModalClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setEditModalClass(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content font-semibold text-[16px]"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[16px] font-semibold text-[#a855f7]">Edit Live Class</span>
                <button onClick={() => setEditModalClass(null)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Lecture Room Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editModalClass.title}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Lecture Format</label>
                    <select
                      name="type"
                      required
                      defaultValue={editModalClass.type === 'Live' ? 'LIVE' : editModalClass.type === 'Upcoming' ? 'UPCOMING' : editModalClass.type === 'Recorded' ? 'RECORDED' : 'UPCOMING'}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="LIVE">Live Lecture</option>
                      <option value="UPCOMING">Upcoming Broadcast</option>
                      <option value="RECORDED">Recorded Stream</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Live Status</label>
                    <select
                      name="status"
                      required
                      defaultValue={editModalClass.status === 'Live Now' ? 'LIVE_NOW' : editModalClass.status === 'Scheduled' ? 'SCHEDULED' : editModalClass.status === 'Completed' ? 'COMPLETED' : 'CANCELLED'}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="LIVE_NOW">Live Now</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Scheduled Time</label>
                    <input
                      type="datetime-local"
                      name="scheduledAt"
                      required
                      defaultValue={editModalClass.scheduledAt ? new Date(editModalClass.scheduledAt).toISOString().slice(0, 16) : ''}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Duration</label>
                    <input
                      type="text"
                      name="duration"
                      defaultValue={editModalClass.duration || ''}
                      placeholder="e.g., 1.5 Hours"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Meeting Link (URL)</label>
                  <input
                    type="url"
                    name="meetingLink"
                    required
                    defaultValue={editModalClass.meetingLink || editModalClass.link || ''}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition mt-4"
                >
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECORDING UPLOAD MODAL */}
      <AnimatePresence>
        {recordingModalClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => { setRecordingModalClass(null); setUploadingRecording(false); setRecordingProgress(null); }} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[16px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Upload Class Recording
                </span>
                <button onClick={() => { setRecordingModalClass(null); setUploadingRecording(false); setRecordingProgress(null); }} className="text-slate-600 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 space-y-2">
                <p className="text-[14px] text-slate-600 dark:text-slate-300">
                  Upload the recording for <strong className="text-slate-900 dark:text-white">{recordingModalClass.title}</strong>
                </p>
                <p className="text-[12px] text-slate-400">Course: {recordingModalClass.courseName} &middot; {recordingModalClass.date}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-500 font-semibold mb-2 text-[13px]">Select Video File</label>
                  <input
                    type="file"
                    accept="video/*"
                    disabled={uploadingRecording}
                    onChange={handleRecordingUpload}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                </div>

                {uploadingRecording && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-blue-500 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading to S3...
                      </span>
                      {recordingProgress && (
                        <span className="text-slate-600 dark:text-slate-400">
                          {(recordingProgress.loaded / (1024 * 1024)).toFixed(1)} MB / {(recordingProgress.total / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${recordingProgress?.percent || 0}%` }}
                      />
                    </div>
                    {recordingProgress && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-right">
                        {recordingProgress.percent}% complete
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Supports MP4, WebM, MOV, MKV. File will be stored in S3 under lectures/live-class/
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default Classes;
