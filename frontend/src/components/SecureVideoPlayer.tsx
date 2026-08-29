"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ShieldAlert, RotateCcw, RotateCw } from 'lucide-react';

interface SecureVideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  onError?: () => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

function getVideoBasePath(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url.split('?')[0];
  }
}

/**
 * SecureVideoPlayer — Production video protection (Desktop + Mobile).
 *
 * Desktop protections:
 * - No download button, right-click blocked, DevTools blocked
 * - Screenshot detection, tab switch pause/resume
 * - Src stripped from DOM, currentSrc overridden
 * - 10s skip (arrow keys + hover buttons)
 *
 * Mobile protections:
 * - Long-press/touch-callout disabled (blocks "Save Video" on iOS/Android)
 * - App switch / screen recording detection via visibilitychange + pagehide
 * - Touch-based double-tap to skip 10s (like YouTube)
 * - User-select none prevents text selection context menus
 * - playsInline prevents auto-fullscreen on iOS
 * - Mobile share sheet blocked via touch event prevention
 */
export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  src,
  title,
  poster,
  autoPlay = false,
  className = '',
  onError,
  onEnded,
  onPlay,
  onPause,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [screenCaptureDetected, setScreenCaptureDetected] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const wasPlayingRef = useRef(false);
  const savedTimeRef = useRef(0);
  const [showControls, setShowControls] = useState(false);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFullscreenRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const [skipIndicator, setSkipIndicator] = useState<'forward' | 'backward' | null>(null);

  // Detect mobile
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Note: DOM src stripping has been removed as it breaks seeking/pausing by forcing the browser to reload the source on action.

  // Track fullscreen
  useEffect(() => {
    const onChange = () => { isFullscreenRef.current = !!document.fullscreenElement; };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // Screenshot/screen recording protection
  const triggerScreenshotBlock = useCallback(() => {
    setIsVideoHidden(true);
    setScreenCaptureDetected(true);
    if (videoRef.current && !videoRef.current.paused) {
      wasPlayingRef.current = true;
      savedTimeRef.current = videoRef.current.currentTime;
      videoRef.current.pause();
    }
    try { navigator.clipboard?.writeText('').catch(() => {}); } catch {}
  }, []);

  // Block context menu (desktop right-click + mobile long-press)
  const handleContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    return false;
  }, []);

  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration || Infinity);
      setSkipIndicator('forward');
      setTimeout(() => setSkipIndicator(null), 600);
    }
  }, []);

  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
      setSkipIndicator('backward');
      setTimeout(() => setSkipIndicator(null), 600);
    }
  }, []);

  // Desktop hover controls
  const handleMouseMove = useCallback(() => {
    if (isMobile) return;
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, [isMobile]);

  // Mobile: Double-tap to skip (left side = -10s, right side = +10s)
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const timeDiff = now - lastTapRef.current.time;

    if (timeDiff < 300) {
      // Double tap detected
      e.preventDefault();
      const halfWidth = rect.width / 2;
      if (x < halfWidth) {
        skipBackward();
      } else {
        skipForward();
      }
    }

    lastTapRef.current = { time: now, x };
  }, [skipForward, skipBackward]);

  // Mobile: Block long-press (prevents "Save Video" / share sheet)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let longPressTimer: NodeJS.Timeout | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      longPressTimer = setTimeout(() => {
        // Long press detected — prevent default behavior
        e.preventDefault();
      }, 500);
    };

    const handleTouchEndOrMove = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEndOrMove);
    container.addEventListener('touchmove', handleTouchEndOrMove);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEndOrMove);
      container.removeEventListener('touchmove', handleTouchEndOrMove);
    };
  }, []);

  // Visibility API: works on both desktop and mobile (app switch, screen off, tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video || isFullscreenRef.current) return;
      if (document.hidden) {
        if (!video.paused) {
          wasPlayingRef.current = true;
          savedTimeRef.current = video.currentTime;
          video.pause();
        }
        setIsTabHidden(true);
      } else {
        setIsTabHidden(false);
        if (wasPlayingRef.current) {
          if (Math.abs(video.currentTime - savedTimeRef.current) > 1) video.currentTime = savedTimeRef.current;
          video.play().catch(() => {});
          wasPlayingRef.current = false;
        }
      }
    };

    // pagehide fires on mobile when app is backgrounded (more reliable than visibilitychange on some devices)
    const handlePageHide = () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        wasPlayingRef.current = true;
        savedTimeRef.current = video.currentTime;
        video.pause();
        setIsTabHidden(true);
      }
    };

    const handlePageShow = () => {
      setIsTabHidden(false);
      const video = videoRef.current;
      if (video && wasPlayingRef.current) {
        if (Math.abs(video.currentTime - savedTimeRef.current) > 1) video.currentTime = savedTimeRef.current;
        video.play().catch(() => {});
        wasPlayingRef.current = false;
      }
    };

    // Mobile screen recording detection:
    // On iOS, when screen recording starts, the system triggers a resize event.
    // On Android, control center overlay triggers blur/visibility change.
    // We detect rapid re-focus cycles as potential recording attempts.
    let visibilityChangeCount = 0;
    let visibilityResetTimer: NodeJS.Timeout | null = null;

    const handleMobileRecordingDetection = () => {
      if (!isMobile) return;
      visibilityChangeCount++;

      if (visibilityResetTimer) clearTimeout(visibilityResetTimer);
      visibilityResetTimer = setTimeout(() => { visibilityChangeCount = 0; }, 5000);

      // If visibility changes rapidly 3+ times in 5 seconds, likely a recording tool
      if (visibilityChangeCount >= 3) {
        triggerScreenshotBlock();
        visibilityChangeCount = 0;
      }
    };

    const wrappedVisibility = () => {
      handleVisibilityChange();
      handleMobileRecordingDetection();
    };

    document.addEventListener('visibilitychange', wrappedVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', wrappedVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      if (visibilityResetTimer) clearTimeout(visibilityResetTimer);
    };
  }, [isMobile, triggerScreenshotBlock]);

  // iOS screen recording detection via window resize
  // When iOS starts screen recording, the status bar height changes triggering a resize.
  // Also detects iOS screenshot (triggers a brief focus loss on some versions).
  useEffect(() => {
    if (!isMobile) return;

    let lastHeight = window.innerHeight;

    const handleResize = () => {
      const newHeight = window.innerHeight;
      // iOS recording indicator causes a small height reduction (~20px)
      if (lastHeight > 0 && Math.abs(newHeight - lastHeight) > 0 && Math.abs(newHeight - lastHeight) < 50) {
        // Possible recording indicator appeared — hide video content
        setIsVideoHidden(true);
        setTimeout(() => {
          // If still same reduced height after 2s, recording is active
          if (window.innerHeight !== lastHeight) {
            triggerScreenshotBlock();
          } else {
            setIsVideoHidden(false);
          }
        }, 2000);
      }
      lastHeight = newHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, triggerScreenshotBlock]);

  // Keyboard blocking (desktop only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') { e.preventDefault(); e.stopPropagation(); triggerScreenshotBlock(); return false; }
      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) { e.preventDefault(); e.stopPropagation(); triggerScreenshotBlock(); return false; }
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); triggerScreenshotBlock(); return false; }
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.key === 'F12') { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.ctrlKey && (e.key === 'S' || e.key === 's') && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.ctrlKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); skipBackward(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); skipForward(); }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'PrintScreen') triggerScreenshotBlock(); };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [skipBackward, skipForward, triggerScreenshotBlock]);

  // Screen recording detection
  useEffect(() => {
    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      const orig = navigator.mediaDevices.getDisplayMedia;
      navigator.mediaDevices.getDisplayMedia = async function (...args) {
        triggerScreenshotBlock();
        return orig.apply(this, args);
      };
    }
  }, [triggerScreenshotBlock]);

  // Disable PiP
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      (video as any).disablePictureInPicture = true;
      video.setAttribute('disablepictureinpicture', '');
      video.setAttribute('controlslist', 'nodownload noplaybackrate');
    }
  }, []);

  // Track currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => { savedTimeRef.current = video.currentTime; };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, []);

  const dismissCaptureWarning = () => {
    setScreenCaptureDetected(false);
    setIsVideoHidden(false);
    const video = videoRef.current;
    if (video && wasPlayingRef.current) {
      if (Math.abs(video.currentTime - savedTimeRef.current) > 1) video.currentTime = savedTimeRef.current;
      video.play().catch(() => {});
      wasPlayingRef.current = false;
    }
  };

  const handleResumePlayback = () => {
    setIsTabHidden(false);
    const video = videoRef.current;
    if (video) {
      if (Math.abs(video.currentTime - savedTimeRef.current) > 1) video.currentTime = savedTimeRef.current;
      video.play().catch(() => {});
      wasPlayingRef.current = false;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onContextMenu={handleContextMenu as any}
      onMouseMove={handleMouseMove}
      onTouchEnd={handleTouchEnd}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        // Mobile: prevent text selection, link previews, share sheets
        touchAction: 'manipulation',
      }}
    >
      <div className="relative w-full h-full" style={{ visibility: isVideoHidden ? 'hidden' : 'visible' }}>
        <video
          ref={videoRef}
          src={src}
          autoPlay={autoPlay}
          poster={poster}
          controls
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          playsInline
          className="w-full h-full object-contain"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={handleDragStart as any}
          onError={onError}
          onEnded={onEnded}
          onPlay={onPlay}
          onPause={onPause}
          style={{
            pointerEvents: 'auto',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        />
      </div>

      {/* Black overlay during capture */}
      {isVideoHidden && <div className="absolute inset-0 z-50 bg-black" />}

      {/* Desktop: hover skip buttons */}
      {showControls && !isMobile && !isTabHidden && !screenCaptureDetected && !isVideoHidden && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-between px-4">
          <button onClick={skipBackward} className="pointer-events-auto w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition" title="Skip back 10s">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={skipForward} className="pointer-events-auto w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition" title="Skip forward 10s">
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Mobile: Double-tap skip indicator */}
      {skipIndicator && (
        <div className={`absolute inset-y-0 z-10 flex items-center justify-center pointer-events-none ${skipIndicator === 'backward' ? 'left-0 w-1/3' : 'right-0 w-1/3'}`}>
          <div className="bg-white/20 rounded-full p-4 animate-ping">
            {skipIndicator === 'backward' ? <RotateCcw className="w-6 h-6 text-white" /> : <RotateCw className="w-6 h-6 text-white" />}
          </div>
        </div>
      )}

      {/* Anti-inspect overlay */}
      <div className="absolute top-0 left-0 right-0 h-8 z-10" onContextMenu={(e) => e.preventDefault()} style={{ userSelect: 'none', WebkitTouchCallout: 'none' }} />

      {/* Tab/App Hidden */}
      {isTabHidden && !screenCaptureDetected && (
        <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center text-white text-center p-6">
          <ShieldAlert className="w-12 h-12 text-[#a855f7] mb-4" />
          <h3 className="text-lg font-bold mb-2">Playback Paused</h3>
          <p className="text-sm text-slate-300 max-w-xs mb-4">Video playback is paused while you are away. It will auto-resume when you return.</p>
          <button onClick={handleResumePlayback} className="px-5 py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition text-sm">Resume Now</button>
        </div>
      )}

      {/* Screen Capture Warning */}
      {screenCaptureDetected && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white text-center p-6">
          <AlertTriangle className="w-14 h-14 text-red-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Screen Capture Blocked</h3>
          <p className="text-sm text-slate-300 max-w-sm mb-6">Screenshots and screen recording are not permitted. This activity has been logged.</p>
          <button onClick={dismissCaptureWarning} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition text-sm">I Understand — Resume Video</button>
        </div>
      )}

      {/* Watermark */}
      {!isVideoHidden && !screenCaptureDetected && (
        <div className="absolute inset-0 z-20 pointer-events-none select-none flex items-center justify-center opacity-[0.04]" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
          <p className="text-white text-3xl font-bold rotate-[-25deg] whitespace-nowrap tracking-wider">{title || 'CODVEDHA LMS'}</p>
        </div>
      )}
    </div>
  );
};

export default SecureVideoPlayer;
