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

  // Circular ring geometry
  const RADIUS = 66;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="fixed inset-0 flex flex-col items-center justify-center z-50 select-none overflow-hidden bg-[#FAF7FF]"
        >
          {/* Soft light gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAF7FF] via-[#F1EAFE] to-[#EDE6FD]" />

          {/* Dotted grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                'radial-gradient(#530AD9 0.6px, transparent 0.6px)',
              backgroundSize: '22px 22px',
              maskImage:
                'radial-gradient(circle at center, black 30%, transparent 78%)',
              WebkitMaskImage:
                'radial-gradient(circle at center, black 30%, transparent 78%)',
            }}
          />

          {/* Soft floating blobs */}
          {[
            { x: 12, y: 18, size: 260, color: '#c4b5fd', delay: 0 },
            { x: 72, y: 66, size: 300, color: '#a78bfa', delay: 2 },
            { x: 46, y: 42, size: 340, color: '#d8b4fe', delay: 4 },
          ].map((orb, index) => (
            <motion.div
              key={`orb-${index}`}
              className="absolute rounded-full"
              style={{
                width: orb.size,
                height: orb.size,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
                background: orb.color,
                filter: 'blur(90px)',
                opacity: 0.35,
              }}
              animate={{
                x: [0, 30, -20, 0],
                y: [0, -20, 30, 0],
                scale: [1, 1.15, 0.9, 1],
              }}
              transition={{
                duration: 12 + index * 2,
                delay: orb.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Rising particles */}
          <div className="absolute inset-0 overflow-hidden">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: 'rgba(83, 10, 217, 0.4)',
                }}
                animate={{
                  y: [0, -80, 0],
                  opacity: [0, 0.7, 0],
                  scale: [0, 1.2, 0],
                }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* ===== MAIN CONTENT ===== */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center max-w-md px-6 text-center"
          >
            {/* Circular ring loader with logo in center */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Rotating gradient halo */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent, #530AD9, #7c3aed, transparent)',
                  filter: 'blur(14px)',
                  opacity: 0.5,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />

              {/* SVG progress ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  fill="none"
                  stroke="#530AD920"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  fill="none"
                  stroke="url(#ringGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ ease: 'easeInOut' }}
                />
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#280192" />
                    <stop offset="100%" stopColor="#530AD9" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center white disc with logo */}
              <motion.div
                className="relative w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(83,10,217,0.5)] overflow-hidden"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <img
                  src="/assets/logo-codvedha-icon.png"
                  alt="CodVedha Logo"
                  className="w-24 h-24 object-contain relative z-10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </motion.div>
            </div>

            {/* Brand Name */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-extrabold mt-8 tracking-tight text-slate-800"
            >
              Cod<span style={{ color: '#530AD9' }}>Vedha</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 text-sm font-medium mt-2 tracking-wide"
            >
              Learning Management System
            </motion.p>

            {/* Percentage + status */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-col items-center"
            >
              <span className="text-3xl font-bold tabular-nums" style={{ color: '#530AD9' }}>
                {progress}
                <span className="text-lg" style={{ color: 'rgba(83,10,217,0.7)' }}>%</span>
              </span>
              <motion.span
                className="text-xs text-slate-400 font-medium mt-2 tracking-wide"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Preparing your learning experience
              </motion.span>
            </motion.div>
          </motion.div>

          {/* Bottom tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="absolute bottom-10 z-10"
          >
            <div className="flex items-center gap-3">
              <span className="h-px w-8" style={{ backgroundColor: 'rgba(83,10,217,0.4)' }} />
              <span className="text-[12px] text-slate-400 font-semibold uppercase tracking-[0.2em]">
                Empowering Education
              </span>
              <span className="h-px w-8" style={{ backgroundColor: 'rgba(83,10,217,0.4)' }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
