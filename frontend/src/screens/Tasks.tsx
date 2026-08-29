"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, Plus, Trash2, Eye, CheckCircle2, 
  Clock, X, AlertCircle, Send, Award, FileText, Download, Play, Loader2, Video
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export const Tasks = () => {
  const { activeRole, user } = useLMS();
  const pathname = usePathname(); const searchParams = useSearchParams();
  const router = useRouter();
  const routeBase = activeRole === 'faculty' ? '/teacher/tasks' : `/${activeRole}/tasks`;

  // API Data Fetching
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 9;
  const { data: coursesData, isLoading: isCoursesLoading } = useSWR('/courses', fetcher);
  const { data: batchesData } = useSWR('/batches?limit=500', fetcher);
  const courses = coursesData || [];
  const batches = Array.isArray(batchesData) ? batchesData : (batchesData?.batches || batchesData?.data?.batches || []);

  const tasksFetchUrl = (() => {
    const params = new URLSearchParams();
    if (selectedCourseId) params.set('courseId', selectedCourseId);
    if (selectedBatchId) params.set('batchId', selectedBatchId);
    params.set('page', String(currentPage));
    params.set('limit', String(tasksPerPage));
    return `/tasks?${params.toString()}`;
  })();

  const { data: tasksResponse, mutate: mutateTasks, isLoading: isTasksLoading } = useSWR(
    tasksFetchUrl,
    (url: string) => api.get(url).then(res => res.data)
  );
  const rawTasks = tasksResponse?.data || [];
  const tasksMeta = tasksResponse?.meta || { page: 1, totalPages: 1, total: 0 };

  // Tab filter: 'all' | 'pending' | 'completed' | 'reviewed'
  const [activeTab, setActiveTab] = useState('all');

  // Modals state
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmissionsListOpen, setIsSubmissionsListOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // S3 uploader states for task assignment
  const [assignFile, setAssignFile] = useState<any>(null);
  const [assignUrl, setAssignUrl] = useState<string | null>(null);
  const [uploadingAssign, setUploadingAssign] = useState(false);

  // S3 uploader states for student submission
  const [submitFile, setSubmitFile] = useState<any>(null);
  const [submitUrl, setSubmitUrl] = useState<string | null>(null);
  const [uploadingSubmit, setUploadingSubmit] = useState(false);

  // Preview modals state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<any>(null);

  // Sync tab with URL queries (e.g. ?view=daily, ?view=weekly, ?view=submitted, ?view=faculty)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const view = params.get('view');
    if (view === 'daily') setActiveTab('pending');
    else if (view === 'weekly') setActiveTab('reviewed');
    else if (view === 'submitted') setActiveTab('completed');
    else setActiveTab('all');
  }, [searchParams.toString()]);

  // Form Hooks
  const { register: registerAssign, handleSubmit: handleSubmitAssign, reset: resetAssign, watch: watchAssign } = useForm();
  const { register: registerSubmit, handleSubmit: handleSubmitSubmit, reset: resetSubmit } = useForm();
  const { register: registerReview, handleSubmit: handleSubmitReview, reset: resetReview } = useForm();

  const assignCourseId = watchAssign('courseId');
  const { data: assignBatchesRaw } = useSWR(assignCourseId ? `/batches?courseId=${assignCourseId}&isActive=true` : null, fetcher);
  const assignBatches = Array.isArray(assignBatchesRaw) ? assignBatchesRaw : (assignBatchesRaw?.data?.batches || assignBatchesRaw?.batches || []);

  // Helper Preview Conditions
  const isVideoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || 
           cleanUrl.endsWith('.webm') || 
           cleanUrl.endsWith('.ogg') || 
           cleanUrl.endsWith('.m4v') || 
           cleanUrl.endsWith('.mov');
  };

  const isPdfUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.pdf');
  };

  const handlePreviewAttachment = (url: string, title: string, description: string = '') => {
    if (!url || url === '#') {
      toast.error('No resource link available');
      return;
    }

    if (isVideoUrl(url)) {
      setSelectedPreviewFile({ url, title, description });
      setIsVideoModalOpen(true);
    } else if (isPdfUrl(url)) {
      setSelectedPreviewFile({ url, title, description });
      setIsPdfModalOpen(true);
    } else {
      window.open(url, '_blank');
    }
  };

  // Upload S3 Handlers
  const handleAssignFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAssignFile(file);
    setUploadingAssign(true);
    try {
      const { uploadFileToS3 } = await import('@/lib/upload');
      const { url } = await uploadFileToS3(file, 'assignments');
      setAssignUrl(url);
      toast.success('Assignment resource uploaded successfully to S3!');
    } catch (err: any) {
      toast.error('Failed to upload resource to S3');
      console.error(err);
    } finally {
      setUploadingAssign(false);
    }
  };

  const handleSubmitFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitFile(file);
    setUploadingSubmit(true);
    try {
      const { uploadFileToS3 } = await import('@/lib/upload');
      const { url } = await uploadFileToS3(file, 'submissions');
      setSubmitUrl(url);
      toast.success('Submission file uploaded successfully to S3!');
    } catch (err: any) {
      toast.error('Failed to upload submission file to S3');
      console.error(err);
    } finally {
      setUploadingSubmit(false);
    }
  };

  // Submissions
  const onAssignSubmit = async (data: any) => {
    if (assignFile && !assignUrl) {
      toast.error('Please wait for the project resource to finish uploading');
      return;
    }
    try {
      const finalUrl = assignUrl || data.attachmentUrl;
      await api.post('/tasks', {
        title: data.title,
        courseId: data.courseId,
        batchId: data.batchId || null,
        description: data.description,
        dueDate: new Date(data.dueDate).toISOString(),
        attachmentUrl: finalUrl || undefined,
        studentIds: [] // Assign to all by default
      });
      toast.success('Task created successfully!');
      mutateTasks();
      resetAssign();
      setAssignFile(null);
      setAssignUrl(null);
      setIsAssignOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const onSubmitWorkSubmit = async (data: any) => {
    if (submitFile && !submitUrl) {
      toast.error('Please wait for your file to finish uploading');
      return;
    }
    try {
      const finalFileUrl = submitUrl || data.fileUrl;
      await api.post(`/tasks/${selectedTask.id}/submissions`, {
        comment: data.comment,
        githubUrl: data.githubUrl || undefined,
        fileUrl: finalFileUrl || undefined
      });
      toast.success('Work submitted successfully!');
      mutateTasks();
      resetSubmit();
      setSubmitFile(null);
      setSubmitUrl(null);
      setIsSubmitOpen(false);
      setSelectedTask(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit work');
    }
  };

  const onReviewSubmit = async (data: any) => {
    try {
      await api.put(`/tasks/${selectedTask.id}/submissions/${selectedSubmission.studentId}/grade`, {
        grade: data.grade,
        feedback: data.feedback
      });
      toast.success('Grade logged successfully!');
      setIsReviewOpen(false);
      setSelectedSubmission(null);
      // Reload task details to get updated submissions list
      await fetchTaskDetails(selectedTask.id);
      setIsSubmissionsListOpen(true);
      mutateTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to log grade');
    }
  };

  const fetchTaskDetails = async (id: string) => {
    try {
      const res = await api.get(`/tasks/${id}`);
      setSelectedTask(res.data.data);
    } catch (err) {
      toast.error('Failed to load task details');
    }
  };

  const triggerViewSubmissions = async (task: any) => {
    setSelectedTask(task);
    setIsSubmissionsListOpen(true);
    await fetchTaskDetails(task.id);
  };

  const triggerViewDetail = async (task: any) => {
    setLoadingDetail(true);
    setIsDetailOpen(true);
    try {
      const res = await api.get(`/tasks/${task.id}`);
      setDetailTask(res.data.data);
    } catch (err) {
      toast.error('Failed to load task details');
      setIsDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const triggerGradeSubmission = (submission: any) => {
    setIsSubmissionsListOpen(false);
    setSelectedSubmission(submission);
    setIsReviewOpen(true);
  };

  const triggerSubmitWork = (task: any) => {
    setSelectedTask(task);
    setIsSubmitOpen(true);
  };

  const confirmDelete = async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted successfully!');
      mutateTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // Map API tasks to UI tasks
  const mappedTasks = rawTasks.map((t: any) => {
    if (activeRole === 'student') {
      const sub = t.submissions?.[0];
      let status = 'Pending';
      if (sub) {
        status = sub.status === 'REVIEWED' ? 'Reviewed' : 'Completed';
      }
      return {
        ...t,
        status,
        grade: sub?.grade,
        feedback: sub?.feedback,
        courseName: t.course?.title || 'General',
        assignedDate: new Date(t.createdAt).toLocaleDateString(),
        dueDate: new Date(t.dueDate).toLocaleDateString(),
        studentSubmission: sub
      };
    } else {
      return {
        ...t,
        status: t._count?.submissions > 0 ? 'Completed' : 'Pending',
        courseName: t.course?.title || 'General',
        assignedDate: new Date(t.createdAt).toLocaleDateString(),
        dueDate: new Date(t.dueDate).toLocaleDateString()
      };
    }
  });

  const enrolledCourseIds = user?.enrollments?.map((e: any) => e.courseId) || [];

  const filteredTasks = mappedTasks.filter(t => {
    if (activeRole === 'student' && !enrolledCourseIds.includes(t.courseId)) {
      return false;
    }
    if (activeTab === 'all') return true;
    return t.status.toLowerCase() === activeTab.toLowerCase();
  });

  const getStatusBadge = (status: string) => {
    if (status === 'Pending') return 'bg-purple-100 dark:bg-purple-955/20 text-[#a855f7] border border-purple-400/20';
    if (status === 'Completed') return 'bg-sky-100 dark:bg-sky-955/20 text-sky-600 dark:text-sky-400 border border-sky-500/20';
    return 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
  };

  if (isTasksLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading tasks...</div>;
  }

  return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
 <ClipboardList className="w-7 h-7 text-[#a855f7]" />
 Assignments & Projects
 </h1>
 <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
 Assign homework sheets, submit digital resources, and review grading reports.
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
          setCurrentPage(1); // Reset page
        }}
      >
        <option value="">All Courses</option>
        {courses.map((course: any) => (
          <option key={course.id} value={course.id}>{course.title}</option>
        ))}
      </select>
    </div>

    {(activeRole === 'admin' || activeRole === 'faculty') && selectedCourseId && (
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-755 dark:text-slate-300">Select Batch:</label>
        <select
          className="bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
          value={selectedBatchId}
          onChange={(e) => { setSelectedBatchId(e.target.value); setCurrentPage(1); }}
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
 onClick={() => setIsAssignOpen(true)}
 className="flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-purple-400 text-slate-950 px-4 py-2 rounded-xl text-[16px] font-semibold transition shadow-lg shadow-purple-500/10 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 Assign Project & Assignments
 </button>
 )}
 </div>

 {/* Tabs */}
<div className="border-b border-slate-200 dark:border-slate-800">
  <div 
    className="flex gap-4 sm:gap-6 text-[16px] font-semibold overflow-x-auto overflow-y-hidden pb-3 scrollbar-hide"
    style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    }}
  >
    {[
      { id: 'all', label: 'All Tasks', path: '' },
      { id: 'pending', label: 'Pending Tasks', path: '?view=daily' },
      { id: 'completed', label: 'Under Review', path: '?view=submitted' },
      { id: 'reviewed', label: 'Graded Tasks', path: '?view=weekly' }
    ].map((tab) => (
      <button
        key={tab.id}
        onClick={() => router.push(`${routeBase}${tab.path}`)}
        className={`flex-shrink-0 pb-3 transition relative cursor-pointer whitespace-nowrap ${
          activeTab === tab.id
            ? 'text-[#a855f7] font-black'
            : 'text-slate-600 hover:text-slate-655 dark:text-slate-300'
        }`}
      >
        {tab.label}
        {activeTab === tab.id && (
          <motion.div
            layoutId="activeTaskTab"
            className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]"
          />
        )}
      </button>
    ))}
  </div>
