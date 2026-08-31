"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLMS } from '@/context/LMSContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const FaceAuthModal = dynamic(
  () => import('./FaceAuthModal').then((mod) => mod.FaceAuthModal),
  { ssr: false }
);

import {
  BookOpen, GraduationCap, UserCog,
  Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, Layers, Zap
} from 'lucide-react';

// CodVedha brand palette (sampled from logo)
const BRAND = {
  violet: '#530AD9',
  indigo: '#280192',
};

export const Auth = () => {
  const { login, enrollFace, verifyFace } = useLMS();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);

  // Face Auth States
  const [faceAuthMode, setFaceAuthMode] = useState<'enroll' | 'verify' | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isProcessingFace, setIsProcessingFace] = useState(false);
  const [faceAuthError, setFaceAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<any>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Session confirmation state
  const [showSessionConfirm, setShowSessionConfirm] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);

  const onSubmit = async (data: any) => {
    const res = await login(data.email, data.password, selectedRole, data.rememberMe);
    if (res?.status === 'REQUIRE_SESSION_CONFIRM') {
      setPendingLoginData(data);
      setShowSessionConfirm(true);
    } else if (res?.status === 'REQUIRE_FACE_ENROLL') {
      setFaceAuthMode('enroll');
      setTempToken(res.tempToken);
      setUserAvatar(res.avatar || null);
    } else if (res?.status === 'REQUIRE_FACE_VERIFY') {
      setFaceAuthMode('verify');
      setTempToken(res.tempToken);
      setUserAvatar(res.avatar || null);
    }
  };

  const handleSessionConfirmLogin = async () => {
    setShowSessionConfirm(false);
    if (pendingLoginData) {
      const res = await login(pendingLoginData.email, pendingLoginData.password, selectedRole, pendingLoginData.rememberMe, true);
      if (res?.status === 'REQUIRE_FACE_ENROLL') {
        setFaceAuthMode('enroll');
        setTempToken(res.tempToken);
        setUserAvatar(res.avatar || null);
      } else if (res?.status === 'REQUIRE_FACE_VERIFY') {
        setFaceAuthMode('verify');
        setTempToken(res.tempToken);
        setUserAvatar(res.avatar || null);
      }
    }
    setPendingLoginData(null);
  };

  const handleSessionConfirmCancel = () => {
    setShowSessionConfirm(false);
    setPendingLoginData(null);
  };

  const handleFaceAuthSuccess = async (embedding: number[], imageBase64?: string) => {
    if (!tempToken) return;
    setIsProcessingFace(true);
    setFaceAuthError(null);
    let result = { success: false, error: '' };

    if (faceAuthMode === 'enroll') {
      result = await enrollFace(tempToken, embedding, imageBase64);
    } else if (faceAuthMode === 'verify') {
      result = await verifyFace(tempToken, embedding);
    }

    setIsProcessingFace(false);
    if (!result.success) {
      setFaceAuthError(result.error || 'Face verification failed');
    } else {
      setFaceAuthMode(null);
      setTempToken(null);
    }
  };

  const handleFaceAuthCancel = () => {
    setFaceAuthMode(null);
    setTempToken(null);
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
  };

  const roles = [
    { key: 'admin', label: 'Admin', icon: UserCog, desc: 'Manage the platform' },
    { key: 'faculty', label: 'Faculty', icon: BookOpen, desc: 'Teach & evaluate' },
    { key: 'student', label: 'Student', icon: GraduationCap, desc: 'Learn & grow' },
  ];

  return (
    <div className="min-h-screen flex font-sans relative overflow-hidden" style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}>
      {faceAuthMode && (
        <FaceAuthModal
          mode={faceAuthMode}
          onSuccess={handleFaceAuthSuccess}
          onCancel={handleFaceAuthCancel}
          isLoading={isProcessingFace}
          avatarUrl={userAvatar}
          externalError={faceAuthError}
        />
      )}

      {/* Session Confirmation Modal */}
      <AnimatePresence>
        {showSessionConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#530AD915' }}>
                <svg className="w-7 h-7" style={{ color: BRAND.violet }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Active Session Detected</h3>
              <p className="text-sm text-slate-500 mb-6">
                There is an active session on another device. Do you want to end it and login here?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSessionConfirmCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSessionConfirmLogin}
                  className="flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition shadow-md"
                  style={{ backgroundColor: BRAND.violet, boxShadow: `0 10px 25px -5px ${BRAND.violet}66` }}
                >
                  Login Here
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== LEFT BRAND PANEL ===== */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden text-white">
        {/* Deep purple gradient backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${BRAND.indigo} 0%, ${BRAND.violet} 55%, #7B3FE4 100%)` }}
        />
        {/* Glow blobs */}
        <motion.div
          animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-16 -right-10 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 -left-16 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl"
        />
        {/* Dotted grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 0.7px, transparent 0.7px)',
            backgroundSize: '26px 26px',
          }}
        />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-xl">
            <img src="/assets/logo-codvedha-icon.png" alt="CodVedha" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight">CodVedha</span>
            <span className="block text-[13px] text-purple-100/80 font-medium">Learning Management System</span>
          </div>
        </div>

        {/* Headline + feature cards */}
        <div className="relative z-10 my-auto max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold leading-tight"
          >
            Learn smarter.
            <span className="block text-purple-200">Grow faster.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-purple-50/80 text-sm leading-relaxed"
          >
            One platform for courses, live classes, quizzes and verified certificates —
            built for students, faculty and administrators.
          </motion.p>

          <div className="mt-8 space-y-3">
            {[
              { icon: Layers, title: 'Structured Courses', text: 'Cohort-based curriculum & materials' },
              { icon: Zap, title: 'Live & Interactive', text: 'Classes, quizzes and instant grading' },
              { icon: ShieldCheck, title: 'Secure Access', text: 'Face verification & session control' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3"
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-purple-50/70">{f.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="relative z-10 text-xs text-purple-100/60">
          &copy; {new Date().getFullYear()} CodVedha Edtech LLP.
        </div>
      </div>

      {/* ===== RIGHT FORM PANEL ===== */}
      <div className="w-full lg:w-[54%] flex items-center justify-center p-6 md:p-12 relative" style={{ backgroundColor: '#ffffff' }}>
        {/* subtle background accents */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: '#530AD914' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: '#28019210' }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: BRAND.violet }}>
              <img src="/assets/logo-codvedha-icon.png" alt="CodVedha" className="w-8 h-8 object-contain brightness-0 invert" />
            </div>
            <span className="text-2xl font-extrabold text-slate-800">Cod<span style={{ color: BRAND.violet }}>Vedha</span></span>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1.5">Sign in to continue to your dashboard</p>
          </div>

          {/* Role selector with animated highlight */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {roles.map(({ key, label, icon: Icon, desc }) => {
              const active = selectedRole === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSelect(key)}
                  className="group relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 border transition-colors duration-300"
                  style={{
                    borderColor: active ? BRAND.violet : '#e2e8f0',
                    backgroundColor: active ? '#530AD90D' : '#ffffff',
                  }}
                >
                  {/* Animated active glow ring */}
                  {active && (
                    <motion.span
                      layoutId="roleActiveRing"
                      className="absolute inset-0 rounded-2xl"
                      style={{ boxShadow: `0 0 0 1.5px ${BRAND.violet}, 0 8px 20px -8px ${BRAND.violet}55` }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <motion.span
                    animate={{
                      backgroundColor: active ? BRAND.violet : '#f1f5f9',
                      color: active ? '#ffffff' : '#64748b',
                    }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.span>
                  <span
                    className="relative z-10 text-xs font-semibold transition-colors duration-300"
                    style={{ color: active ? BRAND.indigo : '#475569' }}
                  >
                    {label}
                  </span>
                  <span className="relative z-10 hidden md:block text-[10px] text-slate-400">{desc}</span>
                </button>
              );
            })}
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none text-slate-800 transition text-sm"
                  style={{ backgroundColor: '#f8fafc' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = BRAND.violet; e.currentTarget.style.boxShadow = `0 0 0 4px ${BRAND.violet}1a`; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <span className="text-red-500 text-xs mt-1 block">{errors.email?.message as string}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none text-slate-800 transition text-sm"
                  style={{ backgroundColor: '#f8fafc' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = BRAND.violet; e.currentTarget.style.boxShadow = `0 0 0 4px ${BRAND.violet}1a`; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-red-500 text-xs mt-1 block">{errors.password?.message as string}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-700">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="rounded border-slate-300 focus:ring-2 bg-slate-50"
                  style={{ accentColor: BRAND.violet }}
                />
                Remember me
              </label>
            </div>

            {/* Sign In Button with animated role label */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3.5 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 overflow-hidden"
              style={{
                background: `linear-gradient(90deg, ${BRAND.indigo}, ${BRAND.violet})`,
                boxShadow: `0 12px 25px -8px ${BRAND.violet}66`,
              }}
            >
              <span>Sign In as</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={selectedRole}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-bold"
                >
                  {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                </motion.span>
              </AnimatePresence>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-7 pt-5 border-t border-slate-100 flex flex-col items-center gap-3">
            <div className="flex gap-6 text-sm font-medium text-slate-400">
              {[
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
                { href: '/contact', label: 'Support' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="transition-colors"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = BRAND.violet; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = ''; }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <span className="text-xs text-slate-400">&copy; {new Date().getFullYear()} CodVedha Edtech LLP. All rights reserved</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
