"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit3, Trash2, Eye, EyeOff, User, GraduationCap, X, AlertTriangle, Camera, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { mutate } from 'swr';

import { Avatar } from '@/components/common/Avatar';

export const Students = () => {
  const { activeRole, user, searchQuery, setSearchQuery } = useLMS();
  const pathname = usePathname(); const searchParams = useSearchParams();
  const router = useRouter();

  // API Data Fetching
  const { data: rawStudents = [], mutate: mutateStudents, isLoading: isStudentsLoading } = useSWR('/users/students', fetcher);
  const { data: coursesData, isLoading: isCoursesLoading } = useSWR('/courses', fetcher);
  const { data: batchesData } = useSWR('/batches?limit=500', fetcher);
  const courses = coursesData || [];
  const batches = Array.isArray(batchesData) ? batchesData : (batchesData?.batches || batchesData?.data?.batches || []);

  const DURATION_LABELS: Record<string, string> = {
    DAYS_30: '30 Days',
    DAYS_45: '45 Days',
    DAYS_90: '90 Days',
    DAYS_180: '180 Days',
  };

  // State to hold student enrollments during add/edit (courseId, batchId, durationDays)
  const [enrollmentsState, setEnrollmentsState] = useState<Array<{ courseId: string; batchId: string | null; durationDays: string }>>([]);

  // Search & Filter State (searchQuery comes from global LMSContext)
  const [statusFilter, setStatusFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showPasswordAdd, setShowPasswordAdd] = useState(false);
  const [showConfirmPasswordAdd, setShowConfirmPasswordAdd] = useState(false);
  const [localAvatarPreviewAdd, setLocalAvatarPreviewAdd] = useState<string | null>(null);
  const [localAvatarPreviewEdit, setLocalAvatarPreviewEdit] = useState<string | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('All');

  // Derive unique categories from courses for the filter
  const courseCategories = Array.from(new Set(courses.map((c: any) => c.category?.name).filter(Boolean))).sort() as string[];

  // Filter courses based on search and category
  const filteredCourses = courses.filter((c: any) => {
    const matchesSearch = !courseSearchQuery || c.title.toLowerCase().includes(courseSearchQuery.toLowerCase());
    const matchesCategory = courseCategoryFilter === 'All' || c.category?.name === courseCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Sync state with URL queries (e.g. ?action=add, ?view=performance, ?view=reports)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const action = params.get('action');
    if (action === 'add') {
      setCourseSearchQuery('');
      setCourseCategoryFilter('All');
      setIsAddOpen(true);
    }
  }, [searchParams.toString()]);

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    setLocalAvatarPreviewAdd(null);
    router.push(pathname); // clear action query
  };

  // Form Hooks
  const { register: registerAdd, handleSubmit: handleSubmitAdd, reset: resetAdd, setValue: setValueAdd, watch: watchAdd, formState: { errors: errorsAdd } } = useForm();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue: setValueEdit, watch: watchEdit, formState: { errors: errorsEdit } } = useForm();

  const avatarPreviewAdd = watchAdd('avatar');
  const avatarPreviewEdit = watchEdit('avatar');

  const handleAvatarUpload = async (e, setFormValue) => {
    const file = e.target.files[0];
    if (file) {
      // Show local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        if (setFormValue === setValueAdd) {
          setLocalAvatarPreviewAdd(reader.result as string);
        } else {
          setLocalAvatarPreviewEdit(reader.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Upload to S3
      const toastId = toast.loading('Uploading photo...');
      try {
        const { uploadFileToS3 } = await import('@/lib/upload');
        const { url } = await uploadFileToS3(file, 'avatars');
        setFormValue('avatar', url);
        toast.success('Photo uploaded successfully', { id: toastId });
      } catch (err: any) {
        toast.error('Failed to upload photo', { id: toastId });
      }
    }
  };

  // Handle Action Submissions
  const onAddSubmit = async (data) => {
    try {
      // 1. Create the student user account
      const userRes = await api.post('/users', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'STUDENT',
        avatar: data.avatar || null
      });
      const newStudent = userRes.data.data;
      const selectedCourses = enrollmentsState.map(e => e.courseId);
      
      // 2. Enroll the student in the selected courses with their batch & duration configurations
      if (enrollmentsState.length > 0) {
        await api.put(`/users/${newStudent.id}`, {
          enrollments: enrollmentsState
        });
      }
      
      toast.success('Student added successfully!');
      mutateStudents();
      mutate('/dashboard/metrics');
      mutate('/courses');
      if (selectedCourses.length > 0) {
        selectedCourses.forEach((cId: string) => mutate(`/courses/${cId}/students`));
      }
      resetAdd();
      setEnrollmentsState([]);
      setLocalAvatarPreviewAdd(null);
      setCurrentPage(1);
      handleCloseAdd();
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const onEditSubmit = async (data) => {
    try {
      const selectedCourses = enrollmentsState.map(e => e.courseId);
      // 1. Update user info and sync enrollments in a single atomic request
      await api.put(`/users/${selectedStudent.id}`, {
        name: data.name,
        email: data.email,
        avatar: data.avatar || selectedStudent.avatar,
        isActive: data.status === 'Active',
        password: data.password || undefined,
        enrollments: enrollmentsState,
      });

      toast.success('Student updated successfully!');
      mutateStudents();
      mutate('/dashboard/metrics');
      mutate('/courses');
      if (selectedCourses.length > 0) {
        selectedCourses.forEach((cId: string) => mutate(`/courses/${cId}/students`));
      }
      setIsEditOpen(false);
      setSelectedStudent(null);
      setEnrollmentsState([]);
      setLocalAvatarPreviewEdit(null);
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const triggerEdit = (student) => {
    setSelectedStudent(student);
    setIsEditOpen(true);
    setLocalAvatarPreviewEdit(null);
    setCourseSearchQuery('');
    setCourseCategoryFilter('All');
    setEnrollmentsState(student.enrollments?.map((e: any) => ({
      courseId: e.courseId,
      batchId: e.batchId || null,
      durationDays: e.durationDays || 'DAYS_90'
    })) || []);
    resetEdit({
      name: student.name,
      email: student.email,
      status: student.status,
    });
  };

  const triggerPreview = (student) => {
    setSelectedStudent(student);
    setIsPreviewOpen(true);
  };

  const triggerDelete = (student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/users/${selectedStudent.id}`);
      toast.success('Student deleted successfully!');
      mutateStudents();
      mutate('/dashboard/metrics');
      mutate('/courses');
      setCurrentPage(1);
      setIsDeleteOpen(false);
      setSelectedStudent(null);
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleToggleActive = async (student: any) => {
    try {
      await api.patch(`/users/${student.id}/toggle-active`);
      toast.success(`${student.name} ${student.isActive ? 'deactivated' : 'activated'} successfully`);
      mutateStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update student status');
    }
  };

  // Map API student object into frontend representation
  const mappedStudents = rawStudents.map((s: any) => {
    const enrollments = s.enrollments || [];
    const enrolledCourseIds = enrollments.map((e: any) => e.courseId);
    const atts = s.attendances || [];
    const filteredAtts = courseFilter === 'All'
      ? atts.filter((a: any) => enrolledCourseIds.includes(a.courseId))
      : atts.filter((a: any) => a.courseId === courseFilter);

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
    let calculatedGrade = 'F';
    if (avgScore >= 90) calculatedGrade = 'O';
    else if (avgScore >= 80) calculatedGrade = 'A+';
    else if (avgScore >= 70) calculatedGrade = 'A';
    else if (avgScore >= 60) calculatedGrade = 'B+';
    else if (avgScore >= 50) calculatedGrade = 'B';
    else if (avgScore >= 40) calculatedGrade = 'C';
    else calculatedGrade = 'F';

    return {
      ...s,
      enrollments,
      courseId: enrollments[0]?.courseId || '',
      courseName: enrollments.map((e: any) => e.course?.title).join(', ') || 'Not Enrolled',
      status: s.isActive ? 'Active' : 'Inactive',
      attendance,
      progress: enrollments.length > 0 ? Math.round(enrollments.reduce((sum: number, e: any) => sum + e.progress, 0) / enrollments.length) : 0,
      quizzesTaken: s.quizAttempts?.length || 0,
      tasksSubmitted: s.taskSubmissions?.length || 0,
      performance: s.weeklyScores?.map((ws: any) => ws.score) || [],
      grade: calculatedGrade,
    };
  });

  const facultyCourseIds = courses.map((c: any) => c.id);

  const filteredStudents = mappedStudents.filter((student: any) => {
    // Faculty can only see students in their courses
    if (activeRole === 'faculty' && !facultyCourseIds.includes(student.courseId)) return false;

    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    const matchesCourse = courseFilter === 'All' || student.courseId === courseFilter;
    return matchesSearch && matchesStatus && matchesCourse;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  if (isStudentsLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading students...</div>;
  }

  return (
 <div className="space-y-6">
 {/* Page Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
 <GraduationCap className="w-7 h-7 text-[#a855f7]" />
 Student Management
 </h1>
 <p className="text-[16px] text-slate-800 dark:text-slate-300 mt-0.5">
 Add new learners, edit enrollment statuses, and review active progress report metrics.
 </p>
 </div>
 {activeRole === 'admin' && (
 <button
 onClick={() => { setCourseSearchQuery(''); setCourseCategoryFilter('All'); setIsAddOpen(true); }}
 className="flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-purple-400 text-slate-950 px-4 py-2 rounded-xl text-[16px] font-semibold transition shadow-lg shadow-purple-500/10 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 Add Student Profile
 </button>
 )}
 </div>

 {/* Control panel (Filters + Search) */}
 <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row gap-4 items-center justify-between">
 {/* Search Input */}
 <div className="w-full md:w-80 relative">
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
 placeholder="Search by name, email..."
 className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] focus:outline-none text-[16px] dark:text-slate-300 transition"
 />
 <Search className="w-4 h-4 text-slate-600 dark:text-slate-300 absolute left-3.5 top-2.5" />
 </div>

 {/* Filter Selection dropdowns */}
 <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
 <div className="flex items-center gap-1.5 flex-1 min-w-0 md:flex-none">
 <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 shrink-0">Course:</span>
 <select
 value={courseFilter}
 onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
 className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[16px] px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#a855f7] w-full sm:w-auto truncate"
 >
 <option value="All">All Courses</option>
 {courses.map((c: any) => (
 <option key={c.id} value={c.id}>{c.title}</option>
 ))}
 </select>
 </div>

 <div className="flex items-center gap-1.5 flex-1 min-w-0 md:flex-none">
 <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 shrink-0">Status:</span>
 <select
 value={statusFilter}
 onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
 className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[16px] px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#a855f7] w-full sm:w-auto truncate"
 >
 <option value="All">All Statuses</option>
 <option value="Active">Active</option>
 <option value="Inactive">Inactive</option>
 <option value="Completed">Completed</option>
 </select>
 </div>
 </div>
 </div>

 {/* Main Table view */}
 <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
 <th className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-300">Photo</th>
 <th className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-300">Name</th>
 <th className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-300">Email</th>
 <th className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-300">Attendance</th>
 <th className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-300">Status</th>
 <th className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-300 ">Actions</th>
 </tr>
 </thead>
 <tbody>
 {paginatedStudents.length > 0 ? (
 paginatedStudents.map((stud) => (
 <tr key={stud.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition duration-150">
 <td className="px-6 py-3.5">
 <Avatar src={stud.avatar} alt={stud.name} className="w-9 h-9 rounded-full object-cover border border-purple-400/50 shadow-sm" />
 </td>
 <td className="px-6 py-3.5 font-semibold text-[16px] text-slate-900 dark:text-white">
 {stud.name}
 </td>
 <td className="px-6 py-3.5 font-semibold text-sm text-slate-800 dark:text-slate-300">
 {stud.email}
 </td>
 <td className="px-6 py-4">
 <div className="flex flex-col">
 <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
 {stud.attendance}%
 </span>
 <span className="text-[14px] text-slate-500 dark:text-slate-300">Overall</span>
 </div>
 </td>
 <td className="px-6 py-3.5">
 <span className={`inline-flex px-2 py-1 rounded-full text-[14px] font-semibold ${stud.status === 'Active'
 ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
 : stud.status === 'Completed'
 ? 'bg-sky-100 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400'
 : 'bg-slate-105 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
 }`}>
 {stud.status}
 </span>
 </td>
 <td className="px-2 py-3.5 ">
<div className="flex items-center gap-2">
  <button
    onClick={() => router.push(`${pathname}/${stud.id}`)}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-purple-400 hover:text-slate-900 dark:bg-slate-700 dark:hover:bg-purple-400 text-slate-800 dark:text-slate-300 dark:hover:text-slate-900 transition"
    title="Preview Student"
  >
    <Eye className="w-4 h-4" />

    {activeRole !== "admin" && (
      <span className="text-xs font-medium">Preview</span>
    )}
  </button>

  {activeRole === "admin" && (
    <>
      <button
        onClick={() => triggerEdit(stud)}
        className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-400 hover:text-slate-900 dark:bg-slate-900 dark:hover:bg-purple-400 text-slate-800 dark:text-slate-300 dark:hover:text-slate-900 transition"
        title="Edit Student"
      >
        <Edit3 className="w-4 h-4" />
      </button>

      <button
        onClick={() => handleToggleActive(stud)}
        className={`p-1.5 rounded-lg transition ${stud.isActive ? 'bg-purple-50 hover:bg-purple-400 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400' : 'bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'}`}
        title={stud.isActive ? 'Deactivate Student' : 'Activate Student'}
      >
        {stud.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      </button>

      <button
        onClick={() => triggerDelete(stud)}
        className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 dark:hover:bg-red-650 text-slate-800 dark:text-slate-300 transition"
        title="Delete Student"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  )}
</div>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={7} className="px-6 py-12 text-center text-slate-600 dark:text-slate-300 text-[16px]">
 No student records found matching the filters.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination Panel */}
 {totalPages > 1 && (
 <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
 Page {currentPage} of {totalPages}
 </span>
 <div className="flex gap-2">
 <button
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
 className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-[14px] rounded-lg transition"
 >
 Previous
 </button>
 <button
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
 className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-[14px] rounded-lg transition"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>

 {/* MODALS INJECT - CUSTOM PORTALS WITH INLINE ANIMATION FALLBACKS */}
 {/* 1. Add Student Modal */}
 {isAddOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={handleCloseAdd} />
 <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 modal-content flex flex-col overflow-hidden">
 <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Add New Student Profile</h3>
 <button onClick={handleCloseAdd} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmitAdd(onAddSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-[16px] font-semibold scrollbar-hide">
 <div className="flex flex-col items-center mb-4 ">
 <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition overflow-hidden group">
  {localAvatarPreviewAdd || avatarPreviewAdd ? (
  <Avatar src={localAvatarPreviewAdd || avatarPreviewAdd} alt="Preview" className="w-full h-full object-cover" />
 ) : (
 <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
 <Camera className="w-6 h-6 mb-1" />
 <span className="text-[10px] font-semibold uppercase tracking-wider">Upload</span>
 </div>
 )}
 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
 <Camera className="w-6 h-6 text-white" />
 </div>
 <input
 type="file"
 accept="image/*"
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
 onChange={(e) => handleAvatarUpload(e, setValueAdd)}
 />
 </div>
 <p className="text-xs text-slate-400 mt-2 font-medium">Click or drag to upload photo</p>
 </div>
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Full Name</label>
 <input
 type="text"
 {...registerAdd('name', { required: 'Name is required' })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 placeholder="e.g. Rahul Sen"
 />
 {errorsAdd.name && <p className="text-red-500 text-sm mt-0.5">{errorsAdd.name.message as string}</p>}
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Email Address</label>
 <input
 type="email"
 {...registerAdd('email', { required: 'Email is required' })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 placeholder="e.g. rahul@lms.com"
 />
 {errorsAdd.email && <p className="text-red-500 text-sm mt-0.5">{errorsAdd.email.message as string}</p>}
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-2">Assign Course(s)</label>
 <div className="flex gap-2 mb-2">
   <div className="relative flex-1">
     <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
     <input
       type="text"
       placeholder="Search courses..."
       value={courseSearchQuery}
       onChange={(e) => setCourseSearchQuery(e.target.value)}
       className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
     />
   </div>
   <select
     value={courseCategoryFilter}
     onChange={(e) => setCourseCategoryFilter(e.target.value)}
     className="px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
   >
     <option value="All">All Categories</option>
     {courseCategories.map((cat) => (
       <option key={cat} value={cat}>{cat}</option>
     ))}
   </select>
 </div>
 <div className="space-y-2 max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/40 dark:border-slate-800 rounded-xl scrollbar-thin">
 {filteredCourses.length === 0 && (
   <p className="text-xs text-slate-400 text-center py-2">No courses found</p>
 )}
 {filteredCourses.map((c: any) => {
   const isChecked = enrollmentsState.some(item => item.courseId === c.id);
   return (
     <label key={c.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-355 text-sm font-semibold">
     <input
     type="checkbox"
     value={c.id}
     checked={isChecked}
     onChange={(e) => {
       if (e.target.checked) {
         setEnrollmentsState(prev => [...prev, { courseId: c.id, batchId: null, durationDays: 'DAYS_90' }]);
       } else {
         setEnrollmentsState(prev => prev.filter(item => item.courseId !== c.id));
       }
     }}
     className="rounded border-slate-300 dark:border-slate-800 text-[#a855f7] focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900"
     />
     <span>{c.title}</span>
     </label>
   );
 })}
 </div>
 </div>

 {enrollmentsState.length > 0 && (
   <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
     <label className="block text-xs font-bold uppercase tracking-wider text-[#a855f7]">Course Scoping & Batch Configurations</label>
     <div className="space-y-3">
       {enrollmentsState.map((item) => {
         const course = courses.find(c => c.id === item.courseId);
         const courseBatches = batches.filter((b: any) => b.courseId === item.courseId && b.isActive);
         return (
           <div key={item.courseId} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
             <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">{course?.title || 'Unknown Course'}</span>
             <div className="grid grid-cols-2 gap-2 text-xs">
               <div>
                 <label className="block text-[10px] text-slate-400 font-bold mb-1">Duration</label>
                 <select
                   value={item.durationDays}
                   disabled={!!item.batchId}
                   onChange={(e) => {
                     const val = e.target.value;
                     setEnrollmentsState(prev => prev.map(p => p.courseId === item.courseId ? { ...p, durationDays: val } : p));
                   }}
                   className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none disabled:opacity-65 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                 >
                   <option value="DAYS_30">30 Days</option>
                   <option value="DAYS_45">45 Days</option>
                   <option value="DAYS_90">90 Days</option>
                   <option value="DAYS_180">180 Days</option>
                 </select>
               </div>
               <div>
                 <label className="block text-[10px] text-slate-400 font-bold mb-1">Batch Assignment</label>
                 <select
                   value={item.batchId || ''}
                   onChange={(e) => {
                     const val = e.target.value;
                     const selectedBatch = courseBatches.find((b: any) => b.id === val);
                     setEnrollmentsState(prev => prev.map(p => {
                       if (p.courseId === item.courseId) {
                         return {
                           ...p,
                           batchId: val || null,
                           durationDays: selectedBatch ? selectedBatch.durationDays : p.durationDays
                         };
                       }
                       return p;
                     }));
                   }}
                   className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                 >
                   <option value="">No Batch Assigned</option>
                   {courseBatches.map((b: any) => (
                     <option key={b.id} value={b.id}>{b.name}</option>
                   ))}
                 </select>
               </div>
             </div>
           </div>
         );
       })}
     </div>
   </div>
 )}

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Initial Status</label>
 <select
 {...registerAdd('status')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 >
 <option value="Active">Active</option>
 <option value="Inactive">Inactive</option>
 </select>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Password</label>
 <div className="relative">
 <input
 type={showPasswordAdd ? "text" : "password"}
 {...registerAdd('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7] pr-10"
 placeholder="Min 6 characters"
 />
 <button
 type="button"
 onClick={() => setShowPasswordAdd(!showPasswordAdd)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
 >
 {showPasswordAdd ? <EyeOff size={18} /> : <Eye size={18} />}
 </button>
 </div>
 {errorsAdd.password && <p className="text-red-500 text-sm mt-0.5">{errorsAdd.password.message as string}</p>}
 </div>
 
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Confirm Password</label>
 <div className="relative">
 <input
 type={showConfirmPasswordAdd ? "text" : "password"}
 {...registerAdd('confirmPassword', { 
 required: 'Confirm Password is required',
 validate: (val) => watchAdd('password') === val || 'Passwords do not match'
 })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7] pr-10"
 placeholder="Re-enter password"
 />
 <button
 type="button"
 onClick={() => setShowConfirmPasswordAdd(!showConfirmPasswordAdd)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
 >
 {showConfirmPasswordAdd ? <EyeOff size={18} /> : <Eye size={18} />}
 </button>
 </div>
 {errorsAdd.confirmPassword && <p className="text-red-500 text-sm mt-0.5">{errorsAdd.confirmPassword.message as string}</p>}
 </div>
 </div>

 <button
 type="submit"
 className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition mt-4"
 >
 Enroll Student
 </button>
 </form>
 </div>
 </div>
 )}

 {/* 2. Edit Student Modal */}
 {isEditOpen && selectedStudent && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
 <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content max-h-[90vh] overflow-y-auto scrollbar-thin">
 <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Edit Student Details</h3>
 <button onClick={() => setIsEditOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4 text-[16px] font-semibold">
 <div className="flex flex-col items-center mb-4">
 <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition overflow-hidden group">
 {(localAvatarPreviewEdit || avatarPreviewEdit || selectedStudent?.avatar) ? (
 <Avatar src={localAvatarPreviewEdit || avatarPreviewEdit || selectedStudent?.avatar} className="w-full h-full object-cover" />
 ) : (
 <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
 <Camera className="w-6 h-6 mb-1" />
 <span className="text-[10px] font-semibold uppercase tracking-wider">Upload</span>
 </div>
 )}
 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
 <Camera className="w-6 h-6 text-white" />
 </div>
 <input
 type="file"
 accept="image/*"
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
 onChange={(e) => handleAvatarUpload(e, setValueEdit)}
 />
 </div>
 <p className="text-xs text-slate-400 mt-2 font-medium">Click or drag to update photo</p>
 </div>
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Full Name</label>
 <input
 type="text"
 defaultValue={selectedStudent.name}
 {...registerEdit('name', { required: 'Name is required' })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 />
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Email Address</label>
 <input
 type="email"
 defaultValue={selectedStudent.email}
 {...registerEdit('email', { required: 'Email is required' })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-2">Assign Course(s)</label>
  <div className="flex gap-2 mb-2">
    <div className="relative flex-1">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Search courses..."
        value={courseSearchQuery}
        onChange={(e) => setCourseSearchQuery(e.target.value)}
        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
      />
    </div>
    <select
      value={courseCategoryFilter}
      onChange={(e) => setCourseCategoryFilter(e.target.value)}
      className="px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
    >
      <option value="All">All Categories</option>
      {courseCategories.map((cat) => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
  </div>
  <div className="space-y-2 max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/40 dark:border-slate-800 rounded-xl scrollbar-thin">
  {filteredCourses.length === 0 && (
    <p className="text-xs text-slate-400 text-center py-2">No courses found</p>
  )}
  {filteredCourses.map((c: any) => {
    const isChecked = enrollmentsState.some(item => item.courseId === c.id);
    return (
      <label key={c.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-355 text-sm font-semibold">
      <input
      type="checkbox"
      value={c.id}
      checked={isChecked}
      onChange={(e) => {
        if (e.target.checked) {
          setEnrollmentsState(prev => [...prev, { courseId: c.id, batchId: null, durationDays: 'DAYS_90' }]);
        } else {
          setEnrollmentsState(prev => prev.filter(item => item.courseId !== c.id));
        }
      }}
      className="rounded border-slate-300 dark:border-slate-800 text-[#a855f7] focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900"
      />
      <span>{c.title}</span>
      </label>
    );
  })}
  </div>
  </div>

  {enrollmentsState.length > 0 && (
    <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
      <label className="block text-xs font-bold uppercase tracking-wider text-[#a855f7]">Course Scoping & Batch Configurations</label>
      <div className="space-y-3">
        {enrollmentsState.map((item) => {
          const course = courses.find(c => c.id === item.courseId);
          const courseBatches = batches.filter((b: any) => b.courseId === item.courseId && b.isActive);
          return (
            <div key={item.courseId} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">{course?.title || 'Unknown Course'}</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Duration</label>
                  <select
                    value={item.durationDays}
                    disabled={!!item.batchId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEnrollmentsState(prev => prev.map(p => p.courseId === item.courseId ? { ...p, durationDays: val } : p));
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none disabled:opacity-65 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  >
                    <option value="DAYS_30">30 Days</option>
                    <option value="DAYS_45">45 Days</option>
                    <option value="DAYS_90">90 Days</option>
                    <option value="DAYS_180">180 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Batch Assignment</label>
                  <select
                    value={item.batchId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selectedBatch = courseBatches.find((b: any) => b.id === val);
                      setEnrollmentsState(prev => prev.map(p => {
                        if (p.courseId === item.courseId) {
                          return {
                            ...p,
                            batchId: val || null,
                            durationDays: selectedBatch ? selectedBatch.durationDays : p.durationDays
                          };
                        }
                        return p;
                      }));
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  >
                    <option value="">No Batch Assigned</option>
                    {courseBatches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Enroll Status</label>
 <select
 defaultValue={selectedStudent.status}
 {...registerEdit('status')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 >
 <option value="Active">Active</option>
 <option value="Inactive">Inactive</option>
 <option value="Completed">Completed</option>
 </select>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">New Password (leave blank to keep current)</label>
 <input
 type="password"
 {...registerEdit('password', { minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 placeholder="Min 6 characters"
 />
 {errorsEdit.password && <p className="text-red-500 text-sm mt-0.5">{errorsEdit.password.message as string}</p>}
 </div>

 <button
 type="submit"
 className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition mt-4"
 >
 Save Changes
 </button>
 </form>
 </div>
 </div>
 )}

 {/* 4. Delete Confirm Modal */}
 {isDeleteOpen && selectedStudent && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
 <div className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content text-center">
 <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
 <AlertTriangle className="w-6 h-6" />
 </div>
 <h3 className="font-semibold text-slate-900 dark:text-white text-md">Delete Student Record?</h3>
 <p className="text-[16px] text-slate-800 dark:text-slate-300 mt-2 ">
 Are you sure you want to delete the profile of <span className="font-semibold text-slate-900 dark:text-white">{selectedStudent.name}</span>? This action is permanent.
 </p>

 <div className="grid grid-cols-2 gap-3 mt-6">
 <button
 onClick={() => setIsDeleteOpen(false)}
 className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-[16px] transition"
 >
 Cancel
 </button>
 <button
 onClick={confirmDelete}
 className="py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-[16px] transition"
 >
 Delete Profile
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
export default Students;
