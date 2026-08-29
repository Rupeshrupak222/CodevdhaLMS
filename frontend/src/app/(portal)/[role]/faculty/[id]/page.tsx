"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { useForm } from 'react-hook-form';
import { fetcher, api } from '@/lib/api';
import { Avatar } from '@/components/common/Avatar';
import { ArrowLeft, BookOpen, Mail, Briefcase, Trash2, Calendar, Edit, X, Camera, ToggleLeft, ToggleRight } from 'lucide-react';
import { useLMS } from '@/context/LMSContext';
import { toast } from 'react-hot-toast';

export default function FacultyDetailPage() {
  const router = useRouter();
  const { id, role } = useParams();
  const { activeRole } = useLMS();

  // Fetch teacher details
  const { data: teacher, error, isLoading, mutate: mutateTeacher } = useSWR(id ? `/users/${id}` : null, fetcher);
  // Fetch all courses to handle stats and edit assignments
  const { data: allCourses = [], isLoading: isCoursesLoading } = useSWR('/courses', fetcher);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue: setValueEdit, watch: watchEdit, formState: { errors: errorsEdit } } = useForm();
  const editAvatarPreview = watchEdit('avatar');

  if (isLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading faculty profile...</div>;
  }

  if (error || !teacher) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        Error loading faculty profile details.
      </div>
    );
  }

  // Pre-calculate stats
  const taughtCourseIds = (teacher.taughtCourses || []).map((tc: any) => tc.courseId);
  const coursesTaught = allCourses.filter((c: any) => taughtCourseIds.includes(c.id));

  // Total students enrolled in all courses taught by this teacher
  const totalStudents = coursesTaught.reduce((sum: number, c: any) => sum + (c._count?.enrollments || 0), 0);
  const totalLessons = coursesTaught.reduce((sum: number, c: any) => sum + (c._count?.lessons || 0), 0);

  // Mapped department (fallback)
  const departmentName = teacher.department || 'Engineering';

  const triggerEdit = () => {
    resetEdit({
      name: teacher.name,
      email: teacher.email,
      department: departmentName,
      avatar: teacher.avatar || '',
      courses: coursesTaught.map((c: any) => c.title),
      status: teacher.isActive ? 'Active' : 'Inactive'
    });
    setIsEditOpen(true);
  };

  const handleAvatarUpload = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValueEdit('avatar', reader.result);
      };
      reader.readAsDataURL(file);

      const toastId = toast.loading('Uploading photo...');
      try {
        const { uploadFileToS3 } = await import('@/lib/upload');
        const { url } = await uploadFileToS3(file, 'avatars');
        setValueEdit('avatar', url);
        toast.success('Photo uploaded successfully', { id: toastId });
      } catch (err: any) {
        toast.error('Failed to upload photo', { id: toastId });
      }
    }
  };

  const onEditSubmit = async (data: any) => {
    try {
      // 1. Update user info
      await api.put(`/users/${id}`, {
        name: data.name,
        email: data.email,
        avatar: data.avatar || teacher.avatar,
        isActive: data.status === 'Active',
        password: data.password || undefined
      });

      // 2. Diff and update course assignments
      const newCourseTitles = Array.isArray(data.courses) ? data.courses.filter(Boolean) : [data.courses].filter(Boolean);
      const oldCourseTitles = coursesTaught.map((c: any) => c.title);

      // Find courses to assign
      for (const title of newCourseTitles) {
        if (!oldCourseTitles.includes(title)) {
          const course = allCourses.find((c: any) => c.title === title);
          if (course) {
            await api.post(`/courses/${course.id}/teachers`, { teacherIds: [id] });
          }
        }
      }

      // Find courses to remove
      for (const title of oldCourseTitles) {
        if (!newCourseTitles.includes(title)) {
          const course = allCourses.find((c: any) => c.title === title);
          if (course) {
            await api.delete(`/courses/${course.id}/teachers/${id}`);
          }
        }
      }

      toast.success('Faculty profile updated successfully!');
      mutateTeacher();
      mutate('/users/teachers');
      mutate('/dashboard/metrics');
      mutate('/courses');
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleToggleActive = async () => {
    try {
      await api.patch(`/users/${id}/toggle-active`);
      toast.success(`${teacher.name} ${teacher.isActive ? 'deactivated' : 'activated'} successfully`);
      mutateTeacher();
      mutate('/users/teachers');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update faculty status');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('Faculty profile deleted successfully!');
      mutate('/users/teachers');
      mutate('/dashboard/metrics');
      mutate('/courses');
      router.push(`/${role}/faculty`);
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => router.push(`/${role}/faculty`)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Faculty
        </button>

        {activeRole === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={triggerEdit}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 rounded-xl font-semibold text-sm transition cursor-pointer"
            >
              <Edit className="w-4 h-4" /> Edit Profile
            </button>
            <button
              onClick={handleToggleActive}
              title={teacher.isActive ? 'Deactivate Faculty' : 'Activate Faculty'}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-semibold text-sm transition cursor-pointer ${
                teacher.isActive
                  ? 'border-yellow-300 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-750 dark:text-yellow-400 dark:hover:bg-yellow-950/20'
                  : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-750 dark:text-emerald-400 dark:hover:bg-emerald-950/20'
              }`}
            >
              {teacher.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {teacher.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-655 text-white rounded-xl font-semibold text-sm transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: General Profile Info */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar src={teacher.avatar} alt={teacher.name} className="w-24 h-24 rounded-full border-4 border-[#a855f7] object-cover shadow-md" />
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{teacher.name}</h2>
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-semibold">
                <Briefcase className="w-3 h-3" />
                {departmentName}
              </div>
            </div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${teacher.isActive
              ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800'
            }`}>
              {teacher.isActive ? 'Active Instructor' : 'Inactive'}
            </span>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-405">Teaching Overview</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Courses</span>
                <span className="text-md font-black text-slate-900 dark:text-white">{coursesTaught.length}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Students</span>
                <span className="text-md font-black text-[#a855f7]">{totalStudents}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Lessons</span>
                <span className="text-md font-black text-slate-900 dark:text-white">{totalLessons}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-405">Contact & Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{teacher.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Joined {new Date(teacher.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Lecturing Tracks & Course Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <BookOpen className="w-5 h-5 text-[#a855f7]" /> Assigned Lecturing Tracks ({coursesTaught.length})
            </h3>

            {coursesTaught.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coursesTaught.map((course: any) => (
                  <div
                    key={course.id}
                    className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#a855f7]">
                          {course.category?.name || 'Course'}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                          {course._count?.batches || 0} {course._count?.batches === 1 ? 'Batch' : 'Batches'}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1 line-clamp-2">
                        {course.title}
                      </h4>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-slate-250/20 dark:border-slate-800 pt-3 text-center">
                      <div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Students</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {course._count?.enrollments || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Lessons</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {course._count?.lessons || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Quizzes</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {course._count?.quizzes || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-550 italic py-4">No lecturing tracks currently assigned to this instructor.</p>
            )}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditOpen && (
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
                    onChange={handleAvatarUpload}
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
                  {allCourses.map((c: any) => (
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
                className="w-full py-2.5 bg-[#a855f7] hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition mt-4"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content text-center animate-float-in">
            <h3 className="font-semibold text-slate-900 dark:text-white text-md">Delete Faculty Profile?</h3>
            <p className="text-[16px] text-slate-800 dark:text-slate-350 mt-2 ">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{teacher.name}</span>? This action cannot be undone.
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
                className="py-2.5 bg-red-500 hover:bg-red-655 text-white rounded-xl font-semibold text-[16px] transition cursor-pointer"
              >
                Delete Faculty
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
