"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Clock, Plus, Trash2, Eye, Play, X, 
  HelpCircle, CheckCircle2, ChevronRight, Loader2
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export const Quizzes = () => {
  const { activeRole, user } = useLMS();
  const pathname = usePathname(); const searchParams = useSearchParams();
  const router = useRouter();
  const routeBase = activeRole === 'faculty' ? '/teacher/quizzes' : `/${activeRole}/quizzes`;

  // API Data Fetching
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const { data: coursesData, isLoading: isCoursesLoading } = useSWR('/courses', fetcher);
  const { data: batchesData } = useSWR('/batches?limit=500', fetcher);
  const courses = coursesData || [];
  const batches = Array.isArray(batchesData) ? batchesData : (batchesData?.batches || batchesData?.data?.batches || []);

  // Form setup for quiz creator
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      courseId: '',
      batchId: '',
      durationMinutes: 10,
      questions: [
        { type: 'MCQ', question: '', options: ['', '', '', ''], answer: '' }
      ]
    }
  });

  const creatorCourseId = watch('courseId');
  const { data: creatorBatchesRaw } = useSWR(creatorCourseId ? `/batches?courseId=${creatorCourseId}&isActive=true` : null, fetcher);
  const creatorBatches = Array.isArray(creatorBatchesRaw) ? creatorBatchesRaw : (creatorBatchesRaw?.data?.batches || creatorBatchesRaw?.batches || []);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const { data: rawQuizzes = [], mutate: mutateQuizzes, isLoading: isQuizzesLoading } = useSWR(
    selectedCourseId 
      ? `/quizzes?courseId=${selectedCourseId}${selectedBatchId ? `&batchId=${selectedBatchId}` : ''}`
      : null,
    fetcher
  );

  // For students: fetch their own attempts to lock already-attempted quizzes
  const [myAttempts, setMyAttempts] = React.useState<Record<string, any>>({});
  useEffect(() => {
    if (activeRole !== 'student' || quizzesList.length === 0) return;
    const fetchAttempts = async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        quizzesList.map(async (q: any) => {
          try {
            const res = await api.get(`/quizzes/${q.id}/my-attempt`);
            results[q.id] = res.data.data;
          } catch {
            results[q.id] = null;
          }
        })
      );
      setMyAttempts(results);
    };
    fetchAttempts();
  }, [rawQuizzes, activeRole]);

  // Mode states: 'list' | 'attempt' | 'result' | 'create'
  const [mode, setMode] = useState('list');
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);

  // Active student attempt state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<any>(null);

  // Results state
  const [scoreSummary, setScoreSummary] = useState<any>(null);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Attempts List Modal
  const [isAttemptsListOpen, setIsAttemptsListOpen] = useState(false);
  const [selectedQuizAttempts, setSelectedQuizAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  const triggerViewAttempts = async (quiz: any) => {
    setSelectedQuiz(quiz);
    setIsAttemptsListOpen(true);
    setLoadingAttempts(true);
    try {
      const res = await api.get(`/quizzes/${quiz.id}/attempts`);
      setSelectedQuizAttempts(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load quiz attempts');
      setSelectedQuizAttempts([]);
    } finally {
      setLoadingAttempts(false);
    }
  };

  // Sync state with URL queries (e.g. ?action=create, ?view=results)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const action = params.get('action');
    if (action === 'create') setMode('create');
    else setMode('list');
  }, [searchParams.toString()]);

  // Timer runner
  useEffect(() => {
    if (mode === 'attempt' && selectedQuiz && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [mode, timeLeft, selectedQuiz]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  });

  // Action: Launch Quiz attempt (fetches full quiz with questions)
  const startQuiz = async (quiz) => {
    try {
      const res = await api.get(`/quizzes/${quiz.id}`);
      const fullQuiz = res.data.data;
      setSelectedQuiz(fullQuiz);
      setCurrentQuestionIdx(0);
      setAnswers({});
      
      setTimeLeft(fullQuiz.durationMinutes * 60);
      
      setMode('attempt');
    } catch (err: any) {
      toast.error('Failed to start quiz attempt');
    }
  };

  // Action: Select Answer
  const selectAnswer = (ans) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIdx]: ans
    }));
  };

  // Action: Next Question or Submit
  const handleNext = () => {
    if (currentQuestionIdx < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      processQuizSubmission();
    }
  };

  const handleAutoSubmit = () => {
    alert("⏰ Time is up! Submitting your quiz automatically.");
    processQuizSubmission();
  };

  const processQuizSubmission = async () => {
    clearInterval(timerRef.current);
    try {
      const backendAnswers: any = {};
      selectedQuiz.questions.forEach((q: any, idx: number) => {
        backendAnswers[q.id] = answers[idx] || '';
      });

      const res = await api.post(`/quizzes/${selectedQuiz.id}/attempts`, {
        answers: backendAnswers
      });
      const attempt = res.data.data;

      const summary = {
        quizTitle: selectedQuiz.title,
        totalQuestions: attempt.total,
        correct: attempt.score,
        score: Math.round(attempt.percentage),
        durationTaken: selectedQuiz.durationMinutes * 60 - timeLeft
      };

      setScoreSummary(summary);
      mutateQuizzes();
      setMode('result');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit quiz attempt');
    }
  };

  const quizzesList = Array.isArray(rawQuizzes) ? rawQuizzes : [];

  // Map API quizzes into frontend listings representation
  const mappedQuizzes = quizzesList.map((q: any) => ({
    ...q,
    courseName: q.course?.title || 'General',
    questionsCount: q._count?.questions || 0
  }));

  const enrolledCourseIds = user?.enrollments?.map((e: any) => e.courseId) || [];

  const visibleQuizzes = mappedQuizzes.filter((q: any) => {
    if (activeRole === 'student') {
      const cId = q.courseId || q.course?.id;
      return enrolledCourseIds.includes(cId);
    }
    return true;
  });

  const onCreateQuizSubmit = async (data: any) => {
    try {
      const formattedQuestions = data.questions.map((q: any, qIdx: number) => {
        const optionsList = q.options.filter((o: any) => o && o.trim() !== '');
        
        // If the answer is an option number (e.g. 1, 2, 3, 4), resolve it to the option text
        let finalAnswer = q.answer;
        const optionNumber = parseInt(q.answer?.trim());
        if (!isNaN(optionNumber) && optionNumber >= 1 && optionNumber <= optionsList.length) {
          finalAnswer = optionsList[optionNumber - 1];
        }

        return {
          type: 'MCQ',
          question: q.question,
          answer: finalAnswer,
          order: qIdx + 1,
          options: optionsList.map((opt: string, optIdx: number) => ({
            text: opt,
            order: optIdx + 1
          }))
        };
      });

      await api.post('/quizzes', {
        title: data.title,
        courseId: data.courseId,
        batchId: data.batchId || null,
        durationMinutes: parseInt(data.durationMinutes as any),
        isPublished: true,
        questions: formattedQuestions
      });

      toast.success('Quiz assembled successfully!');
      mutateQuizzes();
      reset();
      router.push(routeBase);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assemble quiz');
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await api.delete(`/quizzes/${id}`);
      toast.success('Quiz deleted successfully!');
      mutateQuizzes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete quiz');
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const triggerPreview = async (quiz) => {
    try {
      const res = await api.get(`/quizzes/${quiz.id}`);
      setSelectedQuiz(res.data.data);
      setIsPreviewOpen(true);
    } catch (err: any) {
      toast.error('Failed to load quiz details');
    }
  };

  if (isQuizzesLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading quizzes...</div>;
  }

  return (
 <div className="space-y-6">
 {/* 1. QUIZ LIST PANEL */}
 {mode === 'list' && (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
 <Award className="w-7 h-7 text-[#a855f7]" />
 Quiz Dashboard
 </h1>
 <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
 Launch interactive examinations, track progress metrics, and review student grades.
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
 onClick={() => router.push(`${routeBase}?action=create`)}
 className="flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-purple-400 text-slate-950 px-4 py-2 rounded-xl text-[16px] font-semibold transition shadow-lg shadow-purple-500/10 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 Assemble Quiz
 </button>
 )}
 </div>

  {/* Grid list of quizzes */}
  {activeRole === 'student' && visibleQuizzes.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4">
        <Award className="w-8 h-8 text-[#a855f7]" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white text-base">No Quizzes Available</h3>
      <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">You need to be enrolled in a course to access quizzes. Enroll first from the Courses page.</p>
      <button onClick={() => router.push(`/${activeRole}/courses`)} className="mt-5 px-5 py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition">
        Go to My Courses
      </button>
    </div>
  ) : (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
  {visibleQuizzes.map((quiz) => {
    const myAttempt = myAttempts[quiz.id];
    const isAttempted = activeRole === 'student' && myAttempt !== undefined && myAttempt !== null;
    return (
  <motion.div
  whileHover={{ y: -4 }}
  key={quiz.id}
  className={`p-5 rounded-2xl bg-white dark:bg-[#1E293B] border shadow-sm flex flex-col justify-between ${
    isAttempted
      ? 'border-emerald-200 dark:border-emerald-800/60'
      : 'border-slate-200/50 dark:border-slate-800/50'
  }`}
  >
  <div>
  <div className="flex justify-between items-center text-[16px] text-slate-600">
  <span className="flex items-center gap-1">
  <Clock className="w-3.5 h-3.5 text-slate-600" />
  {quiz.durationMinutes} mins
  </span>
  {isAttempted ? (
    <span className="flex items-center gap-1 font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800 text-[13px]">
      <CheckCircle2 className="w-3.5 h-3.5" /> {Math.round(myAttempt.percentage)}%
    </span>
  ) : (
  <span className="font-semibold px-2 py-0.5 bg-slate-50 dark:bg-slate-900 rounded  border border-slate-100 dark:border-slate-800">
  {quiz.questionsCount || 0} Questions
  </span>
  )}
  </div>

  <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-4">{quiz.title}</h3>
  <p className="text-[14px] text-[#a855f7] mt-1.5 font-semibold">{quiz.courseName}</p>
  {isAttempted && (
    <p className="text-[13px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
      Score: {myAttempt.score}/{myAttempt.total} correct
    </p>
  )}
  </div>
  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
  {activeRole !== 'student' && (
    <>
      <button
        onClick={() => triggerViewAttempts(quiz)}
        className="px-2.5 py-1 bg-[#a855f7]/10 hover:bg-[#a855f7] text-[#a855f7] hover:text-slate-950 text-xs font-semibold rounded-lg transition mr-auto"
      >
        Submissions
      </button>
      <button
        onClick={() => triggerPreview(quiz)}
        className="p-2 rounded-xl bg-slate-50 hover:bg-[#a855f7] text-slate-500 hover:text-slate-950 dark:bg-slate-900 transition"
        title="Preview Quiz questions"
      >
        <Eye className="w-4 h-4" />
      </button>
    </>
  )}
  {activeRole === 'student' ? (
    isAttempted ? (
      <span className="flex items-center gap-1.5 text-[14px] font-semibold py-1.5 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-650 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
      </span>
    ) : (
      <button
        onClick={() => startQuiz(quiz)}
        className="flex items-center gap-1 bg-[#a855f7] hover:bg-purple-400 text-slate-950 text-[14px] font-semibold py-1.5 px-3.5 rounded-xl transition"
      >
        <Play className="w-3.5 h-3.5" /> Start Attempt
      </button>
    )
  ) : (
    <button
      onClick={() => confirmDelete(quiz.id)}
      className="p-2 rounded-xl bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 transition text-slate-500"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )}
  </div>
  </motion.div>
    );
  })}
  </div>
  )}
  </div>
  )}

 {/* 2. ACTIVE QUIZ ATTEMPT INTERFACE */}
 {mode === 'attempt' && selectedQuiz && (
 <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-xl space-y-6">
 {/* Attempt Header */}
 <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
 <div>
 <h2 className="text-base font-semibold text-slate-900 dark:text-white">{selectedQuiz.title}</h2>
 <span className="text-[14px] text-slate-600 block font-semibold mt-0.5">
 Question {currentQuestionIdx + 1} of {selectedQuiz.questions.length}
 </span>
 </div>
 
 <div className="flex items-center gap-3">
   <button 
     onClick={() => {
       if (window.confirm("Are you sure you want to quit? Your current progress will be submitted and you will be graded based on answered questions.")) {
          processQuizSubmission();
       }
     }}
     className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-sm font-semibold transition cursor-pointer"
   >
     Quit Quiz
   </button>
   
   {/* Timer widget */}
   <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-rose-500 font-semibold text-[16px]">
   <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
   {formatTime(timeLeft)}
   </div>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
 <div 
 className="h-full bg-gradient-to-r from-orange-500 to-[#a855f7] transition-all duration-300"
 style={{ width: `${((currentQuestionIdx + 1) / selectedQuiz.questions.length) * 100}%` }}
 />
 </div>

 {/* Question Text */}
 <div className="py-2">
 <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-[14px] font-semibold text-slate-500 ">
 {selectedQuiz.questions[currentQuestionIdx].type}
 </span>
 <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-3 ">
 {selectedQuiz.questions[currentQuestionIdx].question}
 </h3>
 </div>

 {/* Answers Options list */}
 <div className="space-y-2.5">
 {selectedQuiz.questions[currentQuestionIdx].options.map((opt) => {
 const optionText = typeof opt === 'string' ? opt : opt.text;
  const optionKey = typeof opt === 'string' ? opt : opt.id || opt.text;
  const selected = answers[currentQuestionIdx] === optionText;
 return (
 <button
 key={optionKey}
 onClick={() => selectAnswer(optionText)}
 className={`w-full text-left p-3.5 rounded-xl text-[16px] font-semibold border transition flex items-center justify-between cursor-pointer ${
 selected
 ? 'border-[#a855f7] bg-[#a855f7]/5 text-slate-950 dark:text-[#a855f7] font-semibold'
 : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
 }`}
 >
 <span>{optionText}</span>
 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
 selected ? 'border-[#a855f7]' : 'border-slate-350 dark:border-slate-700'
 }`}>
 {selected && <div className="w-2.5 h-2.5 bg-[#a855f7] rounded-full" />}
 </div>
 </button>
 );
 })}
 </div>

 {/* Navigation Controls */}
 <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
 <button
 disabled={currentQuestionIdx === 0}
 onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
 className="px-4 py-2 border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-[16px] font-semibold text-slate-500 rounded-xl transition cursor-pointer"
 >
 Previous
 </button>
 <button
 disabled={!answers[currentQuestionIdx]}
 onClick={handleNext}
 className="px-5 py-2.5 bg-[#a855f7] hover:bg-purple-400 disabled:opacity-40 text-slate-950 text-[16px] font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
 >
 {currentQuestionIdx < selectedQuiz.questions.length - 1 ? (
 <>Next Question <ChevronRight className="w-4 h-4" /></>
 ) : (
 'Submit Quiz'
 )}
 </button>
 </div>
 </div>
 )}

 {/* 3. SCORE CARD RESULTS VIEW */}
 {mode === 'result' && scoreSummary && (
 <div className="max-w-md mx-auto p-8 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-xl text-center space-y-6">
 <div className="w-20 h-20 bg-purple-400/10 border-2 border-[#a855f7]/40 rounded-full flex items-center justify-center mx-auto text-[#a855f7]">
 <Award className="w-10 h-10 animate-bounce" />
 </div>
 
 <div>
 <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Attempt Evaluated!</h2>
 <p className="text-[16px] text-slate-600 font-semibold mt-1">
 {scoreSummary.quizTitle}
 </p>
 </div>

 {/* Ring score card */}
 <div className="py-4 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-around items-center">
 <div className="text-center">
 <span className="text-[14px] text-slate-405 block font-semibold ">Grading Score</span>
 <span className="text-3xl font-black text-[#a855f7]  mt-1 block">{scoreSummary.score}%</span>
 </div>
 <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
 <div className="text-center">
 <span className="text-[14px] text-slate-405 block font-semibold ">Performance</span>
 <span className="text-[16px] font-semibold text-slate-700 dark:text-slate-250 mt-1 block">
 {scoreSummary.correct} / {scoreSummary.totalQuestions} Correct
 </span>
 </div>
 </div>

 <p className="text-[16px] text-slate-500 dark:text-slate-300">
 {scoreSummary.score >= 80 
 ? 'Congratulations! Excellent understanding demonstrated. This quiz score is synced into your student performance profile.' 
 : 'Decent attempt. Re-read the lecture notes and try again to improve your standing.'}
 </p>

 <button
 onClick={() => setMode('list')}
 className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition"
 >
 Return to Dashboard
 </button>
 </div>
 )}

 {/* 4. CREATE QUIZ CONSTRUCT PAGE */}
 {mode === 'create' && (
 <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-xl space-y-6">
 <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
 <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
 <Plus className="w-5 h-5 text-[#a855f7]" />
 Quiz Syllabus Composer
 </h2>
 <button onClick={() => router.push(routeBase)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit(onCreateQuizSubmit)} className="space-y-5 text-[16px] font-semibold">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Quiz Title</label>
 <input
 type="text"
 {...register('title', { required: 'Title is required' })}
 placeholder="e.g. Hooks and States"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 <div>
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Associated Course</label>
 <select
 {...register('courseId', { required: true })}
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 >
 <option value="">Select a course</option>
 {courses.map((c: any) => (
 <option key={c.id} value={c.id}>{c.title}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
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
 <label className="block text-slate-405 dark:text-slate-300 mb-1">Timer Limit (Minutes)</label>
 <input
 type="number"
 {...register('durationMinutes', { required: true })}
 className="w-32 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>
 </div>

 {/* Questions Array */}
 <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-[14px] font-semibold text-slate-600 ">Question Bank</span>
 <button
 type="button"
 onClick={() => append({ type: 'MCQ', question: '', options: ['', '', '', ''], answer: '' })}
 className="text-[#a855f7] flex items-center gap-1 font-semibold hover:underline"
 >
 <Plus className="w-3.5 h-3.5" /> Append Question
 </button>
 </div>

 {fields.map((field, idx) => (
 <div key={field.id} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl relative space-y-3">
 <span className="text-xs font-black text-[#a855f7] uppercase tracking-wider block">Question #{idx + 1}</span>
 <button
 type="button"
 onClick={() => remove(idx)}
 className="absolute top-3 right-3 text-red-500 hover:text-red-700"
 title="Remove Question"
 >
 <X className="w-4 h-4" />
 </button>

 <div className="grid grid-cols-2 gap-4 w-[90%]">
 <div>
 <label className="block text-slate-600 text-[14px] mb-1">Question Type</label>
 <select
 {...register(`questions.${idx}.type`)}
 disabled
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 rounded-lg focus:outline-none cursor-not-allowed"
 >
 <option value="MCQ">MCQ</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-slate-600 text-[14px] mb-1">Question Statement</label>
 <input
 type="text"
 {...register(`questions.${idx}.question`, { required: 'Question text is required' })}
 placeholder="e.g. Which hook triggers on props change?"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>

 {/* Options */}
 <div className="grid grid-cols-2 gap-2.5">
 {[0, 1, 2, 3].map((optIdx) => (
 <div key={optIdx}>
 <label className="block text-slate-600 text-[14px] mb-1">Option {optIdx + 1}</label>
 <input
 type="text"
 {...register(`questions.${idx}.options.${optIdx}`)}
 placeholder={`Option ${optIdx + 1}`}
 className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
 />
 </div>
 ))}
 </div>

 <div>
 <label className="block text-slate-600 text-[14px] mb-1">Correct Answer (Enter the text or the option number, e.g., 1, 2, 3, 4)</label>
 <input
 type="text"
 {...register(`questions.${idx}.answer`, { required: 'Correct answer is required' })}
 placeholder="e.g. 1 or useEffect"
 className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-950 dark:text-white focus:outline-none"
 />
 </div>
 </div>
 ))}
 </div>

 <button
 type="submit"
 className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition"
 >
 Publish Quiz
 </button>
 </form>
 </div>
 )}

 {/* 5. PREVIEW QUIZ QUESTIONS MODAL (Admin tool) */}
 {isPreviewOpen && selectedQuiz && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)} />
 <div className="relative w-full max-w-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 max-h-[80vh] overflow-y-auto modal-content scrollbar-thin">
 <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
 <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Quiz Syllabus Preview</h3>
 <button onClick={() => setIsPreviewOpen(false)} className="text-slate-600 hover:text-slate-600 dark:hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-4">
 <div>
  <h4 className="font-black text-sm text-slate-900 dark:text-white">{selectedQuiz.title}</h4>
  <p className="text-[14px] text-[#a855f7] font-semibold mt-0.5">{selectedQuiz.courseName}</p>
  <p className="text-[16px] text-slate-500 mt-1">Duration Limit: {selectedQuiz.durationMinutes} minutes &bull; Questions: {selectedQuiz.questions?.length}</p>
  </div>

 <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[16px]">
 {selectedQuiz.questions?.map((q, idx) => (
 <div key={q.id || idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
 <span className="text-[14px] bg-slate-200 dark:bg-slate-800 font-semibold px-1.5 py-0.5 rounded text-slate-500 ">{q.type}</span>
 <p className="font-semibold text-slate-850 dark:text-slate-200 mt-1.5">{idx + 1}. {q.question}</p>
 <div className="grid grid-cols-2 gap-1.5 text-[14px] font-semibold text-slate-500 pt-1">
 {q.options.map((opt, i) => (
 <div key={i} className="flex items-center gap-1">
 <div className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-700" />
 <span>{typeof opt === 'string' ? opt : opt.text}</span>
 </div>
 ))}
 </div>
 <p className="text-[14px] font-semibold text-emerald-500 pt-1.5 border-t border-slate-200/40 dark:border-slate-850">
 Correct Answer: {q.answer}
 </p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

  {/* 6. VIEW QUIZ ATTEMPTS MODAL */}
  {isAttemptsListOpen && selectedQuiz && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsAttemptsListOpen(false)} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 modal-content font-semibold text-[16px]">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <Award className="w-5 h-5 text-[#a855f7]" /> Quiz Submissions: {selectedQuiz.title}
          </h3>
          <button onClick={() => setIsAttemptsListOpen(false)} className="text-slate-600 hover:text-slate-655 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {loadingAttempts ? (
            <div className="text-center py-8 text-slate-500 font-semibold flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#a855f7]" /> Loading attempts...
            </div>
          ) : selectedQuizAttempts && selectedQuizAttempts.length > 0 ? (
            selectedQuizAttempts.map((attempt: any) => (
              <div key={attempt.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="space-y-1">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 block">
                    {attempt.student?.name}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-normal">
                    Email: {attempt.student?.email}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-normal">
                    Date: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A'}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1.5 font-semibold">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50/10 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                    Score: {attempt.score} / {attempt.total}
                  </span>
                  <span className="text-sm font-black text-[#a855f7]">
                    {Math.round(attempt.percentage)}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-[16px] italic text-center py-8">No student attempts for this quiz yet.</p>
          )}
        </div>
      </div>
    </div>
  )}
 </div>
 );
};
export default Quizzes;
