"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

const LMSContext = createContext<any>(null);

export const LMSProvider = ({ children, skipAuthCheck = false }: { children: React.ReactNode; skipAuthCheck?: boolean }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search query on page navigation
  useEffect(() => {
    setSearchQuery('');
  }, [pathname]);

  // Theme State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lms-theme');
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync Theme HTML class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lms-theme', theme);
  }, [theme]);

  // Check auth on mount (skip on public pages like /privacy, /terms, /contact)
  useEffect(() => {
    if (skipAuthCheck) {
      setIsLoading(false);
      return;
    }
    const checkAuth = async () => {
      console.log('[LMSContext] checkAuth starting...');
      try {
        const res = await api.get('/auth/me');
        console.log('[LMSContext] checkAuth success:', res.data.data);
        setUser(res.data.data);
      } catch (error: any) {
        console.log('[LMSContext] checkAuth failed:', error.message || error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [skipAuthCheck]);

  // ── Media Playback State (pauses idle timer during video lectures) ────────
  const mediaPlayingRef = useRef(false);
  
  // Stable callback for components to signal media play/pause without triggering re-renders
  const setMediaPlaying = useCallback((playing: boolean) => {
    mediaPlayingRef.current = playing;
  }, []);

  // ── Idle Timeout: Auto-logout after 15 min of inactivity ───────────────────
  useEffect(() => {
    if (!user) return; // Only track when logged in

    const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    let idleTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        // Don't logout if user is watching a video/lecture
        if (mediaPlayingRef.current) return;
        // Auto-logout on idle
        console.log('[LMSContext] Idle timeout — auto logging out');
        setUser(null);
        sessionStorage.removeItem('lms-token');
        api.post('/auth/logout').catch(() => {});
        router.push('/login');
      }, IDLE_TIMEOUT);
    };

    // Events that count as "activity"
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Start the timer
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, router]);

  // ── Session Heartbeat: Instantly detect force-logout from another device ────
  useEffect(() => {
    if (!user) return;

    const SESSION_CHECK_INTERVAL = 2 * 60 * 1000; // Check every 2 minutes

    const checkSession = async () => {
      try {
        await api.get('/auth/me');
      } catch (err: any) {
        // If we get FORCE_LOGOUT or 401, the interceptor in api.ts handles redirect
        // No action needed here — the response interceptor does the job
      }
    };

    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: any, password: any, selectedRole?: string, rememberMe?: boolean, forceLogin?: boolean) => {
    console.log('[LMSContext] login starting for:', email, 'role:', selectedRole, 'rememberMe:', rememberMe);
    try {
      const expectedRole = selectedRole ? (selectedRole.toUpperCase() === 'FACULTY' ? 'TEACHER' : selectedRole.toUpperCase()) : undefined;
      const res = await api.post('/auth/login', { email, password, role: expectedRole, rememberMe, forceLogin });
      console.log('[LMSContext] login success:', res.data.data);
      
      const data = res.data.data;

      // Handle active session confirmation
      if (data.requireSessionConfirmation) {
        return { status: 'REQUIRE_SESSION_CONFIRM', message: data.message };
      }

      const user = data.user;

      // Handle intermediate states for Faculty face auth
      if (data.requireFaceEnrollment) {
        return { status: 'REQUIRE_FACE_ENROLL', tempToken: data.tempToken, avatar: data.avatar };
      }
      
      if (data.requireFaceVerification) {
        return { status: 'REQUIRE_FACE_VERIFY', tempToken: data.tempToken, avatar: data.avatar };
      }

      const role = user.role; // 'ADMIN', 'TEACHER', 'STUDENT'
      
      // Enforce selected role matching
      if (selectedRole) {
        if (role !== expectedRole) {
          toast.error(`Access denied: This account is not registered as ${selectedRole}.`);
          return { status: 'ERROR' };
        }
      }

      // Store token in sessionStorage (clears when tab/browser closes)
      sessionStorage.setItem('lms-token', data.accessToken);
      setUser(user);
      toast.success(`Welcome back, ${user.name}!`);
      
      console.log('[LMSContext] Routing for role:', role);
      if (role === 'ADMIN') {
        router.push('/');
      } else if (role === 'TEACHER') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
      
      return { status: 'SUCCESS' };
    } catch (error: any) {
      console.log('[LMSContext] login failed:', error.message || error);
      toast.error(error.response?.data?.message || 'Login failed');
      return { status: 'ERROR' };
    }
  };

  const enrollFace = async (tempToken: string, embedding: number[], imageBase64?: string) => {
    try {
      const res = await api.post('/auth/face-enroll', { tempToken, embedding, imageBase64 });
      const user = res.data.data.user;
      
      sessionStorage.setItem('lms-token', res.data.data.accessToken);
      setUser(user);
      toast.success('Face registered successfully!');
      router.push('/teacher/dashboard');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Face enrollment failed' };
    }
  };

  const verifyFace = async (tempToken: string, embedding: number[]) => {
    try {
      const res = await api.post('/auth/face-verify', { tempToken, embedding });
      const user = res.data.data.user;
      
      sessionStorage.setItem('lms-token', res.data.data.accessToken);
      setUser(user);
      toast.success('Face verified successfully!');
      router.push('/teacher/dashboard');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Face verification failed' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      sessionStorage.removeItem('lms-token');
      toast.success('Logged out successfully!');
      router.push('/login');
    } catch (error) {
      setUser(null);
      sessionStorage.removeItem('lms-token');
      router.push('/login');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    toast.success(`Switched to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, {
      style: {
        background: theme === 'light' ? '#1E293B' : '#FFFFFF',
        color: theme === 'light' ? '#FFFFFF' : '#1E293B',
      }
    });
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch (e) {}
  };

  // Helper properties so existing code doesn't crash completely while we migrate
  // (We will phase these out as we refactor screens)
  const activeRole = user?.role === 'TEACHER' ? 'faculty' : (user?.role?.toLowerCase() || 'student');

  return (
    <LMSContext.Provider value={{
      theme,
      toggleTheme,
      user,
      isLoading,
      login,
      enrollFace,
      verifyFace,
      logout,
      activeRole,
      refreshUser,
      searchQuery,
      setSearchQuery,
      setMediaPlaying,
    }}>
      {children}
    </LMSContext.Provider>
  );
};

export const useLMS = () => useContext(LMSContext);