</div>

  {/* Tasks List Grid */}
  {activeRole === 'student' && rawTasks.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4">
        <ClipboardList className="w-8 h-8 text-[#a855f7]" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white text-base">No Assignments Available</h3>
      <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Enroll in a course to see your assignments and submit your work.</p>
      <button onClick={() => router.push(`/${activeRole}/courses`)} className="mt-5 px-5 py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition">
        Go to My Courses
      </button>
    </div>
  ) : (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {filteredTasks.length > 0 ? (
  filteredTasks.map((task, idx) => (
 <motion.div
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.25, delay: idx * 0.05 }}
 key={task.id}
 className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between"
 >
 <div>
 <div className="flex justify-between items-center">
 <span className={`text-[14px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(task.status)}`}>
 {task.status}
 </span>
 <span className="text-[14px] text-slate-600 dark:text-white  font-semibold flex items-center gap-1">
 <Clock className="w-3.5 h-3.5" /> Due: {task.dueDate}
 </span>
 </div>

 <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-4">{task.title}</h3>
 <span className="text-[14px] text-[#a855f7] font-semibold mt-0.5 block">{task.courseName}</span>
 <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-3.5 ">
 {task.description}
 </p>

 {/* Submission Details if completed or reviewed */}
 {task.studentSubmission && (
 <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[14px] space-y-1">
 <span className="text-[14px] text-slate-600 dark:text-white block font-semibold ">Student Submission note:</span>
 <p className="text-slate-700 dark:text-slate-300 italic">"{task.studentSubmission.comment}"</p>
 </div>
 )}

 {/* Grade and feedback if reviewed */}
 {task.status === 'Reviewed' && (
 <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-[14px] space-y-1.5">
 <span className="text-[14px] text-emerald-500 font-semibold flex items-center gap-1">
 <Award className="w-3.5 h-3.5" /> Evaluated Grade: {task.grade}
 </span>
 {task.feedback && (
 <p className="text-slate-600 dark:text-slate-300 italic">Feedback: "{task.feedback}"</p>
 )}
 </div>
 )}
 </div>

 {/* Action Panels */}
 <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
 <span className="text-[14px] text-slate-600 dark:text-white font-medium">Assigned: {task.assignedDate}</span>
 
 <div className="flex items-center gap-2">
 {activeRole === 'student' && (
 <>
 <button
 onClick={() => triggerViewDetail(task)}
 className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[14px] font-semibold transition cursor-pointer flex items-center gap-1.5"
 >
 <Eye className="w-3 h-3" /> View Details
 </button>
 {task.status === 'Pending' && (
 <button
 onClick={() => triggerSubmitWork(task)}
 className="px-3.5 py-1.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 rounded-xl text-[14px] font-semibold transition cursor-pointer flex items-center gap-1.5"
 >
 <Send className="w-3 h-3" /> Submit Work
 </button>
 )}
 </>
 )}

 {activeRole !== 'student' && (
  <div className="flex gap-2">
    <button
    onClick={() => triggerViewSubmissions(task)}
    className="px-3.5 py-1.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 rounded-xl text-[14px] font-semibold transition cursor-pointer flex items-center gap-1.5"
    >
    <Eye className="w-3 h-3" /> View Submissions
    </button>
    <button
    onClick={() => confirmDelete(task.id)}
    className="p-1.5 rounded-xl bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 transition text-slate-500"
    title="Delete Task"
    >
    <Trash2 className="w-4 h-4" />
    </button>
  </div>
  )}
 </div>
 </div>
 </motion.div>
 ))
 ) : (
 <div className="col-span-full py-16 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-center text-slate-600 dark:text-slate-300 text-[16px]">
 No projects registered under this state tab.
 </div>
 )}
  </div>
  )}

  {/* Pagination Controls */}
  {tasksMeta.totalPages > 1 && (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage <= 1}
        className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
      >
        Previous
      </button>
      {Array.from({ length: tasksMeta.totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`w-8 h-8 text-sm font-semibold rounded-lg transition cursor-pointer ${
            currentPage === page
              ? 'bg-[#a855f7] text-slate-950'
              : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => setCurrentPage(p => Math.min(tasksMeta.totalPages, p + 1))}
        disabled={currentPage >= tasksMeta.totalPages}
        className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
      >
        Next
      </button>
    </div>
  )}

  {/* MODALS INJECT */}
 {/* 1. Assign Task Modal (Admin Tool) */}
 {isAssignOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsAssignOpen(false)} />
 <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content">
 <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Assign New Task</h3>
 <button onClick={() => setIsAssignOpen(false)} className="text-slate-600 hover:text-slate-655 dark:hover:text-white cursor-pointer">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmitAssign(onAssignSubmit)} className="space-y-4 text-[16px] font-semibold">
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Task Tittle</label>
 <input
 type="text"
 {...registerAssign('title', { required: 'Title is required' })}
 placeholder="e.g. Week 1 Task, Minor Project, Major Project"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
   <div>
   <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Cohort</label>
   <select
   {...registerAssign('courseId', { required: true })}
   className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
   >
   <option value="">Select a course</option>
   {courses.map((c: any) => (
   <option key={c.id} value={c.id}>{c.title}</option>
   ))}
   </select>
   </div>

   <div>
   <label className="block text-slate-405 dark:text-slate-300 mb-1">Assign to Batch</label>
   <select
   {...registerAssign('batchId')}
   disabled={!assignCourseId}
   className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
   >
   <option value="">Course-wide (All Batches)</option>
   {assignBatches.map((b: any) => (
   <option key={b.id} value={b.id}>{b.name}</option>
   ))}
   </select>
   </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-1">Due Date</label>
  <input
  type="date"
  {...registerAssign('dueDate', { required: true })}
  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
  />
  </div>
  </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-1">Project Description & Specifications</label>
  <textarea
  rows={3}
  {...registerAssign('description', { required: 'Instructions are required' })}
  placeholder="Provide instructions on what students need to accomplish..."
  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
  />
  </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-1">Upload Project Resources</label>
  <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center bg-slate-50 dark:bg-slate-900 relative hover:border-[#a855f7] transition">
  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleAssignFileChange} />
  <span className="text-slate-500 font-medium">
  {assignFile ? assignFile.name : "Select file to attach (optional)"}
  </span>
  </div>
  {uploadingAssign && (
    <div className="flex items-center gap-2 mt-2 text-xs text-purple-500 font-semibold animate-pulse">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading task resource to AWS S3...
    </div>
  )}
  {assignUrl && (
    <p className="text-xs text-emerald-500 font-semibold mt-1">✓ File uploaded successfully to S3</p>
  )}
  </div>

  <button
  type="submit"
  className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition mt-4"
  >
  Publish Project Task
  </button>
 </form>
 </div>
 </div>
 )}

 {/* 2. Submit Assignment Modal (Student Tool) */}
 {isSubmitOpen && selectedTask && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsSubmitOpen(false)} />
 <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content">
 <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
 <FileText className="w-5 h-5 text-[#a855f7]" /> Upload Assignment Work
 </h3>
 <button onClick={() => setIsSubmitOpen(false)} className="text-slate-600 hover:text-slate-655 dark:hover:text-white cursor-pointer">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="mb-4 text-[16px] font-semibold">
 <span className="text-slate-600">Project:</span>
 <p className="text-slate-850 dark:text-slate-100 text-sm mt-0.5">{selectedTask.title}</p>
 </div>

 <form onSubmit={handleSubmitSubmit(onSubmitWorkSubmit)} className="space-y-4 text-[16px] font-semibold">
 {/* Functional File Dropper UI */}
 <div className="border-2 border-dashed border-slate-250 dark:border-slate-800 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-900 hover:border-[#a855f7] transition relative cursor-pointer">
 <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleSubmitFileChange} />
 <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
 <span className="text-[14px] text-slate-500 block">
 {submitFile ? submitFile.name : "Drag & drop files or click to upload project code"}
 </span>
 <span className="text-[10px] text-slate-600 block mt-1">(Supports ZIP, PDF, or MD up to 25MB)</span>
 </div>
 {uploadingSubmit && (
    <div className="flex items-center gap-2 text-xs text-purple-500 font-semibold animate-pulse justify-center">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading assignment submission to AWS S3...
    </div>
  )}
  {submitUrl && (
    <p className="text-xs text-emerald-500 font-semibold text-center mt-1">✓ File uploaded successfully to S3</p>
  )}

 <div>
 <label className="block text-slate-450 dark:text-slate-300 mb-1">GitHub Repository Link</label>
 <input
 type="url"
 {...registerSubmit('githubUrl')}
 placeholder="https://github.com/username/repo"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div>
 <label className="block text-slate-450 dark:text-slate-300 mb-1">File URL</label>
 <input
 type="url"
 {...registerSubmit('fileUrl')}
 placeholder="Link to file (e.g. Google Drive, Dropbox, etc)"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div>
 <label className="block text-slate-450 dark:text-slate-300 mb-1">Submission Comments</label>
 <textarea
 rows={2}
 {...registerSubmit('comment')}
 placeholder="Project instructions or comments here..."
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <button
 type="submit"
 className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition"
 >
 Send Submission
 </button>
 </form>
 </div>
 </div>
 )}

 {/* 3. Review Submission Modal (Admin Grading Tool) */}
 {isReviewOpen && selectedTask && selectedSubmission && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => { setIsReviewOpen(false); setIsSubmissionsListOpen(true); }} />
 <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content font-semibold text-[16px]">
 <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Review & Grade Project</h3>
 <button onClick={() => { setIsReviewOpen(false); setIsSubmissionsListOpen(true); }} className="text-slate-600 hover:text-slate-655 dark:hover:text-white cursor-pointer">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="mb-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[16px]">
 <p className="text-slate-600 font-semibold">Project: <span className="text-slate-750 dark:text-slate-200 font-semibold">{selectedTask.title}</span></p>
 <p className="text-slate-600 mt-1 font-semibold">Submitted: <span className="text-slate-750 dark:text-slate-200 font-semibold">{selectedSubmission.student?.name}</span></p>
 {selectedSubmission.githubUrl && (
 <p className="text-slate-600 mt-1 font-semibold flex items-center gap-1 flex-wrap">GitHub: <a href={selectedSubmission.githubUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all">{selectedSubmission.githubUrl}</a></p>
 )}
 {selectedSubmission.fileUrl && (
 <p className="text-slate-600 mt-1 font-semibold flex items-center gap-1 flex-wrap">File: <a href={selectedSubmission.fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all">View Attachment File</a></p>
 )}
 <p className="text-slate-600 mt-1.5 italic font-semibold">"{selectedSubmission.comment || 'No comments'}"</p>
 </div>

 <form onSubmit={handleSubmitReview(onReviewSubmit)} className="space-y-4 text-[16px] font-semibold">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Grade Mark</label>
 <select
 defaultValue={selectedSubmission.grade || 'A_PLUS'}
 {...registerReview('grade')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 >
 <option value="O">O (Outstanding)</option>
 <option value="A_PLUS">A+ (Excellent)</option>
 <option value="A">A (Very Good)</option>
 <option value="B_PLUS">B+ (Good)</option>
 <option value="B">B (Decent)</option>
 <option value="C">C (Average)</option>
 <option value="D">D (Pass)</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Feedback Comments</label>
 <textarea
 rows={3}
 defaultValue={selectedSubmission.feedback || ''}
 {...registerReview('feedback')}
 placeholder="Provide recommendations or notes for structural improvement..."
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <button
 type="submit"
 className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl transition"
 >
 Log Grade & Close
 </button>
 </form>
 </div>
 </div>
 )}

 {/* 4. Submissions List Modal - Two Column Layout */}
 {isSubmissionsListOpen && selectedTask && (() => {
   const submissions = selectedTask.submissions || [];
   const enrolledStudents = selectedTask.enrolledStudents || [];
   const submittedStudentIds = new Set(submissions.map((s: any) => s.studentId));
   const notSubmittedStudents = enrolledStudents.filter((student: any) => !submittedStudentIds.has(student.id));

   return (
   <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
     <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsSubmissionsListOpen(false)} />
     <div className="relative w-full max-w-4xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content font-semibold text-[16px]">
       <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
         <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
           <ClipboardList className="w-5 h-5 text-[#a855f7]" /> Submissions: {selectedTask.title}
         </h3>
         <button onClick={() => setIsSubmissionsListOpen(false)} className="text-slate-600 hover:text-slate-655 dark:hover:text-white cursor-pointer">
           <X className="w-5 h-5" />
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Submitted Column */}
         <div className="flex flex-col">
           <div className="flex items-center gap-2 mb-3 px-1">
             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
             <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
               Submitted ({submissions.length})
             </span>
           </div>
           <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
             {submissions.length > 0 ? (
               submissions.map((sub: any) => (
                 <div key={sub.id} className={`p-4 rounded-2xl border flex justify-between items-start ${sub.isLate ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-800/30' : 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-800/30'}`}>
                   <div className="space-y-1 min-w-0 flex-1">
                     <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 block">{sub.student?.name}</span>
                     {sub.submittedAt && (
                       <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                         Submitted: {new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(sub.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                       </p>
                     )}
                     {sub.isLate && (
                       <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 mt-1">
                         ⚠ Late Submission
                       </span>
                     )}
                     {sub.githubUrl && (
                       <p className="text-[12px] text-slate-600 font-semibold flex items-center gap-1 flex-wrap">GitHub: <a href={sub.githubUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all truncate">{sub.githubUrl}</a></p>
                     )}
                     {sub.fileUrl && (
                       <p className="text-[12px] text-slate-600 font-semibold flex items-center gap-1 flex-wrap">File: <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all">View Attachment File</a></p>
                     )}
                     {sub.comment && <p className="text-[12px] text-slate-500 italic mt-1 font-semibold truncate">"{sub.comment}"</p>}
                     {sub.status === 'REVIEWED' && (
                       <div className="mt-2 text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 w-fit">
                         Grade: {sub.grade} &bull; Feedback: "{sub.feedback}"
                       </div>
                     )}
                   </div>

                   <div className="flex flex-col items-end gap-2 font-semibold ml-2 flex-shrink-0">
                     <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${sub.status === 'REVIEWED' ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600' : 'bg-sky-100 dark:bg-sky-955/20 text-sky-600'}`}>
                       {sub.status === 'REVIEWED' ? 'Reviewed' : 'Submitted'}
                     </span>
                     <button
                       onClick={() => triggerGradeSubmission(sub)}
                       className="px-3 py-1 bg-[#a855f7] hover:bg-purple-400 text-slate-950 text-xs font-semibold rounded-lg transition cursor-pointer"
                     >
                       {sub.status === 'REVIEWED' ? 'Edit Grade' : 'Grade'}
                     </button>
                   </div>
                 </div>
               ))
             ) : (
               <p className="text-slate-500 text-[14px] italic text-center py-8">No submissions yet.</p>
             )}
           </div>
         </div>

         {/* Not Submitted Column */}
         <div className="flex flex-col">
           <div className="flex items-center gap-2 mb-3 px-1">
             <AlertCircle className="w-4 h-4 text-red-500" />
             <span className="text-sm font-semibold text-red-600 dark:text-red-400">
               Not Submitted ({notSubmittedStudents.length})
             </span>
           </div>
           <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
             {notSubmittedStudents.length > 0 ? (
               notSubmittedStudents.map((student: any) => (
                 <div key={student.id} className="p-4 bg-red-50/50 dark:bg-red-950/10 rounded-2xl border border-red-200/50 dark:border-red-800/30 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                       {student.name?.charAt(0)?.toUpperCase() || '?'}
                     </div>
                     <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{student.name || 'Unknown Student'}</span>
                   </div>
                   <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                     Pending
                   </span>
                 </div>
               ))
             ) : (
               <p className="text-emerald-500 text-[14px] italic text-center py-8">All students have submitted!</p>
             )}
           </div>
         </div>
       </div>
     </div>
   </div>
   );
 })()}
 {/* 5. Task Detail Modal (Student View) */}
 {isDetailOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => { setIsDetailOpen(false); setDetailTask(null); }} />
 <div className="relative w-full max-w-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content max-h-[85vh] overflow-y-auto">
 <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
 <FileText className="w-5 h-5 text-[#a855f7]" /> Task Details
 </h3>
 <button onClick={() => { setIsDetailOpen(false); setDetailTask(null); }} className="text-slate-600 hover:text-slate-655 dark:hover:text-white cursor-pointer">
 <X className="w-5 h-5" />
 </button>
 </div>

 {loadingDetail ? (
   <div className="flex items-center justify-center py-12">
     <Loader2 className="w-6 h-6 animate-spin text-[#a855f7]" />
     <span className="ml-2 text-slate-500 font-semibold text-sm">Loading task details...</span>
   </div>
 ) : detailTask ? (
   <div className="space-y-4 text-[14px]">
     {/* Title */}
     <div>
       <h4 className="font-bold text-lg text-slate-900 dark:text-white">{detailTask.title}</h4>
       <span className="text-[#a855f7] font-semibold text-sm">{detailTask.course?.title}</span>
     </div>

     {/* Due Date */}
     <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold">
       <Clock className="w-4 h-4" />
       <span>Due: {new Date(detailTask.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
     </div>

     {/* Description */}
     <div>
       <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1 text-xs uppercase tracking-wide">Description & Instructions</label>
       <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
         {detailTask.description}
       </div>
     </div>

     {/* Attached File */}
     {detailTask.attachmentUrl && (
       <div>
         <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1 text-xs uppercase tracking-wide">Attached Resource</label>
         <div className="p-4 bg-purple-50/50 dark:bg-purple-950/10 rounded-xl border border-purple-200/50 dark:border-purple-800/30 flex items-center justify-between gap-3">
           <div className="flex items-center gap-2 min-w-0">
             <FileText className="w-5 h-5 text-[#a855f7] flex-shrink-0" />
             <span className="text-slate-700 dark:text-slate-200 font-semibold text-sm truncate">
               {(() => {
                 try {
                   const url = detailTask.attachmentUrl.split('?')[0];
                   return decodeURIComponent(url.split('/').pop() || 'Attachment');
                 } catch { return 'Attachment'; }
               })()}
             </span>
           </div>
           <div className="flex gap-2 flex-shrink-0">
             {isVideoUrl(detailTask.attachmentUrl) && (
               <button
                 onClick={() => handlePreviewAttachment(detailTask.attachmentUrl, detailTask.title)}
                 className="px-3 py-1.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
               >
                 <Play className="w-3 h-3" /> Play
               </button>
             )}
             {isPdfUrl(detailTask.attachmentUrl) && (
               <button
                 onClick={() => handlePreviewAttachment(detailTask.attachmentUrl, detailTask.title)}
                 className="px-3 py-1.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
               >
                 <Eye className="w-3 h-3" /> Preview
               </button>
             )}
             <a
               href={detailTask.attachmentUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
             >
               <Download className="w-3 h-3" /> Download
             </a>
           </div>
         </div>
       </div>
     )}

     {/* Student's own submission if exists */}
     {detailTask.mySubmission && (
       <div>
         <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1 text-xs uppercase tracking-wide">Your Submission</label>
         <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 space-y-2">
           {detailTask.mySubmission.comment && (
             <p className="text-slate-700 dark:text-slate-300 italic font-medium">"{detailTask.mySubmission.comment}"</p>
           )}
           {detailTask.mySubmission.githubUrl && (
             <p className="text-sm font-semibold text-slate-600">GitHub: <a href={detailTask.mySubmission.githubUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all">{detailTask.mySubmission.githubUrl}</a></p>
           )}
           {detailTask.mySubmission.fileUrl && (
             <p className="text-sm font-semibold text-slate-600 flex items-center gap-1">
               Submitted File: <a href={detailTask.mySubmission.fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View/Download</a>
             </p>
           )}
           {detailTask.mySubmission.grade && (
             <div className="mt-2 text-xs font-semibold px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20 w-fit">
               Grade: {detailTask.mySubmission.grade} {detailTask.mySubmission.feedback && `| Feedback: "${detailTask.mySubmission.feedback}"`}
             </div>
           )}
         </div>
       </div>
     )}

     {/* Submit Work Button */}
     {!detailTask.mySubmission && new Date() <= new Date(detailTask.dueDate) && (
       <button
         onClick={() => { setIsDetailOpen(false); setDetailTask(null); triggerSubmitWork(detailTask); }}
         className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition flex items-center justify-center gap-2"
       >
         <Send className="w-4 h-4" /> Submit Your Work
       </button>
     )}
   </div>
 ) : null}
 </div>
 </div>
 )}

 </div>
 );
};
export default Tasks;
