"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Eye, BookOpen, Clock, Tag, X, AlertTriangle, ShoppingCart, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const coursesFetcher = (url: string) => api.get(url).then(res => ({
  courses: res.data.data,
  meta: res.data.meta
}));

const subcategories: any = {
  'Web Development': ['React', 'Next.js', 'Node.js', 'Django', 'HTML/CSS'],
  'Mobile Development': ['React Native', 'Flutter', 'Swift', 'Kotlin'],
  'Data Science': ['Machine Learning', 'Deep Learning', 'Pandas/NumPy', 'Visualization'],
  'Frontend Development': ['React', 'Vue', 'HTML/CSS', 'Next.js'],
  'Backend Development': ['Node.js', 'Express', 'Prisma', 'PostgreSQL']
};

export const Courses = () => {
  const { activeRole, user, searchQuery } = useLMS();
  const pathname = usePathname(); const searchParams = useSearchParams();
  const router = useRouter();
  const routeBase = activeRole === 'faculty' ? '/teacher/courses' : `/${activeRole}/courses`;

  const [currentPage, setCurrentPage] = useState(1);
  const [relatedPage, setRelatedPage] = useState(1);
  const [pageSize] = useState(9);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const { data: categories = [], isLoading: isCategoriesLoading } = useSWR('/courses/categories', fetcher);

  const selectedCategoryObj = categories.find((c: any) => c.name === categoryFilter);
  const categoryIdParam = selectedCategoryObj ? `&categoryId=${selectedCategoryObj.id}` : '';

  // API Data Fetching
  const searchParamUrl = activeSearch ? `&search=${encodeURIComponent(activeSearch)}` : '';
  const limitValue = activeSearch ? 100 : pageSize;

  const { data: paginatedData, mutate: mutateCourses, isLoading: isCoursesLoading } = useSWR(
    `/courses?page=${currentPage}&limit=${limitValue}${categoryIdParam}${searchParamUrl}`,
    coursesFetcher
  );
  const { data: allCoursesData } = useSWR(
    activeRole === 'student' ? `/courses?browse=true&limit=1000` : null,
    coursesFetcher
  );
  const { data: rawTeachers = [] } = useSWR(activeRole === 'admin' ? '/users/teachers' : null, fetcher);
  const { data: rawStudents = [] } = useSWR(activeRole === 'admin' ? '/users/students' : null, fetcher);
  const { data: rawTasks = [], isLoading: isTasksLoading } = useSWR('/tasks', fetcher);

  const rawCourses = paginatedData?.courses || [];
  const meta = paginatedData?.meta || { page: 1, limit: 9, total: 0, totalPages: 1 };
  const allCourses = allCoursesData?.courses || [];
  const tasks = rawTasks || [];

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, searchQuery, activeSearch]);

  // Tab: 'all' vs 'categories' vs 'lessons' vs 'assignments'
  const [activeTab, setActiveTab] = useState('all');

  // Map API course object to frontend representation
  const mapCourse = (c: any) => ({
    ...c,
    category: c.category?.name || 'CSE/IT Domains',
    categoryId: c.categoryId || c.category?.id,
    instructor: c.teachers?.[0]?.teacher?.name || 'Guest Faculty',
    studentsCount: c._count?.enrollments || 0,
    image: c.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',
    status: c.status === 'ACTIVE' ? 'Active' : 'Inactive',
    // Find this student's enrollment progress if it exists
    studentProgress: c.studentProgress ?? c.enrollments?.[0]?.progress ?? c.progress ?? 0,
  });

  const visibleCourses = rawCourses.map(mapCourse);
  const allMappedCourses = allCourses.map(mapCourse);

  // Student specific courses lists
  let studentEnrolledCourses = visibleCourses;
  let relatedCourses: any[] = [];
  if (activeRole === 'student') {
    const enrolledIds = studentEnrolledCourses.map((c: any) => c.id);
    const enrolledCategoryIds = studentEnrolledCourses
      .map((c: any) => c.categoryId)
      .filter(Boolean);

    relatedCourses = allMappedCourses.filter((c: any) => {
      const isEnrolled = enrolledIds.includes(c.id);
      if (isEnrolled) return false;

      // If student is enrolled in some courses, only show related courses in the same categories
      if (enrolledCategoryIds.length > 0) {
        return enrolledCategoryIds.includes(c.categoryId);
      }

      // If student is not enrolled in any course yet, show all unenrolled courses as related
      return true;
    });
  }

  const RELATED_PAGE_SIZE = 6; // 2 rows of 3 columns
  const totalRelatedPages = Math.ceil(relatedCourses.length / RELATED_PAGE_SIZE);
  const paginatedRelatedCourses = relatedCourses.slice(
    (relatedPage - 1) * RELATED_PAGE_SIZE,
    relatedPage * RELATED_PAGE_SIZE
  );

  let filteredCourses = visibleCourses;
  if (categoryFilter) {
    filteredCourses = filteredCourses.filter((c: any) => c.category === categoryFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredCourses = filteredCourses.filter((c: any) =>
      c.title?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.instructor?.toLowerCase().includes(q)
    );
  }

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLessonEditOpen, setIsLessonEditOpen] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<any>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [assignedTeacherIds, setAssignedTeacherIds] = useState<string[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]);

  const [courseImageUrl, setCourseImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isNewImageUploaded, setIsNewImageUploaded] = useState(false);

  const handleCourseImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { uploadFileToS3 } = await import('@/lib/upload');
      const { url } = await uploadFileToS3(file, 'courses');
      setCourseImageUrl(url);
      setIsNewImageUploaded(true);
      toast.success('Course image uploaded to S3 successfully!');
    } catch (err: any) {
      toast.error('Failed to upload course image');
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const openAddModal = () => {
    setCourseImageUrl(null);
    setIsNewImageUploaded(false);
    setIsAddOpen(true);
  };

  // Subcategory helper state in Add/Edit forms
  const [formCategory, setFormCategory] = useState('CSE/IT Domains');

  // Sync state with URL queries (e.g. ?view=categories)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const view = params.get('view');
    if (view === 'categories') setActiveTab('categories');
    else setActiveTab('all');
  }, [searchParams.toString()]);

  // Form Hooks
  const { register: registerAdd, handleSubmit: handleSubmitAdd, reset: resetAdd, formState: { errors: errorsAdd } } = useForm();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, formState: { errors: errorsEdit } } = useForm();

  // Progress update handler (students only)
  const updateCourseProgress = async (courseId: string, lessonIndex: number, totalLessons: number) => {
    if (totalLessons === 0) return;
    const newProgress = Math.round(((lessonIndex + 1) / totalLessons) * 100);
    try {
      await api.put(`/courses/${courseId}/progress`, { progress: newProgress });
      toast.success(`Progress updated to ${newProgress}%`);
      mutateCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update progress');
    }
  };

  // CRUD Submissions
  const onAddSubmit = async (data: any) => {
    try {
      const payload: any = {
        title: data.title,
        description: data.description || '',
        categoryId: data.categoryId,
        subcategory: '',
        duration: 'Multi-duration',
        status: data.status === 'Active' ? 'ACTIVE' : 'DRAFT',
        price: 0,
        image: courseImageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',
        externalUrl: data.externalUrl || ''
      };

      if (data.teacherId && data.teacherId !== 'None') {
        payload.teacherIds = [data.teacherId];
      }

      await api.post('/courses', payload);
      toast.success('Course assembled successfully!');
      mutateCourses();
      resetAdd();
      setIsAddOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assemble course');
    }
  };

  const onEditSubmit = async (data: any) => {
    if (!selectedCourse) return;
    try {
      const payload: any = {
        title: data.title,
        description: data.description || '',
        categoryId: data.categoryId,
        subcategory: '',
        duration: 'Multi-duration',
        status: data.status === 'Active' ? 'ACTIVE' : 'DRAFT',
        image: courseImageUrl || selectedCourse.image,
        externalUrl: data.externalUrl || '',
        teacherIds: assignedTeacherIds,
        studentIds: enrolledStudentIds,
      };

      await api.put(`/courses/${selectedCourse.id}`, payload);

      toast.success('Course settings updated!');
      mutateCourses();
      setIsEditOpen(false);
      setSelectedCourse(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update course');
    }
  };

  const triggerEdit = async (course) => {
    setSelectedCourse(course);
    setFormCategory(course.category);
    setCourseImageUrl(course.image);
    setIsNewImageUploaded(false);
    setIsEditOpen(true);

    const teachersList = course.teachers?.map((t: any) => t.teacher?.id).filter(Boolean) || [];
    setAssignedTeacherIds(teachersList);

    try {
      const res = await api.get(`/courses/${course.id}/students`);
      const studentsList = res.data.data?.map((e: any) => e.student?.id).filter(Boolean) || [];
      setEnrolledStudentIds(studentsList);
    } catch (err) {
      console.error('Failed to load course students', err);
      setEnrolledStudentIds([]);
    }

    resetEdit({
      title: course.title,
      description: course.description,
      categoryId: course.categoryId,
      status: course.status,
      externalUrl: course.externalUrl,
    });
  };

  const triggerPreview = (course) => {
    router.push(`${routeBase}/${course.id}`);
  };

  const triggerDelete = (course) => {
    setSelectedCourse(course);
    setIsDeleteOpen(true);
  };

  const triggerLessonEdit = (course) => {
    setSelectedCourse(course);
    setLessonFormData(course.lessons || []);
    setIsLessonEditOpen(true);
  };

  const handleLessonChange = (index, field, value) => {
    const updated = [...lessonFormData];
    updated[index][field] = value;
    setLessonFormData(updated);
  };

  const addLessonRow = () => {
    setLessonFormData([...lessonFormData, { title: '', duration: '' }]);
  };

  const removeLessonRow = (index) => {
    setLessonFormData(lessonFormData.filter((_, i) => i !== index));
  };

  const saveLessons = async () => {
    try {
      const formattedLessons = lessonFormData
        .filter((l: any) => l.title.trim() !== '')
        .map((l: any, idx: number) => ({
          title: l.title,
          duration: l.duration || undefined,
          order: idx + 1,
          videoUrl: l.videoUrl || undefined,
          description: l.description || undefined,
          section: l.section || 'General',
          contentType: l.contentType || 'VIDEO'
        }));

      await api.put(`/courses/${selectedCourse.id}/lessons`, { lessons: formattedLessons });
      toast.success('Course syllabus updated successfully!');
      mutateCourses();
      setIsLessonEditOpen(false);
      setSelectedCourse(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update syllabus');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/courses/${selectedCourse.id}`);
      toast.success('Course deleted successfully!');
      mutateCourses();
      setIsDeleteOpen(false);
      setSelectedCourse(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const enrollInCourse = async (courseId: string) => {
    try {
      await api.post(`/courses/${courseId}/enroll`);
      toast.success('Successfully enrolled in course!');
      mutateCourses();
      if (allCoursesData) {
        // refetch browse list
        mutate('/courses?browse=true');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to enroll');
    }
  };

  if (isCoursesLoading || isCategoriesLoading || isTasksLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading courses...</div>;
  }

  return (
 <div className="space-y-6">
 {/* Header section */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
 <BookOpen className="w-7 h-7 text-[#a855f7]" />
 Course Management
 </h1>
 <p className="text-[16px] text-slate-800 dark:text-slate-300 mt-0.5">
 Construct course syllabi, browse subcategories, organize lessons, and assign projects.
 </p>
 </div>
 {activeRole !== 'student' && (
 <button
 onClick={openAddModal}
 className="flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-[16px] font-semibold transition shadow-lg shadow-amber-500/10 cursor-pointer animate-float-in"
 >
 <Plus className="w-4 h-4" />
 Create New Course
 </button>
 )}
 </div>

  {/* Filter Bar */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 mb-6">
    {activeRole !== 'faculty' ? (
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-semibold text-slate-500">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7] text-[14px] font-semibold cursor-pointer shadow-sm"
          >
            <option value="">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search Course..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value === '') setActiveSearch('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setActiveSearch(searchInput);
            }}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7] text-[14px] shadow-sm w-48"
          />
          <button
            onClick={() => setActiveSearch(searchInput)}
            className="px-3.5 py-2 bg-[#a855f7] hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-[14px] transition shadow-sm"
          >
            Search
          </button>
        </div>
      </div>
    ) : (
      <div />
    )}
    <div className="flex items-center gap-2">
      <span className="text-[14px] text-slate-500 font-semibold">Showing {meta.total || 0} courses</span>
      <button
        onClick={() => mutateCourses()}
        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition"
        title="Refresh courses"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  </div>

  <div className="space-y-8">
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" >
      {filteredCourses.map((course, idx) => (
      <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * 0.05 }}
      key={course.id}
      className="rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden relative"
       >
      {/* Cover Image */}
      <div className="h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 relative cursor-pointer" onClick={() => triggerPreview(course)} >
      <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
      <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[14px] font-semibold ${
      course.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
      }`}>
      {course.status}
      </span>
      </div>

      {/* Course Info */}
      <div className="p-4 flex-1">
      <span className="text-[14px] text-[#a855f7] font-semibold ">{course.category}</span>
      <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-1.5 line-clamp-1">
      {course.title}
      </h3>
      <p className="text-[14px] text-slate-800 dark:text-slate-300 mt-1">Instructor: {course.instructor}</p>

      <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[14px] text-slate-600 dark:text-white font-semibold">
      <div className="flex items-center gap-1">
      <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-white" />
      {activeRole === 'student' && course.studentDurationDays ? (
        {
          DAYS_30: '30 Days',
          DAYS_45: '45 Days',
          DAYS_90: '90 Days',
          DAYS_180: '180 Days',
        }[course.studentDurationDays as string] || '90 Days'
      ) : course.duration}
      </div>
      {activeRole !== 'student' && (
      <div>
      <span>{course.studentsCount} Students</span>
      </div>
      )}
      </div>
      {activeRole === 'student' && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Progress</span>
            <span className="text-[12px] font-semibold text-[#a855f7]">{course.studentProgress || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
            <div
              className="bg-[#a855f7] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${course.studentProgress || 0}%` }}
            />
          </div>
        </div>
      )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-2 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
      <button
      onClick={() => triggerPreview(course)}
      className="flex items-center gap-1 text-[14px] font-semibold py-1 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 rounded-lg transition"
      >
      <Eye className="w-3 h-3 text-slate-800" /> Preview
      </button>
      {activeRole !== 'student' && (
      <>
      <button
      onClick={() => triggerEdit(course)}
      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-[#a855f7] hover:text-slate-950 dark:text-white transition"
      >
      <Edit3 className="w-3.5 h-3.5" />
      </button>
      <button
      onClick={() => triggerDelete(course)}
      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-500 hover:text-white transition"
      >
      <Trash2 className="w-3.5 h-3.5" />
      </button>
      </>
      )}
      </div>
      </motion.div>
      ))}
      </div>
      </div>

      {/* Pagination Controls */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-50 cursor-pointer hover:border-amber-400 transition"
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-slate-650 dark:text-slate-400">Page {currentPage} of {meta.totalPages || 1}</span>
          <button
            disabled={currentPage >= (meta.totalPages || 1)}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-50 cursor-pointer hover:border-amber-400 transition"
          >
            Next
          </button>
        </div>
      )}

      {activeRole === 'student' && relatedCourses.length > 0 && (
      <div className="space-y-6">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 border-t border-slate-200 dark:border-slate-800 pt-6">
      Related Courses to Explore
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {paginatedRelatedCourses.map((course, idx) => (
      <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * 0.05 }}
      key={`related-${course.id}`}
      className="rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden relative"
      >
      <div className="h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
      <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex-1">
      <span className="text-[14px] text-[#a855f7] font-semibold ">{course.category}</span>
      <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-1.5 line-clamp-1">
      {course.title}
      </h3>
      <p className="text-[14px] text-slate-800 dark:text-slate-300 mt-1">Instructor: {course.instructor}</p>
      </div>
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
      <button
      onClick={() => {
        if (course.externalUrl) {
          window.open(course.externalUrl, '_blank');
        }
      }}
      disabled={!course.externalUrl}
      className="flex items-center gap-1.5 text-[14px] font-semibold py-1.5 px-3 bg-[#a855f7] hover:bg-amber-400 text-slate-950 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
      <ExternalLink className="w-3.5 h-3.5" /> Explore Now
      </button>
      </div>
      </motion.div>
      ))}
      </div>

      {/* Related Courses Pagination */}
      {totalRelatedPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={relatedPage === 1}
            onClick={() => setRelatedPage(relatedPage - 1)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-50 cursor-pointer hover:border-amber-400 transition"
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-slate-650 dark:text-slate-400">Page {relatedPage} of {totalRelatedPages}</span>
          <button
            disabled={relatedPage >= totalRelatedPages}
            onClick={() => setRelatedPage(relatedPage + 1)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-50 cursor-pointer hover:border-amber-400 transition"
          >
            Next
          </button>
        </div>
      )}
      </div>
      )}
      </div>

 {/* MODALS INJECT - CUSTOM MODALS FOR COURSES */}
 {/* 1. Add Course Modal */}
 {isAddOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsAddOpen(false)} />
 <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content max-h-[90vh] overflow-y-auto scrollbar-thin">
 <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Create New Course</h3>
 <button onClick={() => setIsAddOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmitAdd(onAddSubmit)} className="space-y-4 text-[16px] font-semibold">
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Title</label>
 <input
 type="text"
 {...registerAdd('title', { required: 'Title is required' })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 placeholder="e.g. Master React Routing"
 />
 {errorsAdd.title && <p className="text-red-500 text-[14px] mt-0.5">{errorsAdd.title.message as string}</p>}
 </div>

   <div className="grid grid-cols-2 gap-4">
   <div className="col-span-2">
   <label className="block text-slate-405 dark:text-slate-300 mb-1">Main Category</label>
    <select
    {...registerAdd('categoryId', { 
      required: true,
      onChange: (e) => {
        const cat = categories.find((c: any) => c.id === e.target.value);
        setFormCategory(cat ? cat.name : 'Web Development');
      }
    })}
    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
    >
   {categories.map((c: any) => (
   <option key={c.id} value={c.id}>{c.name}</option>
   ))}
   </select>
   </div>
   </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Description</label>
  <textarea
  {...registerAdd('description')}
  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7] h-20"
  placeholder="Enter a brief course syllabus overview..."
  />
  </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-1">External Checkout/Explore Link</label>
  <input
  type="text"
  {...registerAdd('externalUrl')}
  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
  placeholder="e.g. https://codvedha.com/programs/ai-engineering"
  />
  </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Image Card</label>
  <input
  type="file"
  accept="image/*"
  onChange={handleCourseImageChange}
  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
  />
  {uploadingImage && (
    <div className="flex items-center gap-2 mt-2 text-xs text-amber-500 font-semibold">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to S3...
    </div>
  )}
  {courseImageUrl && (
    <div className="mt-2 flex items-center gap-3">
      <img src={courseImageUrl} alt="Preview" className="w-16 h-10 object-cover rounded-lg border border-slate-200" />
      {isNewImageUploaded ? (
        <span className="text-xs text-emerald-500 font-semibold">✓ Image uploaded successfully</span>
      ) : (
        <span className="text-xs text-slate-500 font-semibold">Existing course image</span>
      )}
    </div>
  )}
  </div>

  <div className="grid grid-cols-2 gap-4">
  <div className="col-span-2">
  <label className="block text-slate-405 dark:text-slate-300 mb-1">Instructor</label>
  <select
  {...registerAdd('teacherId')}
  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
  >
  <option value="None">None (Unassigned)</option>
  {rawTeachers.map((t: any) => (
  <option key={t.id} value={t.id}>{t.name}</option>
  ))}
  </select>
  </div>
  </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-1">Status</label>
  <select
  {...registerAdd('status')}
  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
  >
  <option value="Active">Active</option>
  <option value="Inactive">Inactive</option>
  </select>
  </div>

  <button
  type="submit"
  className="w-full py-2.5 bg-[#a855f7] hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition mt-4"
  >
  Assemble Course
  </button>
  </form>
 </div>
 </div>
 )}

 {/* 2. Edit Course Modal */}
 {isEditOpen && selectedCourse && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
 <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content max-h-[90vh] overflow-y-auto scrollbar-thin">
 <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Edit Course Settings</h3>
 <button onClick={() => setIsEditOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4 text-[16px] font-semibold">
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Title</label>
 <input
 type="text"
 defaultValue={selectedCourse.title}
 {...registerEdit('title', { required: 'Title is required' })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="col-span-2">
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Category</label>
  <select
   defaultValue={selectedCourse.categoryId}
   {...registerEdit('categoryId', {
     onChange: (e) => {
       const cat = categories.find((c: any) => c.id === e.target.value);
       setFormCategory(cat ? cat.name : 'Web Development');
     }
   })}
   className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
   >
  {categories.map((c: any) => (
  <option key={c.id} value={c.id}>{c.name}</option>
  ))}
  </select>
 </div>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Description</label>
 <textarea
 defaultValue={selectedCourse.description}
 {...registerEdit('description')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7] h-20"
 placeholder="Enter a brief course syllabus overview..."
 />
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">External Checkout/Explore Link</label>
 <input
 type="text"
 defaultValue={selectedCourse.externalUrl}
 {...registerEdit('externalUrl')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7]"
 placeholder="e.g. https://codvedha.com/programs/ai-engineering"
 />
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Course Image Card</label>
 <input
 type="file"
 accept="image/*"
 onChange={handleCourseImageChange}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
 />
 {uploadingImage && (
   <div className="flex items-center gap-2 mt-2 text-xs text-amber-500 font-semibold">
     <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to S3...
   </div>
 )}
 {courseImageUrl && (
   <div className="mt-2 flex items-center gap-3">
     <img src={courseImageUrl} alt="Preview" className="w-16 h-10 object-cover rounded-lg border border-slate-200" />
     {isNewImageUploaded ? (
       <span className="text-xs text-emerald-500 font-semibold">✓ Image uploaded successfully</span>
     ) : (
       <span className="text-xs text-slate-500 font-semibold">Existing course image</span>
     )}
   </div>
 )}
 </div>

 <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-2">Assign Teacher(s)</label>
  <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/40 dark:border-slate-800 rounded-xl scrollbar-thin">
  {rawTeachers.map((t: any) => (
  <label key={t.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-350 text-sm font-semibold">
  <input
  type="checkbox"
  value={t.id}
  checked={assignedTeacherIds.includes(t.id)}
  onChange={(e) => {
    if (e.target.checked) {
      setAssignedTeacherIds(prev => [...prev, t.id]);
    } else {
      setAssignedTeacherIds(prev => prev.filter(id => id !== t.id));
    }
  }}
  className="rounded border-slate-300 dark:border-slate-800 text-[#a855f7] focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900"
  />
  <span>{t.name}</span>
  </label>
  ))}
  </div>
  </div>

  <div>
  <label className="block text-slate-405 dark:text-slate-300 mb-2">Assign Student(s)</label>
  <div className="space-y-2 max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/40 dark:border-slate-800 rounded-xl scrollbar-thin">
  {rawStudents.map((s: any) => (
  <label key={s.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-350 text-sm font-semibold">
  <input
  type="checkbox"
  value={s.id}
  checked={enrolledStudentIds.includes(s.id)}
  onChange={(e) => {
    if (e.target.checked) {
      setEnrolledStudentIds(prev => [...prev, s.id]);
    } else {
      setEnrolledStudentIds(prev => prev.filter(id => id !== s.id));
    }
  }}
  className="rounded border-slate-300 dark:border-slate-800 text-[#a855f7] focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900"
  />
  <span>{s.name} ({s.email})</span>
  </label>
  ))}
  </div>
  </div>

  <div className="grid grid-cols-2 gap-4">
  <div className="col-span-2">
  <label className="block text-slate-405 dark:text-slate-300 mb-1">Status</label>
  <select
  defaultValue={selectedCourse.status}
  {...registerEdit('status')}
  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
  >
  <option value="Active">Active</option>
  <option value="Inactive">Inactive</option>
  <option value="Completed">Completed</option>
  </select>
  </div>
  </div>

 <button
 type="submit"
 className="w-full py-2.5 bg-[#a855f7] hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition mt-4"
 >
 Save Course Config
 </button>
 </form>
 </div>
 </div>
 )}

 {/* 3. Preview Course Modal */}
 {isPreviewOpen && selectedCourse && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)} />
 <div className="relative w-full max-w-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content overflow-hidden">
 <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Course Syllabus & Details</h3>
 <button onClick={() => setIsPreviewOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
 {/* Image banner */}
 <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden relative border border-slate-200 dark:border-slate-800">
 <img src={selectedCourse.image} alt={selectedCourse.title} className="w-full h-full object-cover" />
 <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#a855f7] text-slate-950 rounded text-[10px] font-semibold ">
 {selectedCourse.subcategory}
 </span>
 </div>

 <div>
 <span className="text-[14px] text-[#a855f7] font-semibold ">{selectedCourse.category}</span>
 <h4 className="font-black text-base text-slate-900 dark:text-white mt-1">{selectedCourse.title}</h4>
 <p className="text-[16px] text-slate-800 dark:text-slate-300 mt-1">Lead Instructor: <span className="font-semibold text-slate-700 dark:text-slate-250">{selectedCourse.instructor}</span> &bull; Duration: {selectedCourse.duration}</p>
 </div>

 {/* Lesson timeline */}
 <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
 <span className="text-[14px] font-semibold text-slate-600 block mb-2">Syllabus Lectures</span>
 <div className="space-y-2">
 {selectedCourse.lessons && selectedCourse.lessons.length > 0 ? (
 selectedCourse.lessons.map((les, index) => (
 <div key={les.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-[16px] flex justify-between items-center border border-slate-100 dark:border-slate-800">
 <span className="text-slate-800 dark:text-slate-350">
 {index + 1}. {les.title}
 </span>
 <span className="text-[14px] text-slate-600 dark:text-slate-300  ml-2">{les.duration}</span>
 </div>
 ))
 ) : (
 <p className="text-[16px] text-slate-600 italic">No lectures defined yet for this draft course.</p>
 )}
 </div>
 </div>

 {/* Assignments / Projects list */}
 <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
 <span className="text-[14px] font-semibold text-slate-600 block mb-2">Course Assignments</span>
 <div className="space-y-2">
 {selectedCourse.assignments && selectedCourse.assignments.length > 0 ? (
 selectedCourse.assignments.map((ass) => (
 <div key={ass.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-[16px] flex justify-between items-center border border-slate-100 dark:border-slate-800">
 <span className="text-slate-800 dark:text-slate-300 font-semibold">
 {ass.title}
 </span>
 <span className="text-[14px] text-slate-800 ">Due: {ass.dueDate}</span>
 </div>
 ))
 ) : (
 <p className="text-[16px] text-slate-600 italic">No assignments configured yet.</p>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* 4. Delete Confirmation Modal */}
 {isDeleteOpen && selectedCourse && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
 <div className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content text-center">
 <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
 <AlertTriangle className="w-6 h-6" />
 </div>
 <h3 className="font-semibold text-slate-900 dark:text-white text-md">Remove Course?</h3>
 <p className="text-[16px] text-slate-800 dark:text-slate-300 mt-2 ">
 Are you sure you want to remove <span className="font-semibold text-slate-900 dark:text-white">{selectedCourse.title}</span>? This deletes all associated student progress tracking data.
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
 Delete Course
 </button>
 </div>
 </div>
 </div>
 )}

  {/* 5. Edit Lessons Modal */}
  {isLessonEditOpen && selectedCourse && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsLessonEditOpen(false)} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Edit Syllabus: {selectedCourse.title}</h3>
          <button onClick={() => setIsLessonEditOpen(false)} className="text-slate-600 hover:text-slate-655 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
          {lessonFormData.map((lesson, idx) => (
            <div key={lesson.id || idx} className="flex gap-3 items-center">
              <span className="font-semibold text-slate-400 w-6">{idx + 1}.</span>
              <input
                type="text"
                placeholder="Lesson Title"
                value={lesson.title}
                onChange={(e) => handleLessonChange(idx, 'title', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Duration (e.g. 10m)"
                value={lesson.duration}
                onChange={(e) => handleLessonChange(idx, 'duration', e.target.value)}
                className="w-32 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              />
              <button 
                onClick={() => removeLessonRow(idx)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {lessonFormData.length === 0 && (
            <p className="text-slate-500 text-center py-4 italic">No lessons. Click below to add.</p>
          )}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={addLessonRow}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition"
          >
            <Plus className="w-4 h-4" /> Add Lesson
          </button>
          <button 
            onClick={saveLessons}
            className="px-6 py-2 bg-[#a855f7] hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition shadow-lg shadow-amber-500/10"
          >
            Save Syllabus
          </button>
        </div>
      </div>
    </div>
  )}
 </div>
 );
};
export default Courses;
