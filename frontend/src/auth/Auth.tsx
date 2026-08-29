"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLMS } from '@/context/LMSContext';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const FaceAuthModal = dynamic(
  () => import('./FaceAuthModal').then((mod) => mod.FaceAuthModal),
  { ssr: false }
);

import {
 BookOpen, GraduationCap, UserCog, Sparkles,
 Mail, Lock, ArrowRight, Eye, EyeOff
} from 'lucide-react';

export const Auth = () => {
  const { login, enrollFace, verifyFace } = useLMS();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isOrbitPaused, setIsOrbitPaused] = useState(false);
  
  // Face Auth States
  const [faceAuthMode, setFaceAuthMode] = useState<'enroll' | 'verify' | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isProcessingFace, setIsProcessingFace] = useState(false);
  const [faceAuthError, setFaceAuthError] = useState<string | null>(null);

 const {
 register,
 handleSubmit,
 setValue,
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
      // Show confirmation popup
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

 const handleRoleSelect = (role) => {
 setSelectedRole(role);
 };

 const roleConfig = {
 admin: {
 color: 'from-[#a855f7] to-orange-500',
 shadowColor: 'shadow-[#a855f7]/40',
 borderColor: 'border-[#a855f7]/30',
 hoverBorder: 'hover:border-[#a855f7]',
 iconColor: 'text-[#a855f7]',
 bgActive: 'bg-gradient-to-br from-[#a855f7] to-orange-500',
 },
 faculty: {
 color: 'from-sky-400 to-blue-500',
 shadowColor: 'shadow-sky-400/40',
 borderColor: 'border-sky-300/30',
 hoverBorder: 'hover:border-sky-400',
 iconColor: 'text-sky-500',
 bgActive: 'bg-gradient-to-br from-sky-400 to-blue-500',
 },
 student: {
 color: 'from-emerald-400 to-emerald-500',
 shadowColor: 'shadow-emerald-400/40',
 borderColor: 'border-emerald-300/30',
 hoverBorder: 'hover:border-emerald-400',
 iconColor: 'text-emerald-500',
 bgActive: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
 }
 };

 return (
 <div className="h-screen flex bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFFBF5] overflow-hidden relative font-sans">
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
 {showSessionConfirm && (
   <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
     <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
       <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
         <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
         </svg>
       </div>
       <h3 className="text-lg font-bold text-slate-900 mb-2">Active Session Detected</h3>
       <p className="text-sm text-slate-600 mb-6">
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
           className="flex-1 px-4 py-2.5 rounded-xl bg-[#a855f7] text-white font-medium hover:bg-[#e6a800] transition shadow-md"
         >
           Login Here
         </button>
       </div>
     </div>
   </div>
 )}
 {/* Decorative Background Elements */}
 <div className="absolute top-0 right-0 md:w-96 md:h-96 w-full h-full bg-[#a855f7]/10 rounded-full blur-3xl" />
 <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#a855f7]/5 rounded-full blur-3xl" />
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a855f7]/[0.03] rounded-full blur-2xl" />

 {/* LEFT SIDE - Illustration & Brand */}
 <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#a855f7]/10 via-[#FFF8F0] to-white relative overflow-hidden">
 {/* Animated floating elements */}
 <motion.div
 animate={{ y: [0, -20, 0], rotate: [0, 360, 0] }}
 transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
 className="absolute top-20 right-20 w-40 h-40 bg-[#a855f7]/20 rounded-full blur-3xl"
 />
 <motion.div
 animate={{ y: [0, 20, 0] }}
 transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
 className="absolute bottom-40 left-10 w-56 h-56 bg-[#a855f7]/10 rounded-full blur-3xl"
 />
 <motion.div
 animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
 transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#a855f7]/5 rounded-full blur-2xl"
 />

 {/* Brand */}
 <div className="flex items-center gap-3 z-10">
 <div className="w-12 h-12 rounded-2xl bg-[#a855f7] flex items-center justify-center shadow-lg shadow-[#a855f7]/30">
 <GraduationCap className="w-6 h-6 text-white" />
 </div>
 <div>
 <span className="text-2xl font-semibold text-[#222222]">CODVEDHA</span>
 <span className="block text-[16px] text-[#666666] font-medium">Learning Management System</span>
 </div>
 </div>

 {/* Main Illustration with Role Selection */}
 <div className="my-auto z-10 max-w-lg mx-auto">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.7 }}
 className="relative"
 >
 {/* Hero Image/Animation with Roles */}
 <div className="relative">
 <div className="w-full aspect-square max-w-md mx-auto">
 <div className="w-full h-full relative">
 {/* Decorative circles */}
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
 className="absolute inset-0 border-2 border-[#a855f7]/20 rounded-full"
 />
 <motion.div
 animate={{ rotate: -360 }}
 transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
 className="absolute inset-8 border-2 border-[#a855f7]/10 rounded-full"
 />

 {/* Center Logo */}
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-48 h-48 rounded-full bg-[#a855f7]/10 flex items-center justify-center">
 <div className="w-40 h-40 rounded-full bg-[#a855f7]/20 flex items-center justify-center">
 <div className="w-32 h-32 rounded-full bg-[#a855f7] flex items-center justify-center shadow-2xl shadow-[#a855f7]/30 overflow-hidden">
 <img
 src="/assets/logo-codvedha.png"
 alt="CodVedha Logo"
 className="w-full h-full object-contain p-4 bg-white"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Orbiting Role Circles */}
 <div
   className="absolute inset-0"
   onMouseEnter={() => setIsOrbitPaused(true)}
   onMouseLeave={() => setIsOrbitPaused(false)}
   style={{
     animation: 'spin 12s linear infinite',
     animationPlayState: isOrbitPaused ? 'paused' : 'running',
   }}
 >
   {/* Admin Role Circle - positioned at top (0 degrees) */}
   <motion.button
     whileHover={{ scale: 1.15 }}
     whileTap={{ scale: 0.95 }}
     onClick={() => handleRoleSelect('admin')}
     style={{
       position: 'absolute',
       top: '2%',
       left: '30%',
       transform: 'translate(-50%, -50%)',
     }}
     className={`w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-lg ${selectedRole === 'admin'
       ? `${roleConfig.admin.bgActive} ${roleConfig.admin.shadowColor} scale-110`
       : `bg-white border-2 ${roleConfig.admin.borderColor} ${roleConfig.admin.hoverBorder}`
     }`}
   >
     <div
       className="flex flex-col items-center justify-center"
       style={{
         animation: 'counter-spin 12s linear infinite',
         animationPlayState: isOrbitPaused ? 'paused' : 'running',
       }}
     >
       <UserCog className={`w-7 h-7 ${selectedRole === 'admin' ? 'text-white' : roleConfig.admin.iconColor}`} />
       <span className={`text-[10px] font-semibold mt-0.5 ${selectedRole === 'admin' ? 'text-white' : 'text-[#222222]'}`}>
         Admin
       </span>
     </div>
     {selectedRole === 'admin' && (
       <motion.div
         initial={{ scale: 0 }}
         animate={{ scale: 1 }}
         className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg"
       >
         <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
         </svg>
       </motion.div>
     )}
   </motion.button>

   {/* Faculty Role Circle - positioned at 120 degrees (bottom-left) */}
   <motion.button
     whileHover={{ scale: 1.15 }}
     whileTap={{ scale: 0.95 }}
     onClick={() => handleRoleSelect('faculty')}
     style={{
       position: 'absolute',
       top: '75%',
       left: '8%',
       transform: 'translate(-50%, -50%)',
     }}
     className={`w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-lg ${selectedRole === 'faculty'
       ? `${roleConfig.faculty.bgActive} ${roleConfig.faculty.shadowColor} scale-110`
       : `bg-white border-2 ${roleConfig.faculty.borderColor} ${roleConfig.faculty.hoverBorder}`
     }`}
   >
     <div
       className="flex flex-col items-center justify-center"
       style={{
         animation: 'counter-spin 12s linear infinite',
         animationPlayState: isOrbitPaused ? 'paused' : 'running',
       }}
     >
       <BookOpen className={`w-7 h-7 ${selectedRole === 'faculty' ? 'text-white' : roleConfig.faculty.iconColor}`} />
       <span className={`text-[10px] font-semibold mt-0.5 ${selectedRole === 'faculty' ? 'text-white' : 'text-[#222222]'}`}>
         Faculty
       </span>
     </div>
     {selectedRole === 'faculty' && (
       <motion.div
         initial={{ scale: 0 }}
         animate={{ scale: 1 }}
         className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg"
       >
         <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
         </svg>
       </motion.div>
     )}
   </motion.button>

   {/* Student Role Circle - positioned at 240 degrees (bottom-right) */}
   <motion.button
     whileHover={{ scale: 1.15 }}
     whileTap={{ scale: 0.95 }}
     onClick={() => handleRoleSelect('student')}
     style={{
       position: 'absolute',
       top: '75%',
       right: '8%',
       transform: 'translate(50%, -50%)',
     }}
     className={`w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-lg ${selectedRole === 'student'
       ? `${roleConfig.student.bgActive} ${roleConfig.student.shadowColor} scale-110`
       : `bg-white border-2 ${roleConfig.student.borderColor} ${roleConfig.student.hoverBorder}`
     }`}
   >
     <div
       className="flex flex-col items-center justify-center"
       style={{
         animation: 'counter-spin 12s linear infinite',
         animationPlayState: isOrbitPaused ? 'paused' : 'running',
       }}
     >
       <GraduationCap className={`w-7 h-7 ${selectedRole === 'student' ? 'text-white' : roleConfig.student.iconColor}`} />
       <span className={`text-[10px] font-semibold mt-0.5 ${selectedRole === 'student' ? 'text-white' : 'text-[#222222]'}`}>
         Student
       </span>
     </div>
     {selectedRole === 'student' && (
       <motion.div
         initial={{ scale: 0 }}
         animate={{ scale: 1 }}
         className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg"
       >
         <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
         </svg>
       </motion.div>
     )}
   </motion.button>
 </div>

 </div>
 </div>
 </div>

 {/* Tagline */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.3 }}
 className="text-center mt-8"
 >
 <h2 className="text-3xl font-semibold text-[#222222]">
 Transform Learning with
 <span className="text-[#a855f7] block mt-1">CODVEDHA</span>
 </h2>
 
 </motion.div>

 
 </motion.div>
 </div>


 </div>

 {/* RIGHT SIDE - Login Form */}
 <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-2 md:p-12">
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5 }}
 className="w-full max-w-md bg-white/80 backdrop-blur-xl p-4 lg:p-8 rounded-2xl border border-[#a855f7]/60 shadow-2xl shadow-[#a855f7]/5"
 >
  {/* Header */}
  <div className="mb-2">
    {/* Mobile Logo */}
    <div className=" flex items-center justify-center gap-2 mb-4 lg:mb-8">
      <img src="/assets/logo-codvedha.png" alt="CodVedha Logo" className="h-16 w-auto object-contain drop-shadow-md" />
      <span className={`text-3xl font-extrabold tracking-tight ${selectedRole === 'faculty' ? 'text-indigo-400' : selectedRole === 'student' ? 'text-emerald-500' : 'text-[#a855f7]'}`}>
        CODVEDHA <sub className="text-sm font-semibold text-[#666666]">LMS Portal</sub>
      </span>
      
    </div>

    <div className="flex items-center gap-2 mb-2">
      <Sparkles className={`w-5 h-5 ${selectedRole === 'faculty' ? 'text-indigo-400' : selectedRole === 'student' ? 'text-emerald-500' : 'text-[#a855f7]'}`} />
      <span className={`text-[16px] font-semibold uppercase ${selectedRole === 'faculty' ? 'text-indigo-400' : selectedRole === 'student' ? 'text-emerald-500' : 'text-[#a855f7]'}`}>
        Welcome Back
      </span>
    </div>
    <h3 className="text-2xl font-semibold text-[#222222]">
      Sign in to your account
    </h3>
    <p className="text-[#666666] text-sm mt-1">
      Choose your role and access your personalized dashboard
    </p>
  </div>

 {/* Mobile Role Selector */}
 <div className="mb-6 lg:hidden">
 <label className="block text-sm font-medium text-gray-700 mb-3">
 Select Your Role
 </label>

 <div className="flex gap-2">
 {[
 { role: "admin", color: "bg-[#a855f7]", activeText: "text-white", activeBorder: "border-[#a855f7]" },
 { role: "faculty", color: "bg-indigo-400", activeText: "text-white", activeBorder: "border-sky-500" },
 { role: "student", color: "bg-emerald-500", activeText: "text-white", activeBorder: "border-emerald-500" }
 ].map(({ role, color, activeText, activeBorder }) => (
 <button
 key={role}
 type="button"
 onClick={() => handleRoleSelect(role)}
 className={`flex-1 py-3 cursor-pointer rounded-full border transition-all font-medium text-sm ${selectedRole === role
 ? `${color} ${activeText} ${activeBorder}`
 : "bg-white text-gray-700 border-gray-300 hover:border-[#a855f7]"
 }`}
 >
 {role.charAt(0).toUpperCase() + role.slice(1)}
 </button>
 ))}
 </div>
 </div>

 {/* Login Form */}
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div>
 <label className="block text-[16px] font-semibold text-[#555555] mb-2">
 <Mail className="w-3 h-3 inline mr-1" /> Email Address
 </label>
 <input
 id="email"
 type="email"
 autoComplete="username"
 {...register('email', { required: 'Email is required' })}
 className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 focus:outline-none text-[#222222] transition text-sm"
 placeholder="Enter your email"
 />
 {errors.email && (
 <span className="text-red-500 text-[16px] mt-1 block">{errors.email?.message as string}</span>
 )}
 </div>

 <div>
 <label className="block text-[16px] font-semibold text-[#555555] mb-2">
 <Lock className="w-3 h-3 inline mr-1" /> Password
 </label>
 <div className="relative">
 <input
 id="password"
 type={showPassword ? "text" : "password"}
 autoComplete="current-password"
 {...register('password', { required: 'Password is required' })}
 className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 focus:outline-none text-[#222222] transition text-sm pr-12"
 placeholder="Enter your password"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#a855f7] transition cursor-pointer"
 >
 {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
 </button>
 </div>
 {errors.password && (
 <span className="text-red-500 text-[16px] mt-1 block">{errors.password?.message as string}</span>
 )}
 </div>

 <div className="flex items-center justify-between text-[16px] pt-1">
 <label className="flex items-center gap-2 cursor-pointer text-[#666666] hover:text-[#222222]">
 <input
 type="checkbox"
 {...register('rememberMe')}
 className="rounded border-gray-300 text-[#a855f7] focus:ring-[#a855f7]/20 focus:ring-2 bg-gray-50"
 />
 Remember me
 </label>
 </div>

 {/* Sign In Button */}
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 type="submit"
 className={`w-full py-3.5 bg-gradient-to-r text-white font-semibold rounded-xl transition shadow-lg text-sm mt-4 flex items-center justify-center gap-2 ${
  selectedRole === 'faculty' 
    ? 'from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-500 shadow-sky-500/25' 
    : selectedRole === 'student' 
    ? 'from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/25' 
    : 'from-[#a855f7] to-orange-500 hover:from-orange-500 hover:to-[#a855f7] shadow-[#a855f7]/25'
}`}
 >
 <span>Sign In</span>
 <ArrowRight className="w-4 h-4" />
 </motion.button>
 </form>

 {/* Footer inside login box */}
 <div className="pt-5 border-t border-gray-100 flex flex-col items-center gap-3">
    <div className="flex gap-6 text-sm font-medium text-gray-500">
      <Link href="/privacy" className="hover:text-[#a855f7] transition">Privacy</Link>
      <Link href="/terms" className="hover:text-[#a855f7] transition">Terms</Link>
      <Link href="/contact" className="hover:text-[#a855f7] transition">Support</Link>
    </div>
   <span className="text-xs text-gray-400">&copy; {new Date().getFullYear()} CodVedha Edutech Pvt. Ltd. All rights reserved</span>
 </div>
 </motion.div>
 
 </div>
 </div>
 );
};
