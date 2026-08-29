"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Plus, Mail, BookOpen, Briefcase, X, Camera, Trash2, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { mutate } from 'swr';

import { Avatar } from '@/components/common/Avatar';

export const Faculty = () => {
  const { activeRole, user } = useLMS();
  const pathname = usePathname(); const searchParams = useSearchParams();
  const router = useRouter();
  const routeBase = activeRole === 'faculty' ? '/teacher/faculty' : `/${activeRole}/faculty`;

  // API Data Fetching
  const { data: rawTeachers = [], mutate: mutateTeachers, isLoading: isTeachersLoading } = useSWR('/users/teachers', fetcher);
  const { data: coursesData, isLoading: isCoursesLoading } = useSWR('/courses', fetcher);
  const courses = coursesData || [];

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFacultyForDelete, setSelectedFacultyForDelete] = useState<any>(null);

  // Sync state with URL queries (e.g. ?action=assign)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const action = params.get('action');
    if (action === 'assign') setIsAssignOpen(true);
  }, [searchParams.toString()]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue: setValueEdit, watch: watchEdit, formState: { errors: errorsEdit } } = useForm();

  const avatarPreview = watch('avatar');
  const editAvatarPreview = watchEdit('avatar');

  const handleAvatarUpload = async (e, setFormValue) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormValue('avatar', reader.result);
      };
      reader.readAsDataURL(file);

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

  const onSubmit = async (data) => {
    try {
      // 1. Create the teacher user account
      const userRes = await api.post('/users', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'TEACHER',
        avatar: data.avatar || null
      });
      const newTeacher = userRes.data.data;

      // 2. Assign to selected courses
      const assignedCoursesList = Array.isArray(data.courses) ? data.courses : [data.courses];
      const validCourses = assignedCoursesList.filter(Boolean);
      
      for (const courseTitle of validCourses) {
        const matchingCourse = courses.find((c: any) => c.title === courseTitle);
        if (matchingCourse) {
          await api.post(`/courses/${matchingCourse.id}/teachers`, {
            teacherIds: [newTeacher.id]
          });
        }
      }

      toast.success('Faculty onboarded and assigned successfully!');
      mutateTeachers();
      mutate('/dashboard/metrics');
      mutate('/courses');
      reset();
      setIsAssignOpen(false);
      router.push(routeBase);
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const triggerEdit = (prof) => {
    setSelectedFaculty(prof);
    setIsEditOpen(true);
    resetEdit({
      name: prof.name,
      email: prof.email,
      department: prof.department || 'Engineering',
      avatar: prof.avatar || '',
      courses: prof.courses || []
    });
  };

  const triggerDelete = (prof) => {
    setSelectedFacultyForDelete(prof);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedFacultyForDelete) return;
    try {
      await api.delete(`/users/${selectedFacultyForDelete.id}`);
      toast.success('Faculty profile deleted successfully!');
      mutateTeachers();
      mutate('/dashboard/metrics');
      mutate('/courses');
      setIsDeleteOpen(false);
      setSelectedFacultyForDelete(null);
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleToggleActive = async (prof: any) => {
    try {
      await api.patch(`/users/${prof.id}/toggle-active`);
      toast.success(`${prof.name} ${prof.isActive ? 'deactivated' : 'activated'} successfully`);
      mutateTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update faculty status');
    }
  };

  const onEditSubmit = async (data) => {
    if (!selectedFaculty) return;
    try {
      // 1. Update user info
      await api.put(`/users/${selectedFaculty.id}`, {
        name: data.name,
        email: data.email,
        avatar: data.avatar || selectedFaculty.avatar,
        isActive: data.status === 'Active',
        password: data.password || undefined
      });

      // 2. Diff and update course assignments
      const newCourseTitles = Array.isArray(data.courses) ? data.courses.filter(Boolean) : [data.courses].filter(Boolean);
      const oldCourseTitles = selectedFaculty.courses || [];

      // Find courses to assign
      for (const title of newCourseTitles) {
        if (!oldCourseTitles.includes(title)) {
          const course = courses.find((c: any) => c.title === title);
          if (course) {
            await api.post(`/courses/${course.id}/teachers`, { teacherIds: [selectedFaculty.id] });
          }
        }
      }

      // Find courses to remove
      for (const title of oldCourseTitles) {
        if (!newCourseTitles.includes(title)) {
          const course = courses.find((c: any) => c.title === title);
          if (course) {
            await api.delete(`/courses/${course.id}/teachers/${selectedFaculty.id}`);
          }
        }
      }

      toast.success('Faculty profile updated successfully!');
      mutateTeachers();
      mutate('/dashboard/metrics');
      mutate('/courses');
      setIsEditOpen(false);
      setSelectedFaculty(null);
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  // Map raw API teachers to frontend model
  const mappedFaculty = rawTeachers.map((t: any) => ({
    ...t,
    department: 'Engineering', // Fallback department
    courses: t.taughtCourses?.map((tc: any) => tc.course?.title) || []
  }));

  if (isTeachersLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading faculty...</div>;
  }

  return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
 <GraduationCap className="w-7 h-7 text-[#a855f7]" />
 Faculty Management
 </h1>
 <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
 View instructor profiles, check departmental affiliations, and assign course lecturers.
 </p>
 </div>
 {activeRole === 'admin' && (
 <button
 onClick={() => setIsAssignOpen(true)}
 className="flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-purple-400 text-slate-950 px-4 py-2 rounded-xl text-[16px] font-semibold transition shadow-lg shadow-purple-500/10 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 Onboard Faculty
 </button>
 )}
 </div>

 {/* Grid List */}
 {/* Grid List */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  gap-6">
  {mappedFaculty.map((prof, idx) => (
    <motion.div
      key={prof.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: idx * 0.05 }}
      className="
        p-5
        bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-800
        rounded-3xl
        shadow-sm hover:shadow-xl
        hover:border-slate-300 dark:hover:border-slate-700
        transition-all duration-300
        flex flex-col justify-between
      "
    >
      <div className="flex items-center justify-between mb-3"></div>
      {/* Faculty Info */}
      <div
        onClick={() => router.push(`${routeBase}/${prof.id}`)}
        className="flex items-start gap-4 cursor-pointer group"
      >
        <Avatar
          src={prof.avatar}
          alt={prof.name}
          className="
            w-16 h-16
            rounded-full
            object-cover
            border-2 border-slate-200
            dark:border-slate-700
            shadow-sm
            group-hover:scale-105
            transition-transform
            flex-shrink-0
          "
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
            {prof.name}
          </h3>

          <div
            className="
              inline-flex items-center gap-1.5
              mt-1.5
              px-2.5 py-1
              rounded-full
              bg-sky-50
              dark:bg-sky-500/10
              text-sky-700
              dark:text-sky-400
              text-xs
              font-semibold
            "
          >
            <Briefcase className="w-3 h-3" />
            {prof.department}
          </div>

          <div
            className="
              flex items-center gap-2
              mt-2
              text-sm
              text-slate-500
              dark:text-slate-400
            "
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{prof.email}</span>
          </div>
        </div>
      </div>

      {/* Courses */}
      <div className="w-full mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Lecturing Tracks
          </span>

          <span
            className="
              px-2 py-1
              rounded-full
              bg-slate-100
              dark:bg-slate-800
              text-xs
              font-bold
              text-slate-600
              dark:text-slate-400
            "
          >
            {prof.courses?.length || 0}
          </span>
        </div>

        <div className="space-y-2">
          {prof.courses?.map((c, i) => (
            <div
              key={i}
              className="
                flex items-center gap-2
                p-2.5
                rounded-xl
                bg-slate-50
                dark:bg-slate-800/40
              "
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />

              <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">
                {c}
              </span>
            </div>
          ))}

          {!prof.courses?.length && (
            <span className="text-sm italic text-slate-400">
              No courses assigned.
            </span>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      {activeRole === "admin" && (
        <div className="w-full mt-5 flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => triggerEdit(prof)}
            className="
              flex-1
              px-4 py-2.5
              rounded-xl
              dark:bg-slate-700
              dark:text-slate-300
              bg-slate-200
              text-slate-600
              text-sm
              font-semibold
              transition
              flex items-center justify-center gap-2
            "
          >
            <Briefcase className="w-4 h-4" />
            Edit Assignments
          </button>

          <button
            onClick={() => handleToggleActive(prof)}
            title={prof.isActive ? 'Deactivate Faculty' : 'Activate Faculty'}
            className={`px-3 rounded-xl border transition ${prof.isActive ? 'border-purple-300 text-purple-500 hover:bg-purple-400 hover:text-white dark:border-purple-700 dark:text-purple-400' : 'border-emerald-300 text-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-emerald-700 dark:text-emerald-400'}`}
          >
            {prof.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>

          <button
            onClick={() => triggerDelete(prof)}
            title="Delete Faculty"
            className="
              px-3
              rounded-xl
              border border-red-200
              text-red-500
              hover:bg-red-500
              hover:text-white
              transition
            "
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  ))}
</div>

 {/* MODAL */}
 {isAssignOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsAssignOpen(false)} />
 <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content">
 <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Onboard & Assign Faculty</h3>
 <button onClick={() => setIsAssignOpen(false)} className="text-slate-600 hover:text-slate-655 dark:hover:text-white cursor-pointer">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-[16px] font-semibold">
 <div className="flex flex-col items-center mb-4">
 <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition overflow-hidden group">
 {avatarPreview ? (
 <Avatar src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
 ) : (
 <div className="flex flex-col items-center justify-center text-slate-800 dark:text-slate-500">
 <Camera className="w-6 h-6 mb-1" />
 <span className="text-[12px] font-semibold uppercase tracking-wider">Upload</span>
 </div>
 )}
 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
 <Camera className="w-6 h-6 text-white" />
 </div>
 <input
 type="file"
 accept="image/*"
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
 onChange={(e) => handleAvatarUpload(e, setValue)}
 />
 </div>
 <p className="text-sm text-slate-800 mt-2 font-medium">Click or drag to upload photo</p>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Professor Name</label>
 <input
 type="text"
 {...register('name', { required: 'Name is required' })}
 placeholder="e.g. Dr. Richard Feynman"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Email Address</label>
 <input
 type="email"
 {...register('email', { required: 'Email is required' })}
 placeholder="e.g. feynman@lms.com"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Department</label>
 <select
 {...register('department')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 >
 <option value="Frontend Development">Frontend Development</option>
 <option value="Backend Development">Backend Development</option>
 <option value="Artificial Intelligence">Artificial Intelligence</option>
 <option value="Database Systems">Database Systems</option>
 </select>
 </div>

 {/* Course assignments checkboxes */}
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-2">Assign Lectures</label>
 <div className="space-y-2 max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/40 dark:border-slate-800 rounded-xl scrollbar-thin">
 {courses.map(c => (
 <label key={c.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-350">
 <input
 type="checkbox"
 value={c.title}
 {...register('courses')}
 className="rounded border-slate-300 dark:border-slate-800 text-[#a855f7] focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900"
 />
 <span>{c.title}</span>
 </label>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Password</label>
 <input
 type="password"
 {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
 placeholder="Min 6 characters"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 {errors.password && <p className="text-red-500 text-sm mt-0.5">{errors.password.message as string}</p>}
 </div>

 <button
 type="submit"
 className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition mt-4"
 >
 Onboard Faculty Resource
 </button>
 </form>
 </div>
 </div>
 )}

 {isEditOpen && selectedFaculty && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
 <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content">
 <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Edit Faculty Profile</h3>
 <button onClick={() => setIsEditOpen(false)} className="text-slate-600 hover:text-slate-655 dark:hover:text-white cursor-pointer">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4 text-[16px] font-semibold">
 <div className="flex flex-col items-center mb-4">
 <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition overflow-hidden group">
 {editAvatarPreview ? (
 <Avatar src={editAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
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
 <p className="text-sm text-slate-800 mt-2 font-medium">Click or drag to update photo</p>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Professor Name</label>
 <input
 type="text"
 {...registerEdit('name', { required: 'Name is required' })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Email Address</label>
 <input
 type="email"
 {...registerEdit('email', { required: 'Email is required' })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Department</label>
 <select
 {...registerEdit('department')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 >
 <option value="Frontend Development">Frontend Development</option>
 <option value="Backend Development">Backend Development</option>
 <option value="Artificial Intelligence">Artificial Intelligence</option>
 <option value="Database Systems">Database Systems</option>
 </select>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-2">Assign Lectures</label>
 <div className="space-y-2 max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/40 dark:border-slate-800 rounded-xl scrollbar-thin">
 {courses.map(c => (
 <label key={c.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-350">
 <input
 type="checkbox"
 value={c.title}
 {...registerEdit('courses')}
 className="rounded border-slate-300 dark:border-slate-800 text-[#a855f7] focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900"
 />
 <span>{c.title}</span>
 </label>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Status</label>
 <select
 defaultValue={selectedFaculty.isActive ? 'Active' : 'Inactive'}
 {...registerEdit('status')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 >
 <option value="Active">Active</option>
 <option value="Inactive">Inactive</option>
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

 {/* DELETE CONFIRMATION MODAL */}
 {isDeleteOpen && selectedFacultyForDelete && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
 <div className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content text-center animate-float-in">
 <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
 <AlertTriangle className="w-6 h-6" />
 </div>
 <h3 className="font-semibold text-slate-900 dark:text-white text-md">Delete Faculty Profile?</h3>
 <p className="text-[16px] text-slate-800 dark:text-slate-350 mt-2 ">
 Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{selectedFacultyForDelete.name}</span>? This action cannot be undone.
 </p>

 <div className="grid grid-cols-2 gap-3 mt-6">
 <button
 onClick={() => setIsDeleteOpen(false)}
 className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-[16px] transition cursor-pointer"
 >
 Cancel
 </button>
 <button
 onClick={confirmDelete}
 className="py-2.5 bg-red-500 hover:bg-red-650 text-white rounded-xl font-semibold text-[16px] transition cursor-pointer"
 >
 Delete Faculty
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
export default Faculty;
