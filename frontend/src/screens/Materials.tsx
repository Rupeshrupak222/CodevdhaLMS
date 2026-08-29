"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Video, BookOpen, Paperclip, Plus, Trash2, 
  Eye, Download, X, Play, Maximize2, ExternalLink, Loader2
} from 'lucide-react';
import { SecureVideoPlayer } from '@/components/SecureVideoPlayer';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export const Materials = () => {
  const { activeRole, user } = useLMS();
  const pathname = usePathname(); const searchParams = useSearchParams();
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

  const { data: rawMaterials = [], mutate: mutateMaterials, isLoading: isMaterialsLoading } = useSWR(
    selectedCourseId
      ? `/materials?courseId=${selectedCourseId}${selectedBatchId ? `&batchId=${selectedBatchId}` : ''}`
      : null,
    fetcher
  );

  // Tab: 'PDF' | 'Videos' | 'Notes' | 'Resources'
  const [activeTab, setActiveTab] = useState('PDF');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  
  // Custom Viewers state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const [uploadMode, setUploadMode] = useState('link'); // 'link' or 'file'
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  // Sync tab with URL query parameter ?tab=Videos
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const tab = params.get('tab');
    if (tab && ['PDF', 'Videos', 'Notes', 'Resources'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams.toString()]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadingFile(true);
    try {
      const { uploadFileToS3 } = await import('@/lib/upload');
      const { url } = await uploadFileToS3(file, 'materials');
      setUploadedFileUrl(url);
      toast.success('Study file uploaded to S3 successfully!');
    } catch (err: any) {
      toast.error('Failed to upload file to S3');
      console.error(err);
    } finally {
      setUploadingFile(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      let finalType = 'PDF';
      if (data.type === 'Videos') finalType = 'VIDEO';
      else if (data.type === 'Notes') finalType = 'NOTES';
      else if (data.type === 'Resources') finalType = 'RESOURCES';

      const finalUrl = uploadMode === 'file' ? uploadedFileUrl : data.linkUrl;
      if (uploadMode === 'file' && !uploadedFileUrl) {
        toast.error('Please wait for the file to finish uploading');
        return;
      }
      
      await api.post('/materials', {
        title: data.title,
        type: finalType,
        courseId: data.courseId,
        batchId: data.batchId || null,
        description: data.description,
        section: data.section || 'General',
        url: finalUrl || '#'
      });

      toast.success('Material uploaded successfully!');
      mutateMaterials();
      reset();
      setUploadedFileUrl(null);
      setFileName('');
      setIsUploadOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload material');
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await api.delete(`/materials/${id}`);
      toast.success('Material deleted successfully!');
      mutateMaterials();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete material');
    }
  };

  const handleDownload = (mat) => {
    if (mat.url && mat.url !== '#') {
      const link = document.createElement('a');
      link.href = mat.url;
      link.download = mat.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`💡 Downloading file: "${mat.title}" (${mat.size || 'Size unknown'})`);
    }
  };

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

  const handlePreview = (mat) => {
    if (!mat.url || mat.url === '#') {
      toast.error('No preview link available');
      return;
    }

    if (isVideoUrl(mat.url) || mat.type === 'Videos') {
      setSelectedMaterial(mat);
      setIsVideoModalOpen(true);
    } else if (isPdfUrl(mat.url) || mat.type === 'PDF') {
      setSelectedMaterial(mat);
      setIsPdfModalOpen(true);
    } else {
      // Redirect to external URL in a new tab
      window.open(mat.url, '_blank');
    }
  };

  // Convert backend uppercase type to frontend format
 const mappedMaterials = rawMaterials.map((m: any) => {
  let type = 'PDF';

  if (m.type === 'VIDEO') type = 'Videos';
  else if (m.type === 'NOTES') type = 'Notes';
  else if (m.type === 'RESOURCES') type = 'Resources';

  const url = m.url || '';

  let displayType = 'External Link';

  if (url) {
    const cleanUrl = url.split('?')[0].toLowerCase();

    if (cleanUrl.endsWith('.pdf')) {
      displayType = 'PDF';
    } else if (
      cleanUrl.endsWith('.mp4') ||
      cleanUrl.endsWith('.webm') ||
      cleanUrl.endsWith('.ogg') ||
      cleanUrl.endsWith('.mov') ||
      cleanUrl.endsWith('.m4v')
    ) {
      displayType = 'Video';
    }
  }

  return {
    ...m,
    type,
    size: m.size || displayType,
    uploadDate: new Date(m.createdAt).toLocaleDateString(),
  };
});

  const filteredMaterials = mappedMaterials.filter(m => m.type === activeTab);

  const getThumbnail = (type) => {
    if (type === 'PDF') return 'bg-rose-500/10 border-rose-500/25 text-rose-500';
    if (type === 'Videos') return 'bg-sky-500/10 border-sky-500/25 text-sky-500';
    if (type === 'Notes') return 'bg-purple-500/10 border-purple-500/25 text-purple-500';
    return 'bg-purple-500/10 border-purple-500/25 text-purple-500';
  };

  const getIcon = (type) => {
    if (type === 'PDF') return FileText;
    if (type === 'Videos') return Video;
    if (type === 'Notes') return BookOpen;
    return Paperclip;
  };

  // Fix: Handle tab change without redirecting
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Update URL without navigation - just update the query parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (isMaterialsLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading materials...</div>;
  }

  return (
 <div className="space-y-6">
 {/* Header Panel */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
 <BookOpen className="w-7 h-7 text-[#a855f7]" />
 Learning Materials
 </h1>
 <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
 Access study PDFs, watch recorded lecture videos, read training summaries, and browse resource links.
 </p>
  <div className="mt-4 flex flex-wrap items-center gap-4">
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-slate-750 dark:text-slate-300">Select Course:</label>
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
        <label className="text-sm font-medium text-slate-750 dark:text-slate-300">Select Batch:</label>
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
 onClick={() => setIsUploadOpen(true)}
 className="flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-purple-400 text-slate-950 px-4 py-2 rounded-xl text-[16px] font-semibold transition shadow-lg shadow-purple-500/10 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 Upload Study Material
 </button>
 )}
 </div>

 {/* Tabs - Clean Horizontal Scrollable */}
 <div className="border-b border-slate-200 dark:border-slate-800">
   {/* Tabs Container - No scrollbar, no arrows, pure touch scroll */}
   <div 
     className="flex gap-4 sm:gap-6 text-[16px] font-semibold overflow-x-auto overflow-y-hidden pb-3 scrollbar-hide"
     style={{
       scrollbarWidth: 'none', /* Firefox */
       msOverflowStyle: 'none', /* IE and Edge */
       WebkitOverflowScrolling: 'touch',
     }}
   >
     {[
       { id: 'PDF', label: 'PDF Documents', icon: FileText },
       { id: 'Videos', label: 'Videos & Streams', icon: Video },
       { id: 'Notes', label: 'Faculty Notes', icon: BookOpen },
       { id: 'Resources', label: 'Web Resources', icon: Paperclip }
     ].map((tab) => (
       <button
         key={tab.id}
         onClick={() => handleTabChange(tab.id)}
         className={`flex-shrink-0 pb-3 flex items-center gap-2 transition relative cursor-pointer whitespace-nowrap ${
           activeTab === tab.id
             ? 'text-[#a855f7] font-black'
             : 'text-slate-600 hover:text-slate-655 dark:hover:text-slate-200'
         }`}
       >
         <tab.icon className="w-4.5 h-4.5 flex-shrink-0" />
         <span>{tab.label}</span>
         {activeTab === tab.id && (
           <motion.div
             layoutId="activeMaterialTab"
             className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a855f7]"
           />
         )}
       </button>
     ))}
   </div>
 </div>

  {/* Cards Grid */}
  {activeRole === 'student' && rawMaterials.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4">
        <BookOpen className="w-8 h-8 text-[#a855f7]" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white text-base">No Study Materials Yet</h3>
      <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Enroll in a course to access study PDFs, videos, and notes uploaded by your teachers.</p>
      <button onClick={() => router.push(`/${activeRole}/courses`)} className="mt-5 px-5 py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition">
        Go to My Courses
      </button>
    </div>
  ) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredMaterials.length > 0 ? (
  filteredMaterials.map((mat, idx) => {
 const IconComp = getIcon(mat.type);
 return (
 <motion.div
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.25, delay: idx * 0.05 }}
 key={mat.id}
 className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between"
 >
 <div>
 <div className="flex justify-between items-start gap-4">
 {/* Folder/Doc Graphic Icon */}
 <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${getThumbnail(mat.type)}`}>
 <IconComp className="w-6 h-6" />
 </div>
 {/* Size badge */}
 {mat.url && mat.url !== '#' && (
  <a
    href={mat.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span className="text-[14px]  text-slate-600 font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-250/20 px-2 py-0.5 rounded">
 {mat.size}
 </span>
  </a>
)}
 </div>

 <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-4 line-clamp-1">{mat.title}</h3>
 <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-semibold ">
 Course id: {mat.courseId}
 </p>
 <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-3 line-clamp-2 ">
 {mat.description}
 </p>
 </div>

 <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <span className="text-[14px] text-slate-600 font-semibold">Uploaded: {mat.uploadDate}</span>
 <div className="flex items-center gap-1.5">
 {/* Actions */}
 <button
 onClick={() => handlePreview(mat)}
 className="p-1.5 bg-slate-50 hover:bg-[#a855f7] text-slate-500 hover:text-slate-950 dark:bg-slate-900 rounded-lg transition"
 title="Preview Material"
 >
 <Eye className="w-4 h-4" />
 </button>
 {/* Download button hidden for video materials */}
 {mat.type !== 'Videos' && (
 <button
 onClick={() => handleDownload(mat)}
 className="p-1.5 bg-slate-50 hover:bg-[#a855f7] text-slate-500 hover:text-slate-950 dark:bg-slate-900 rounded-lg transition"
 title="Download"
 >
 <Download className="w-4 h-4" />
 </button>
 )}
 {(activeRole === 'admin' || activeRole === 'faculty') && (
 <button
 onClick={() => confirmDelete(mat.id)}
 className="p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 rounded-lg transition"
 title="Delete File"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>
 </motion.div>
 );
 })
 ) : (
 <div className="col-span-full py-16 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-center text-slate-600 dark:text-slate-300 text-[16px]">
 No materials uploaded under this format yet.
 </div>
 )}
 </div>
 )}

 {/* MODALS SECTION - Keeping the same as original */}
 {/* 1. Upload Material Modal */}
 {isUploadOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsUploadOpen(false)} />
 <div className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content">
 <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Upload New Learning Material</h3>
 <button onClick={() => setIsUploadOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-[16px] font-semibold">
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Document Title</label>
 <input
 type="text"
 {...register('title', { required: 'Title is required' })}
 placeholder="e.g. JWT Auth Flow Diagram"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 {errors.title && <p className="text-red-500 text-[14px] mt-0.5">{errors.title.message as string}</p>}
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Format Category</label>
 <select
 {...register('type')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 >
 <option value="PDF">PDF Document</option>
 <option value="Videos">Video Link</option>
 <option value="Notes">Study Notes</option>
 <option value="Resources">External Resource</option>
 </select>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Associated Course</label>
 <select
 {...register('courseId', { required: true })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 >
 { courses.map((c: any) => (
 <option key={c.id} value={c.id}>{c.title}</option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Target Batch Scope</label>
 <select
 {...register('batchId')}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 >
 <option value="">Course-wide (All Students)</option>
 {batches.filter((b: any) => b.courseId === (watch('courseId') || selectedCourseId)).map((b: any) => (
   <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>
 <div className="mt-4">
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Section (e.g. Week 1, Advanced)</label>
 <input
 type="text"
 {...register('section')}
 placeholder="General"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div className="space-y-3">
 <div className="flex gap-4 mb-2">
 <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
 <input type="radio" name="uploadMode" checked={uploadMode === 'link'} onChange={() => setUploadMode('link')} />
 External Link
 </label>
 <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
 <input type="radio" name="uploadMode" checked={uploadMode === 'file'} onChange={() => setUploadMode('file')} />
 Upload File
 </label>
 </div>
 {uploadMode === 'link' ? (
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Resource URL</label>
 <input
 type="url"
 {...register('linkUrl')}
 placeholder="https://..."
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>
 ) : (
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Select File</label>
 <input
 type="file"
 onChange={handleFileUpload}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none text-[14px]"
 />
 {uploadingFile && (
   <div className="flex items-center gap-2 mt-2 text-xs text-purple-500 font-semibold animate-pulse">
     <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading file to AWS S3...
   </div>
 )}
 {uploadedFileUrl && (
   <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">✓ File uploaded successfully to S3</p>
 )}
 </div>
 )}
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Short Description</label>
 <textarea
 rows={3}
 {...register('description')}
 placeholder="Describe the content of this file..."
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <button
 type="submit"
 className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition mt-4"
 >
 Publish Document
 </button>
 </form>
 </div>
 </div>
 )}

 {/* 2. Secure Video Player Modal */}
 {isVideoModalOpen && selectedMaterial && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsVideoModalOpen(false)} />
 <div className="relative w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl z-10 border border-slate-850">
 <div className="p-4 bg-slate-950/90 flex justify-between items-center text-slate-100">
 <span className="text-[16px] font-semibold flex items-center gap-2">
 <Play className="w-4.5 h-4.5 text-[#a855f7]" />
 Secure Video Player - {selectedMaterial.title}
 </span>
 <button onClick={() => setIsVideoModalOpen(false)} className="text-slate-600 hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="aspect-video bg-black">
 <SecureVideoPlayer
   src={selectedMaterial.url}
   title={selectedMaterial.title}
   autoPlay
   className="w-full h-full"
   onError={() => toast.error('Video failed to load')}
 />
 </div>
 
 <div className="p-4 bg-slate-950/50 text-slate-600 text-[16px]">
 <p className="font-semibold text-slate-350">{selectedMaterial.description}</p>
 <p className="text-[14px] text-slate-500 mt-1">Uploaded to LMS on {selectedMaterial.uploadDate}</p>
 </div>
 </div>
 </div>
 )}

 {/* 3. Interactive PDF Reader Simulator */}
 {isPdfModalOpen && selectedMaterial && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsPdfModalOpen(false)} />
 <div className="relative w-full max-w-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 flex flex-col justify-between max-h-[90vh] modal-content">
 
 {/* Top Toolbar */}
 <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-rose-500" />
 <span className="font-semibold text-sm text-slate-900 dark:text-white">
 Document Previewer
 </span>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={() => handleDownload(selectedMaterial)}
 className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 hover:bg-[#a855f7] text-slate-700 dark:text-slate-350 dark:hover:text-slate-950 px-2.5 py-1 text-[14px] font-semibold rounded-lg border border-slate-200 dark:border-slate-800 transition"
 >
 <Download className="w-3.5 h-3.5" /> Download PDF
 </button>
 <button onClick={() => setIsPdfModalOpen(false)} className="text-slate-450 hover:text-slate-700 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Document Reader Pane Sim */}
 <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center select-none min-h-[350px] relative scrollbar-thin">
 <div className="max-w-md mx-auto py-12 flex flex-col items-center justify-center">
 <FileText className="w-16 h-16 text-rose-500/80 mb-4 animate-bounce" />
 <h4 className="font-black text-slate-900 dark:text-white text-sm">{selectedMaterial.title}</h4>
 <p className="text-[16px] text-slate-500 mt-2 ">
 {selectedMaterial.description}
 </p>
 <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full mt-6 text-left text-sm space-y-1.5">
 <p className="text-slate-600">File Type: <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedMaterial.type} Document</span></p>
 <p className="text-slate-600">File Size: <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedMaterial.size}</span></p>
 <p className="text-slate-600">Course Scope: <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedMaterial.courseName}</span></p>
 <p className="text-slate-600">Security Signature: <span className="text-slate-700 dark:text-slate-200 font-semibold ">MD5_SUM_F78AB9D</span></p>
 </div>
 
 <span className="text-[14px] text-slate-600 mt-10 block ">
 [ End of Document Simulation ]
 </span>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default Materials;
