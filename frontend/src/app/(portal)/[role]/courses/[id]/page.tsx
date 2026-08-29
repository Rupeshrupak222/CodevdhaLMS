"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowUp, ArrowDown, Video, BookOpen, Users, GraduationCap, Plus, Trash2,
  Play, Edit3, X, Save, Clock, Film, CheckCircle2, ChevronRight, ChevronDown,
  FileText, Download, ExternalLink, Loader2, Maximize2, Minimize2, AlertTriangle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { SecureVideoPlayer } from '@/components/SecureVideoPlayer';

export default function CourseDetailsPage() {
  const { activeRole, user, setMediaPlaying } = useLMS();
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const routeBase = activeRole === 'faculty' ? '/teacher/courses' : `/${activeRole}/courses`;

  // Fetch course details (disable revalidateOnFocus to prevent video restart on tab switch)
  const { data: course, error, isLoading, mutate: mutateCourse } = useSWR(`/courses/${courseId}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const { data: studentsData } = useSWR(activeRole !== 'student' ? `/courses/${courseId}/students` : null, fetcher);
  const enrolledStudents = studentsData || [];

  // S3 direct upload state
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; loaded: number; total: number } | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [autoDetectedDuration, setAutoDetectedDuration] = useState<string | null>(null);
  const [contentInputMode, setContentInputMode] = useState<'upload' | 'url'>('upload');
  const [directS3Url, setDirectS3Url] = useState('');
  const [resolvedS3Key, setResolvedS3Key] = useState<string | null>(null);
  const [s3UrlVerified, setS3UrlVerified] = useState(false);
  const [verifyingUrl, setVerifyingUrl] = useState(false);

  // Student study progress flow state
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'lesson' | 'section'; id: string; name: string } | null>(null);

  // Edit lesson state
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [editLessonSaving, setEditLessonSaving] = useState(false);

  // Load completed lessons from localStorage
  useEffect(() => {
    if (user && course) {
      const stored = localStorage.getItem(`completed_lessons_${user.id}_${course.id}`);
      if (stored) {
        setCompletedLessons(JSON.parse(stored));
      }
    }
  }, [user, course]);

  const handleContentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-detect video duration from file
    if (file.type.startsWith('video/')) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.onloadedmetadata = () => {
        const totalSeconds = Math.round(videoEl.duration);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const durationStr = secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
        setAutoDetectedDuration(durationStr);
        URL.revokeObjectURL(videoEl.src);
      };
      videoEl.src = URL.createObjectURL(file);
    } else {
      setAutoDetectedDuration(null);
    }

    setUploadingContent(true);
    setUploadProgress(null);
    try {
      // Organized path: courses/{courseId}/{duration}/{section}/{filename}
      const { uploadFileToS3 } = await import('@/lib/upload');
      const folder = `lessons/${courseId}/${currentDuration}/${selectedSectionName}`;
      const { url } = await uploadFileToS3(file, folder, (progress) => {
        setUploadProgress(progress);
      });
      setContentUrl(url);
      toast.success('File uploaded successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload file');
      console.error(err);
    } finally {
      setUploadingContent(false);
      setUploadProgress(null);
    }
  };

  const handleVerifyS3Url = async () => {
    const trimmed = directS3Url.trim();
    if (!trimmed) {
      toast.error('Please enter an S3 URL');
      return;
    }
    setVerifyingUrl(true);
    try {
      const response = await api.post('/upload/resolve-url', { url: trimmed });
      if (response.data.data?.presignedUrl) {
        setS3UrlVerified(true);
        // Store the resolved S3 key for DB storage
        setResolvedS3Key(response.data.data.s3Key || trimmed);
        toast.success('S3 URL verified successfully!');

        // Auto-detect video duration from presigned URL
        const presignedUrl = response.data.data.presignedUrl;
        const s3Key = response.data.data.s3Key || '';
        if (s3Key.match(/\.(mp4|webm|mov|mkv)$/i)) {
          const videoEl = document.createElement('video');
          videoEl.preload = 'metadata';
          videoEl.onloadedmetadata = () => {
            const totalSeconds = Math.round(videoEl.duration);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            const durationStr = secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
            setAutoDetectedDuration(durationStr);
            videoEl.src = '';
            videoEl.remove();
          };
          videoEl.onerror = () => {
            // Silently fail — user can still enter duration manually
            videoEl.src = '';
            videoEl.remove();
          };
          videoEl.src = presignedUrl;
        }
      } else {
        toast.error('Could not resolve the S3 URL');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid S3 URL - could not resolve');
      setS3UrlVerified(false);
      setResolvedS3Key(null);
    } finally {
      setVerifyingUrl(false);
    }
  };

  const toggleLessonCompletion = async (lessonId: string) => {
    if (!user || !course) return;

    let updated = [...completedLessons];
    if (updated.includes(lessonId)) {
      updated = updated.filter(id => id !== lessonId);
    } else {
      updated.push(lessonId);
    }
    setCompletedLessons(updated);
    localStorage.setItem(`completed_lessons_${user.id}_${course.id}`, JSON.stringify(updated));

    const validLessons = (course.lessons || []).filter((l: any) => l.title !== "_section_placeholder_");
    const total = validLessons.length;
    const progressPercent = total > 0 ? Math.round((updated.length / total) * 100) : 0;

    try {
      await api.put(`/courses/${courseId}/progress`, { progress: progressPercent });
      mutateCourse();
    } catch (err) {
      console.error('Failed to update progress on backend:', err);
    }
  };

  // Active Tab: 'lessons' | 'students'
  const [activeTab, setActiveTab] = useState('lessons');
  const [syllabusDuration, setSyllabusDuration] = useState('ALL');

  // Load last selected syllabusDuration from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`last_syllabus_duration_${courseId}`);
      if (saved) {
        setSyllabusDuration(saved);
      }
    }
  }, [courseId]);

  const changeSyllabusDuration = (duration: string) => {
    setSyllabusDuration(duration);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`last_syllabus_duration_${courseId}`, duration);
    }
  };

  // Sync syllabusDuration with student enrollment duration
  useEffect(() => {
    if (course?.studentDurationDays) {
      setSyllabusDuration(course.studentDurationDays);
    }
  }, [course]);

  const currentDuration = activeRole === 'student' ? (course?.studentDurationDays || 'DAYS_90') : syllabusDuration;

  // Content playback/preview state
  const [activeContentUrl, setActiveContentUrl] = useState<string | null>(null);
  const [activeContentTitle, setActiveContentTitle] = useState<string | null>(null);
  const [activeContentType, setActiveContentType] = useState<string>('VIDEO');
  const [isContentViewerOpen, setIsContentViewerOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Lesson modification forms
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [selectedSectionName, setSelectedSectionName] = useState('General');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ 'General': true });
  const [customSections, setCustomSections] = useState<string[]>([]);
  const [editingSectionName, setEditingSectionName] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');

  const { register: registerSection, handleSubmit: handleSubmitSection, reset: resetSection } = useForm();
  const { register: registerLesson, handleSubmit: handleSubmitLesson, reset: resetLesson, watch: watchLesson } = useForm();

  const selectedContentType = watchLesson('contentType') || 'VIDEO';

  // Parse lessons by section grouping
  const rawLessons = course?.lessons || [];
  const lessons = rawLessons.filter((l: any) => {
    if (l.title === "_section_placeholder_") return false;
    // "All Duration" tab: show only ALL lessons (for managing universal content)
    if (currentDuration === 'ALL') return l.durationDays === 'ALL';
    // 30/45 day tabs: show that duration's lessons + ALL duration lessons
    if (currentDuration === 'DAYS_30' || currentDuration === 'DAYS_45') {
      return l.durationDays === currentDuration || l.durationDays === 'ALL';
    }
    // 90/180 day tabs: show only that duration's own lessons (no ALL content)
    return l.durationDays === currentDuration;
  });

  const allSectionsSet = new Set<string>();
  rawLessons.filter((l: any) => {
    if (currentDuration === 'ALL') return l.durationDays === 'ALL';
    if (currentDuration === 'DAYS_30' || currentDuration === 'DAYS_45') {
      return l.durationDays === currentDuration || l.durationDays === 'ALL';
    }
    return l.durationDays === currentDuration;
  }).forEach((les: any) => {
    allSectionsSet.add(les.section || 'General');
  });
  // If no sections exist at all, show General as default for empty state
  if (allSectionsSet.size === 0) allSectionsSet.add('General');
  const sectionNames = Array.from(allSectionsSet);

  const sectionsMap: Record<string, any[]> = {};
  sectionNames.forEach(sec => {
    sectionsMap[sec] = [];
  });
  lessons.forEach((les: any) => {
    const sec = les.section || 'General';
    sectionsMap[sec].push(les);
  });

  const toggleSection = (name: string) => {
    setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleMoveSectionUp = async (secName: string) => {
    const idx = sectionNames.indexOf(secName);
    if (idx <= 0) return;
    try {
      const newOrder = [...sectionNames];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      // Rebuild lessons array in new section order
      const durationLessons = rawLessons.filter((l: any) => l.durationDays === currentDuration);
      const reordered: any[] = [];
      newOrder.forEach(sec => {
        durationLessons.filter((l: any) => (l.section || 'General') === sec).forEach(l => reordered.push(l));
      });
      const updatedLessons = reordered.map((l: any, i: number) => ({
        title: l.title,
        duration: l.duration,
        durationDays: currentDuration,
        section: l.section || 'General',
        contentType: l.contentType || 'VIDEO',
        order: i + 1,
        videoUrl: l.videoUrl || undefined,
        description: l.description || undefined
      }));
      await api.put(`/courses/${courseId}/lessons?durationDays=${currentDuration}`, { lessons: updatedLessons });
      mutateCourse();
    } catch (err: any) {
      toast.error('Failed to reorder sections');
    }
  };

  const handleMoveSectionDown = async (secName: string) => {
    const idx = sectionNames.indexOf(secName);
    if (idx < 0 || idx >= sectionNames.length - 1) return;
    try {
      const newOrder = [...sectionNames];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      // Rebuild lessons array in new section order
      const durationLessons = rawLessons.filter((l: any) => l.durationDays === currentDuration);
      const reordered: any[] = [];
      newOrder.forEach(sec => {
        durationLessons.filter((l: any) => (l.section || 'General') === sec).forEach(l => reordered.push(l));
      });
      const updatedLessons = reordered.map((l: any, i: number) => ({
        title: l.title,
        duration: l.duration,
        durationDays: currentDuration,
        section: l.section || 'General',
        contentType: l.contentType || 'VIDEO',
        order: i + 1,
        videoUrl: l.videoUrl || undefined,
        description: l.description || undefined
      }));
      await api.put(`/courses/${courseId}/lessons?durationDays=${currentDuration}`, { lessons: updatedLessons });
      mutateCourse();
    } catch (err: any) {
      toast.error('Failed to reorder sections');
    }
  };

  const handleAddSection = async (data: any) => {
    const name = data.name.trim();
    if (!name) return;
    try {
      const placeholderLesson = {
        title: "_section_placeholder_",
        duration: "0 min",
        durationDays: currentDuration,
        section: name,
        contentType: "VIDEO",
        order: 0,
        videoUrl: "",
        description: "placeholder"
      };

      const durationLessons = rawLessons.filter((l: any) => l.durationDays === currentDuration);
      const updatedLessons = [...durationLessons, placeholderLesson].map((l, idx) => ({
        title: l.title,
        duration: l.duration,
        durationDays: currentDuration,
        section: l.section || 'General',
        contentType: l.contentType || 'VIDEO',
        order: idx + 1,
        videoUrl: l.videoUrl || undefined,
        description: l.description || undefined
      }));

      await api.put(`/courses/${courseId}/lessons?durationDays=${currentDuration}`, { lessons: updatedLessons });
      toast.success(`Section "${name}" created and saved successfully!`);
      mutateCourse();
      setExpandedSections(prev => ({ ...prev, [name]: true }));
      setIsAddSectionOpen(false);
      resetSection();
    } catch (err: any) {
      toast.error('Failed to save new section');
    }
  };

  const handleDeleteSection = async (sectionName: string) => {
    try {
      const durationLessons = rawLessons.filter((l: any) => l.durationDays === currentDuration);
      const updatedLessons = durationLessons
        .filter((l: any) => l.section !== sectionName)
        .map((l: any, idx: number) => ({
          title: l.title,
          duration: l.duration,
          durationDays: currentDuration,
          section: l.section || 'General',
          contentType: l.contentType || 'VIDEO',
          order: idx + 1,
          videoUrl: l.videoUrl || undefined,
          description: l.description || undefined
        }));

      await api.put(`/courses/${courseId}/lessons?durationDays=${currentDuration}`, { lessons: updatedLessons });
      toast.success(`Section "${sectionName}" deleted successfully!`);
      mutateCourse();
    } catch (err: any) {
      toast.error('Failed to delete section');
    }
  };

  const handleRenameSection = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setEditingSectionName(null);
      return;
    }
    try {
      const durationLessons = rawLessons.filter((l: any) => l.durationDays === currentDuration);
      const updatedLessons = durationLessons.map((l: any, idx: number) => ({
        title: l.title,
        duration: l.duration,
        durationDays: currentDuration,
        section: l.section === oldName ? newName.trim() : (l.section || 'General'),
        contentType: l.contentType || 'VIDEO',
        order: idx + 1,
        videoUrl: l.videoUrl || undefined,
        description: l.description || undefined
      }));

      await api.put(`/courses/${courseId}/lessons?durationDays=${currentDuration}`, { lessons: updatedLessons });
      toast.success(`Section renamed to "${newName.trim()}" successfully!`);
      mutateCourse();
      setEditingSectionName(null);
    } catch (err: any) {
      toast.error('Failed to rename section');
    }
  };

  const handleAddLesson = async (data: any) => {
    const finalUrl = contentInputMode === 'url' ? (resolvedS3Key || directS3Url.trim()) : contentUrl;
    if (!finalUrl) {
      toast.error(contentInputMode === 'url' ? 'Please enter a valid S3 URL' : 'Please upload a course content file first');
      return;
    }
    try {
      const durationLessons = rawLessons.filter((l: any) => l.durationDays === currentDuration);
      const order = durationLessons.length + 1;
      const payload = {
        title: data.title,
        duration: (data.contentType || 'VIDEO') === 'VIDEO' ? (data.duration || autoDetectedDuration || '') : 'N/A',
        durationDays: currentDuration,
        section: selectedSectionName,
        contentType: data.contentType || 'VIDEO',
        order,
        videoUrl: finalUrl,
        description: data.description || ''
      };

      const updatedLessons = [...durationLessons, payload].map((l, idx) => ({
        title: l.title,
        duration: l.duration,
        durationDays: currentDuration,
        section: l.section || 'General',
        contentType: l.contentType || 'VIDEO',
        order: idx + 1,
        videoUrl: l.videoUrl || undefined,
        description: l.description || undefined
      }));

      await api.put(`/courses/${courseId}/lessons?durationDays=${currentDuration}`, { lessons: updatedLessons });
      toast.success('Lecture/Content added successfully!');
      mutateCourse();
      setIsAddLessonOpen(false);
      resetLesson();
      setContentUrl(null);
      setDirectS3Url('');
      setResolvedS3Key(null);
      setContentInputMode('upload');
      setS3UrlVerified(false);
      setAutoDetectedDuration(null);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Something went wrong. Please try again.';
      toast.error(errMsg);
      console.error('Failed to add lesson:', err.response?.data || err.message);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      const durationLessons = rawLessons.filter((l: any) => l.durationDays === currentDuration);
      const updatedLessons = durationLessons
        .filter((l: any) => l.id !== lessonId)
        .map((l: any, idx: number) => ({
          title: l.title,
          duration: l.duration,
          durationDays: currentDuration,
          section: l.section || 'General',
          contentType: l.contentType || 'VIDEO',
          order: idx + 1,
          videoUrl: l.videoUrl || undefined,
          description: l.description || undefined
        }));

      await api.put(`/courses/${courseId}/lessons?durationDays=${currentDuration}`, { lessons: updatedLessons });
      toast.success('Content removed successfully!');
      mutateCourse();
      if (activeContentTitle === durationLessons.find((l: any) => l.id === lessonId)?.title) {
        setActiveContentUrl(null);
        setActiveContentTitle(null);
        setIsContentViewerOpen(false);
      }
    } catch (err: any) {
      toast.error('Failed to delete content');
    }
  };

  const handleEditLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLesson) return;
    setEditLessonSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const payload: any = {};
      const title = formData.get('title') as string;
      const duration = formData.get('duration') as string;
      const section = formData.get('section') as string;
      const contentType = formData.get('contentType') as string;
      const description = formData.get('description') as string;
      const videoUrl = formData.get('videoUrl') as string;

      if (title && title !== editingLesson.title) payload.title = title;
      if (duration && duration !== editingLesson.duration) payload.duration = duration;
      if (section && section !== editingLesson.section) payload.section = section;
      if (contentType && contentType !== editingLesson.contentType) payload.contentType = contentType;
      if (description !== undefined && description !== (editingLesson.description || '')) payload.description = description;
      if (videoUrl !== undefined && videoUrl !== (editingLesson.videoUrl || '')) payload.videoUrl = videoUrl;

      if (Object.keys(payload).length === 0) {
        toast.success('No changes to save');
        setEditingLesson(null);
        setEditLessonSaving(false);
        return;
      }

      await api.patch(`/courses/${courseId}/lessons/${editingLesson.id}`, payload);
      toast.success('Lesson updated successfully!');
      mutateCourse();
      setEditingLesson(null);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to update lesson';
      toast.error(errMsg);
    } finally {
      setEditLessonSaving(false);
    }
  };

  // Handle lesson click to open content viewer
  const handleLessonClick = (les: any) => {
    if (les.videoUrl) {
      setActiveContentUrl(les.videoUrl);
      setActiveContentTitle(les.title);
      setActiveContentType(les.contentType || 'VIDEO');
      setIsContentViewerOpen(true);
      setVideoError(false);
    }
  };

  // Close content viewer
  const closeContentViewer = () => {
    setActiveContentUrl(null);
    setIsContentViewerOpen(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading course syllabus details...</div>;
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        <p className="text-red-500 font-semibold mb-4">Failed to load course details</p>
        <button onClick={() => router.push(routeBase)} className="px-4 py-2 bg-[#a855f7] text-slate-950 font-semibold rounded-xl transition">
          Return to Course Library
        </button>
      </div>
    );
  }

  // Content Viewer Component (shared between desktop and mobile)
  const ContentViewer = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <Film className="w-5 h-5 text-[#a855f7]" /> Content Viewer
        </h3>
        {/* Close button - only visible on mobile inside bottom sheet */}
        <button
          onClick={closeContentViewer}
          className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {activeContentUrl ? (
        <div className="space-y-4 animate-float-in">
          <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-250 dark:border-slate-800 relative flex items-center justify-center">
            {activeContentType === 'PDF' || activeContentType === 'DOCUMENT' ? (
              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <FileText className="w-12 h-12 text-[#a855f7] animate-bounce" />
                <div>
                  <p className="font-semibold text-sm line-clamp-1">{activeContentTitle}</p>
                  <p className="text-xs text-slate-400 mt-1">Syllabus PDF / Study Materials</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <a
                    href={activeContentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View
                  </a>
                  <a
                    href={activeContentUrl}
                    download
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1 border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            ) : videoError ? (
              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <Video className="w-12 h-12 text-red-400" />
                <div>
                  <p className="font-semibold text-sm">Video failed to load</p>
                  <p className="text-xs text-slate-400 mt-1">The video URL may be inaccessible or expired</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => setVideoError(false)}
                    className="px-4 py-1.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-lg text-xs transition"
                  >
                    Retry
                  </button>
                  <a
                    href={activeContentUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition border border-slate-700 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Direct
                  </a>
                </div>
              </div>
            ) : (
              <SecureVideoPlayer
                src={activeContentUrl!}
                title={activeContentTitle || 'Lecture Video'}
                poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80"
                className="w-full h-full"
                onError={() => setVideoError(true)}
                onPlay={() => setMediaPlaying(true)}
                onPause={() => setMediaPlaying(false)}
                onEnded={() => setMediaPlaying(false)}
              />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{activeContentTitle}</h4>
            <p className="text-xs text-slate-500 mt-1">
              Type: {activeContentType === 'PDF' ? 'PDF Document' : activeContentType === 'DOCUMENT' ? 'Document / Notes File' : 'Pre-recorded Video Lecture'}
            </p>
            {activeContentType !== 'PDF' && activeContentType !== 'DOCUMENT' && (
              <></>
            )}
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-250 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <Film className="w-10 h-10 text-slate-405 mb-2 animate-pulse" />
          <p className="text-xs font-semibold">Select a lesson from curriculum to view</p>
          <p className="text-[11px] text-slate-400 mt-1">Pre-recorded videos and reading PDFs can be viewed instantly on the browser.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Back Button */}
      <button
        onClick={() => router.push(routeBase)}
        className="flex items-center gap-1.5 text-[15px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Courses
      </button>

      {/* Course Main Details Panel */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-[#1E293B] shadow-sm p-6 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 h-40 bg-slate-105 dark:bg-slate-900 rounded-2xl overflow-hidden shrink-0">
          <img src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80'} alt={course.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 flex flex-col justify-evenly ">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#a855f7]/10 text-[#a855f7] rounded-md text-[13px] font-black uppercase tracking-wider">
                {course.category?.name || 'Development'}
              </span>
              <span className="text-[14px] text-slate-450 font-semibold">•</span>
              <span className="text-[14px] text-slate-500 dark:text-slate-400 font-semibold">{course.subcategory}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-2 leading-snug">
              {course.title}
            </h1>
            <p className="text-[15px] text-slate-500 dark:text-slate-300 mt-2 font-medium">
              {course.description || 'No course syllabus description provided yet.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[14px] text-slate-500 dark:text-slate-400 font-semibold">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-[#a855f7]" /> {activeRole === 'student' && course.studentDurationDays ? (
              {
                DAYS_30: '30 Days',
                DAYS_45: '45 Days',
                DAYS_90: '90 Days',
                DAYS_180: '180 Days',
              }[course.studentDurationDays] || '90 Days'
            ) : course.duration}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4 text-[#a855f7]" /> Instructor: {course.teachers?.map((t: any) => t.teacher?.name).filter(Boolean).join(', ') || 'Unassigned'}</span>
            {activeRole !== 'student' && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4 text-[#a855f7]" /> {course._count?.enrollments || 0} Students Enrolled</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 gap-6 text-[15px] font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-3 relative transition cursor-pointer whitespace-nowrap ${activeTab === 'lessons' ? 'text-[#a855f7]' : 'text-slate-655 dark:text-slate-400'}`}
        >
          Syllabus & Video Lectures
          {activeTab === 'lessons' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]" />}
        </button>
        {activeRole !== 'student' && (
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 relative transition cursor-pointer whitespace-nowrap ${activeTab === 'students' ? 'text-[#a855f7]' : 'text-slate-655 dark:text-slate-400'}`}
          >
            Enrolled Student Cohort
            {activeTab === 'students' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]" />}
          </button>
        )}
      </div>

      {/* Content Body */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Playlist Panel */}
          <div className="lg:col-span-7 space-y-4">
            {/* Student Study Progress banner */}
            {activeRole === 'student' && (
              <div className="bg-gradient-to-r from-purple-500/10 to-[#a855f7]/10 border border-[#a855f7]/20 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Your Study Flow Progress</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    You have completed {completedLessons.length} out of {lessons.length} lectures/reading sessions.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex-1 sm:w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-[#a855f7] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${course.studentProgress ?? 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-[#a855f7]">{course.studentProgress ?? 0}%</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm">
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">Course Curriculum</h3>
                {activeRole === 'student' ? (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">Assigned Syllabus Track:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/25">
                      {{
                        DAYS_30: '30 Days',
                        DAYS_45: '45 Days',
                        DAYS_90: '90 Days',
                        DAYS_180: '180 Days',
                      }[course?.studentDurationDays || 'DAYS_90'] || '90 Days'}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2.5 mt-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    {[
                      { key: 'ALL', label: 'All Duration' },
                      { key: 'DAYS_30', label: '30 Days' },
                      { key: 'DAYS_45', label: '45 Days' },
                      { key: 'DAYS_90', label: '90 Days' },
                      { key: 'DAYS_180', label: '180 Days' },
                    ].map(d => (
                      <button
                        key={d.key}
                        onClick={() => changeSyllabusDuration(d.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${syllabusDuration === d.key ? 'bg-[#a855f7] text-slate-950 shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(activeRole === 'admin' || activeRole === 'faculty') && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsAddSectionOpen(true)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  >
                    + Add Section
                  </button>
                </div>
              )}
            </div>

            {/* Sections List */}
            {sectionNames.map((secName) => {
              const secLessons = sectionsMap[secName] || [];
              const isExpanded = expandedSections[secName] !== false;

              return (
                <div key={secName} className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden">
                  {/* Section Title Header */}
                  <div
                    onClick={() => toggleSection(secName)}
                    className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{secName}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800 text-slate-655 dark:text-slate-400 rounded-full font-semibold flex-shrink-0">
                        {secLessons.length} Lectures
                      </span>
                    </div>
                    {(activeRole === 'admin' || activeRole === 'faculty') && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {activeRole === 'admin' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveSectionUp(secName);
                              }}
                              disabled={sectionNames.indexOf(secName) === 0}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Section Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveSectionDown(secName);
                              }}
                              disabled={sectionNames.indexOf(secName) === sectionNames.length - 1}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Section Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSectionName(secName);
                                setNewSectionName(secName);
                              }}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition"
                              title="Rename Section"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: 'section', id: secName, name: secName });
                              }}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 rounded-lg transition"
                              title="Delete Section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSectionName(secName);
                            setIsAddLessonOpen(true);
                          }}
                          className="text-xs font-semibold text-[#a855f7] hover:underline"
                        >
                          + Add Content
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Section Lectures */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {secLessons.length > 0 ? (
                        secLessons.map((les, index) => {
                          const isCurrentlyPlaying = activeContentUrl === les.videoUrl && les.videoUrl;
                          const isPdf = les.contentType === 'PDF';
                          const isDoc = les.contentType === 'DOCUMENT';

                          return (
                            <div
                              key={les.id}
                              className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition cursor-pointer ${isCurrentlyPlaying ? 'bg-purple-50/20 dark:bg-purple-500/5' : ''}`}
                              onClick={() => handleLessonClick(les)}
                            >
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                {activeRole === 'student' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLessonCompletion(les.id);
                                    }}
                                    className={`p-1 rounded-lg transition mr-1 cursor-pointer flex-shrink-0 ${completedLessons.includes(les.id)
                                        ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    title={completedLessons.includes(les.id) ? "Mark as Incomplete" : "Mark as Completed"}
                                  >
                                    <CheckCircle2 className={`w-5 h-5 ${completedLessons.includes(les.id) ? 'fill-emerald-500/25 text-emerald-555' : 'text-slate-350'}`} />
                                  </button>
                                )}
                                <button
                                  disabled={!les.videoUrl}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (les.videoUrl) {
                                      handleLessonClick(les);
                                    }
                                  }}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition border flex-shrink-0 ${les.videoUrl
                                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-250 text-[#a855f7] hover:scale-105 cursor-pointer'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200/40 text-slate-405 cursor-not-allowed'
                                    }`}
                                >
                                  {isPdf || isDoc ? (
                                    <FileText className="w-3.5 h-3.5" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  )}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">{les.title}</h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {les.duration}</span>
                                    {les.videoUrl ? (
                                      <span className="text-emerald-500 font-black">
                                        ✓ {isPdf ? 'PDF Syllabus' : isDoc ? 'Document Notes' : 'Video Lecture'} Ready
                                      </span>
                                    ) : (
                                      <span className="text-slate-405 font-medium">No file attached</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                {activeRole === 'admin' && (les.durationDays === currentDuration) && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingLesson(les);
                                      }}
                                      className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-slate-405 hover:text-purple-600 rounded-lg transition"
                                      title="Edit Lesson"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({ type: 'lesson', id: les.id, name: les.title });
                                      }}
                                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-955/30 text-slate-405 hover:text-red-500 rounded-lg transition"
                                      title="Delete Content"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {(activeRole === 'admin' || activeRole === 'faculty') && (les.durationDays === 'ALL' && currentDuration !== 'ALL') && (
                                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md">
                                    All Duration
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-slate-655 dark:text-slate-400 text-sm italic">
                          No lecture contents uploaded in this course section.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP: Content Viewer Panel (lg and above) */}
          <div className="hidden lg:block lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm">
              <ContentViewer />
            </div>
          </div>

        </div>
      )}

      {/* MOBILE & TABLET: Content Viewer Bottom Sheet */}
      <AnimatePresence>
        {isContentViewerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 lg:hidden bg-slate-950/65 backdrop-blur-sm"
              onClick={closeContentViewer}
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden max-h-[92vh] bg-white dark:bg-[#1E293B] rounded-t-3xl shadow-2xl overflow-hidden"
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(92vh-40px)] px-4 pb-6">
                <ContentViewer />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Enrolled Students Tab */}
      {activeTab === 'students' && activeRole !== 'student' && (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-350">Student Profile</th>
                  <th className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-350">Email</th>
                  <th className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-350">Batch</th>
                  <th className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-350 hidden md:table-cell">Enrollment Date</th>
                  <th className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-350">Progress</th>
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.length > 0 ? (
                  enrolledStudents.map((enroll: any) => (
                    <tr key={enroll.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-purple-400/40 flex-shrink-0">
                            <img src={enroll.student?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{enroll.student?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-sm text-slate-655 dark:text-slate-300 font-semibold truncate max-w-[120px] sm:max-w-none">{enroll.student?.email}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-sm font-semibold">
                        {enroll.batch ? (
                          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-lg text-xs">
                            {enroll.batch.name}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-500/10 text-slate-500 rounded-lg text-xs">
                            Course-wide
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-sm text-slate-500 hidden md:table-cell">{new Date(enroll.enrolledAt).toLocaleDateString()}</td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-16 sm:w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                            <div className="bg-[#a855f7] h-1.5 rounded-full" style={{ width: `${enroll.progress}%` }} />
                          </div>
                          <span className="text-xs font-black text-slate-900 dark:text-white">{enroll.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                      No student enrollment records registered under this lecture stream cohort yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS SECTION */}
      {/* 0. Rename Section Modal */}
      {editingSectionName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setEditingSectionName(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Rename Section</h3>
              <button onClick={() => setEditingSectionName(null)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameSection(editingSectionName, newSectionName);
              }}
              className="space-y-4 text-sm font-semibold"
            >
              <div>
                <label className="block text-slate-405 dark:text-slate-300 mb-1">Section Name</label>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="Enter new section name"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  autoFocus
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition cursor-pointer">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 1. Add Section Modal */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsAddSectionOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Create New Course Section</h3>
              <button onClick={() => setIsAddSectionOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitSection(handleAddSection)} className="space-y-4 text-sm font-semibold">
              <div>
                <label className="block text-slate-405 dark:text-slate-300 mb-1">Section Name</label>
                <input
                  type="text"
                  {...registerSection('name', { required: true })}
                  placeholder="e.g. Chapter 1: Introduction to Advanced States"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition cursor-pointer">
                Confirm & Create
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Lesson Modal */}
      {isAddLessonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsAddLessonOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Upload content inside "{selectedSectionName}"</h3>
              <button onClick={() => setIsAddLessonOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitLesson(handleAddLesson)} className="space-y-4 text-sm font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Content Title</label>
                  <input
                    type="text"
                    {...registerLesson('title', { required: true })}
                    placeholder="e.g. Understanding Context API"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Content Type</label>
                  <select
                    {...registerLesson('contentType', { required: true })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="VIDEO">Video Lecture</option>
                    <option value="PDF">PDF Syllabus / Study Guide</option>
                    <option value="DOCUMENT">Document / Notes / Article</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {selectedContentType === 'VIDEO' && (
                  <div>
                    <label className="block text-slate-405 dark:text-slate-300 mb-1">Duration (e.g. 15 min)</label>
                    <input
                      type="text"
                      {...registerLesson('duration')}
                      placeholder={autoDetectedDuration || "e.g. 20 min"}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                    {autoDetectedDuration && (
                      <p className="text-[11px] text-emerald-500 font-semibold mt-1">Auto-detected: {autoDetectedDuration}</p>
                    )}
                  </div>
                )}
                <div className={selectedContentType === 'VIDEO' ? '' : 'col-span-2'}>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Section</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedSectionName}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-105 dark:bg-slate-900 rounded-lg text-slate-600 focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-450 dark:text-slate-300 mb-1">Upload Study Content (Video, PDF, or Document)</label>
                {/* Toggle: Upload File vs Paste S3 URL */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => { setContentInputMode('upload'); setDirectS3Url(''); setResolvedS3Key(null); setS3UrlVerified(false); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${contentInputMode === 'upload' ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => { setContentInputMode('url'); setContentUrl(null); setResolvedS3Key(null); setS3UrlVerified(false); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${contentInputMode === 'url' ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                  >
                    Paste S3 URL
                  </button>
                </div>
                {contentInputMode === 'upload' ? (
                  <>
                    <input
                      type="file"
                      accept="video/*,application/pdf,text/*"
                      onChange={handleContentFileChange}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {uploadingContent && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-purple-500 flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Uploading to S3...
                          </span>
                          {uploadProgress && (
                            <span className="text-slate-600 dark:text-slate-400">
                              {(uploadProgress.loaded / (1024 * 1024)).toFixed(1)} MB / {(uploadProgress.total / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          )}
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress?.percent || 0}%` }}
                          />
                        </div>
                        {uploadProgress && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-right">
                            {uploadProgress.percent}% complete
                          </p>
                        )}
                      </div>
                    )}
                    {contentUrl && (
                      <p className="text-xs text-emerald-500 font-semibold mt-1">✓ File uploaded successfully to S3</p>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={directS3Url}
                      onChange={(e) => { setDirectS3Url(e.target.value); setS3UrlVerified(false); setResolvedS3Key(null); }}
                      placeholder="https://codvedha-lms-storage.s3.ap-south-1.amazonaws.com/lessons/video.mp4"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleVerifyS3Url}
                        disabled={!directS3Url.trim() || verifyingUrl}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {verifyingUrl ? 'Verifying...' : 'Verify URL'}
                      </button>
                      {s3UrlVerified && (
                        <p className="text-xs text-emerald-500 font-semibold">✓ URL verified & accessible</p>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Paste the full S3 URL of the already-uploaded file and verify before saving</p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-slate-405 dark:text-slate-300 mb-1">Content Description</label>
                <textarea
                  {...registerLesson('description')}
                  placeholder="Optional brief description"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none h-20"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition cursor-pointer">
                Save & Upload
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-md">
              {deleteConfirm.type === 'section' ? 'Delete Section?' : 'Delete Content?'}
            </h3>
            <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{deleteConfirm.name}</span>?
              {deleteConfirm.type === 'section' && ' All content inside this section will also be removed.'}
              {' '}This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-[14px] transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirm.type === 'section') {
                    await handleDeleteSection(deleteConfirm.id);
                  } else {
                    await handleDeleteLesson(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
                className="py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-[14px] transition"
              >
                {deleteConfirm.type === 'section' ? 'Delete Section' : 'Delete Content'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Lesson Modal */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setEditingLesson(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Edit Lesson</h3>
              <button onClick={() => setEditingLesson(null)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditLesson} className="space-y-4 text-sm font-semibold">
              <div>
                <label className="block text-slate-405 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingLesson.title}
                  placeholder="Lesson title"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Duration</label>
                  <input
                    type="text"
                    name="duration"
                    defaultValue={editingLesson.duration}
                    placeholder="e.g. 15 min"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-405 dark:text-slate-300 mb-1">Content Type</label>
                  <select
                    name="contentType"
                    defaultValue={editingLesson.contentType || 'VIDEO'}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="VIDEO">Video Lecture</option>
                    <option value="PDF">PDF Syllabus / Study Guide</option>
                    <option value="DOCUMENT">Document / Notes / Article</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-405 dark:text-slate-300 mb-1">Section</label>
                <select
                  name="section"
                  defaultValue={editingLesson.section || 'General'}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                >
                  {sectionNames.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-405 dark:text-slate-300 mb-1">Content URL (S3 Video/PDF link)</label>
                <input
                  type="text"
                  name="videoUrl"
                  defaultValue={editingLesson.videoUrl || ''}
                  placeholder="https://... S3 URL"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Leave unchanged if you don't want to update the content file</p>
              </div>
              <div>
                <label className="block text-slate-405 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingLesson.description || ''}
                  placeholder="Optional brief description"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none h-20"
                />
              </div>
              <button
                type="submit"
                disabled={editLessonSaving}
                className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {editLessonSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editLessonSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
