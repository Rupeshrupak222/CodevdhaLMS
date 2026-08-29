"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Splash = ({ onComplete }: { onComplete: () => void }) => {
 const [progress, setProgress] = useState(0);
 const [isVisible, setIsVisible] = useState(true);
 const [mounted, setMounted] = useState(false);
 const [particles, setParticles] = useState<any[]>([]);

 useEffect(() => {
   setMounted(true);
   setParticles(
     Array.from({ length: 30 }, (_, i) => ({
       id: i,
       x: Math.random() * 100,
       y: Math.random() * 100,
       size: 2 + Math.random() * 4,
       duration: 3 + Math.random() * 4,
       delay: Math.random() * 2,
     }))
   );
 }, []);

 useEffect(() => {
 if (mounted) {
   const interval = setInterval(() => {
     setProgress((prev) => {
       if (prev >= 100) {
         clearInterval(interval);
         setTimeout(() => {
           setIsVisible(false);
           setTimeout(() => {
             onComplete();
           }, 500);
         }, 400);
         return 100;
       }
       return prev + 4;
     });
   }, 110);

   return () => clearInterval(interval);
 }
 }, [onComplete, mounted]);

 // Animated book pages
 const bookPages = [
 { id: 1, rotate: 0, delay: 0 },
 { id: 2, rotate: 5, delay: 0.3 },
 { id: 3, rotate: -5, delay: 0.6 },
 { id: 4, rotate: 8, delay: 0.9 },
 ];

 return (
 <AnimatePresence>
 {isVisible && (
 <motion.div
 initial={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.8, ease: 'easeInOut' }}
 className="fixed inset-0 flex flex-col items-center justify-center z-50 select-none overflow-hidden"
 style={{
 backgroundImage: 'url("/assets/community.jpeg")',
 backgroundSize: 'cover',
 backgroundPosition: 'center',
 }}
 >
 {/* Dark overlay */}
<div className="absolute inset-0 bg-gradient-to-br from-[#0F172A]/50 via-[#1E293B]/60 to-[#0F172A]/50 backdrop-blur-sm" /> 
 {/* Warm accent overlay */}
 <div className="absolute inset-0 bg-[#a855f7]/5" />

 {/* ===== ANIMATED BACKGROUND ELEMENTS ===== */}
 <div className="absolute inset-0 overflow-hidden">
 
 {/* Floating Particles */}
 {particles.map((particle) => (
 <motion.div
 key={particle.id}
 className="absolute rounded-full bg-[#a855f7]"
 style={{
 left: `${particle.x}%`,
 top: `${particle.y}%`,
 width: particle.size,
 height: particle.size,
 }}
 animate={{
 y: [0, -100, 0],
 x: [0, 30, -20, 0],
 opacity: [0, 0.8, 0],
 scale: [0, 1.5, 0],
 }}
 transition={{
 duration: particle.duration,
 delay: particle.delay,
 repeat: Infinity,
 ease: 'easeInOut',
 }}
 />
 ))}

 {/* Animated Book Pages */}
 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] opacity-5">
 {bookPages.map((page) => (
 <motion.div
 key={page.id}
 className="absolute inset-0 border-2 border-[#a855f7] rounded-lg"
 style={{
 transformOrigin: 'left center',
 }}
 animate={{
 rotateY: [0, 180, 360],
 opacity: [0, 0.5, 0],
 }}
 transition={{
 duration: 4,
 delay: page.delay,
 repeat: Infinity,
 ease: 'easeInOut',
 }}
 />
 ))}
 </div>

 {/* Animated Network Lines */}
 <svg className="absolute inset-0 w-full h-full opacity-10">
 {[0, 1, 2, 3, 4].map((i) => (
 <motion.line
 key={i}
 x1={`${10 + i * 20}%`}
 y1={`${10 + i * 15}%`}
 x2={`${80 - i * 15}%`}
 y2={`${80 - i * 20}%`}
 stroke="#a855f7"
 strokeWidth="1"
 initial={{ opacity: 0 }}
 animate={{
 opacity: [0, 0.5, 0],
 strokeDasharray: ['0 100', '100 0', '0 100'],
 }}
 transition={{
 duration: 5,
 delay: i * 0.5,
 repeat: Infinity,
 ease: 'easeInOut',
 }}
 />
 ))}
 </svg>

 {/* Floating Orbs */}
 {[
 { x: 10, y: 15, size: 200, delay: 0 },
 { x: 75, y: 70, size: 250, delay: 2 },
 { x: 50, y: 50, size: 300, delay: 4 },
 ].map((orb, index) => (
 <motion.div
 key={`orb-${index}`}
 className="absolute rounded-full bg-[#a855f7]"
 style={{
 width: orb.size,
 height: orb.size,
 left: `${orb.x}%`,
 top: `${orb.y}%`,
 filter: 'blur(80px)',
 opacity: 0.05,
 }}
 animate={{
 x: [0, 30, -20, 0],
 y: [0, -20, 30, 0],
 scale: [1, 1.2, 0.8, 1],
 }}
 transition={{
 duration: 10 + index * 2,
 delay: orb.delay,
 repeat: Infinity,
 ease: 'easeInOut',
 }}
 />
 ))}

 {/* Animated Bookshelf */}
 <motion.div
 className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#a855f7]/20 to-transparent"
 animate={{
 scaleX: [0.5, 1, 0.5],
 opacity: [0.3, 0.8, 0.3],
 }}
 transition={{
 duration: 4,
 repeat: Infinity,
 ease: 'easeInOut',
 }}
 />

 {/* Sparkle Animation */}
 {[0, 1, 2, 3].map((i) => (
 <motion.div
 key={`sparkle-${i}`}
 className="absolute w-1 h-1 bg-[#a855f7] rounded-full"
 style={{
 left: `${20 + i * 20}%`,
 top: `${10 + i * 25}%`,
 }}
 animate={{
 scale: [0, 2, 0],
 opacity: [0, 1, 0],
 x: [0, 20, 0],
 y: [0, -20, 0],
 }}
 transition={{
 duration: 2.5,
 delay: i * 0.8,
 repeat: Infinity,
 ease: 'easeInOut',
 }}
 />
 ))}
 </div>

 {/* ===== MAIN CONTENT ===== */}
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.8, ease: 'easeOut' }}
 className="flex flex-col items-center max-w-md px-6 text-center z-10"
 >
 {/* Logo Container */}
 <motion.div
 animate={{ 
 y: [0, -10, 0],
 }}
 transition={{ 
 y: { duration: 2.5, ease: "easeInOut", repeat: Infinity },
 }}
 className="relative"
 >
 {/* Outer rotating rings */}
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
 className="absolute -inset-4 border border-[#a855f7]/30 rounded-full"
 />
 <motion.div
 animate={{ rotate: -360 }}
 transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
 className="absolute -inset-8 border border-[#a855f7]/20 rounded-full"
 />
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
 className="absolute -inset-12 border border-[#a855f7]/10 rounded-full"
 />
 <motion.div
 animate={{ rotate: -360 }}
 transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
 className="absolute -inset-16 border border-[#a855f7]/5 rounded-full"
 />

 {/* Pulsing glow behind logo */}
 <motion.div
 className="absolute inset-0 bg-[#a855f7]/20 rounded-full blur-2xl"
 animate={{
 scale: [1, 1.3, 1],
 opacity: [0.3, 0.6, 0.3],
 }}
 transition={{
 duration: 2,
 repeat: Infinity,
 ease: 'easeInOut',
 }}
 />

 {/* Logo Image */}
 <div className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl shadow-[#a855f7]/30 overflow-hidden">
 {/* Animated gradient overlay */}
 <motion.div
 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
 animate={{
 x: ['-100%', '200%'],
 }}
 transition={{
 duration: 3,
 repeat: Infinity,
 ease: 'easeInOut',
 }}
 />
 
 {/* Logo Image */}
 <img 
 src="/assets/logo-codvedha.png" 
 alt="CodVedha Logo"
 className="w-full h-full object-cover bg-transparent relative z-10 "
 onError={(e) => {
 // Fallback if image doesn't load
 (e.target as HTMLImageElement).style.display = 'none';
 }}
 />
</div>
</motion.div>

 {/* Brand Name */}
 <motion.h1 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="text-5xl font-bold mt-6 bg-gradient-to-r from-white via-[#c084fc] to-orange-400 bg-clip-text text-transparent"
 >
 CodVedha
 </motion.h1>
 
 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.4 }}
 className="text-white/60 text-sm font-medium mt-1 "
 >
 Learning Management System
 </motion.p>

 {/* Loading Section */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.5 }}
 className="mt-10 w-full max-w-xs"
 >
 {/* Progress Bar */}
 <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
 <motion.div
 className="h-full bg-gradient-to-r from-[#a855f7] to-orange-500 rounded-full shadow-lg shadow-[#a855f7]/30"
 initial={{ width: '0%' }}
 animate={{ width: `${progress}%` }}
 transition={{ ease: 'easeInOut' }}
 />
 {/* Glow trail */}
 <motion.div
 className="absolute top-0 h-full w-16 bg-gradient-to-l from-[#a855f7]/50 to-transparent"
 style={{ 
 left: `${progress - 10}%`,
 opacity: progress > 10 ? 1 : 0
 }}
 />
 </div>

 {/* Loading Status */}
 <div className="flex items-center justify-between mt-3">
 <motion.span 
 className="text-[16px] text-white/50 font-medium"
 animate={{ opacity: [0.5, 1, 0.5] }}
 transition={{ duration: 1.5, repeat: Infinity }}
 >
 Preparing your learning experience
 </motion.span>
 <motion.span 
 className="text-[16px] font-semibold text-[#a855f7]"
 animate={{ scale: [1, 1.1, 1] }}
 transition={{ duration: 1, repeat: Infinity }}
 >
 {progress}%
 </motion.span>
 </div>
 </motion.div>

 {/* Bottom Text */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.7 }}
 className="absolute bottom-12"
 >
 <div className="flex items-center gap-3">
 <motion.div
 animate={{ 
 scale: [1, 1.3, 1],
 opacity: [0.3, 0.8, 0.3]
 }}
 transition={{ duration: 2, repeat: Infinity }}
 className="w-1 h-1 bg-[#a855f7] rounded-full"
 />
 <span className="text-[14px] text-white/30 font-medium uppercase">
 Empowering Education
 </span>
 <motion.div
 animate={{ 
 scale: [1, 1.3, 1],
 opacity: [0.3, 0.8, 0.3]
 }}
 transition={{ duration: 2, repeat: Infinity, delay: 1 }}
 className="w-1 h-1 bg-[#a855f7] rounded-full"
 />
 </div>
 </motion.div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 );
};
