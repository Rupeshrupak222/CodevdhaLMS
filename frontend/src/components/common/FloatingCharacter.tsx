"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

export const FloatingCharacter = () => {
 const [facing, setFacing] = useState('left');
 const [isLocked, setIsLocked] = useState(false);
 const [ballVisible, setBallVisible] = useState(false);
 const [ballOpacity, setBallOpacity] = useState(1);
 const [ballTransform, setBallTransform] = useState({ x: 0, y: 0, rotation: 0, scale: 1 });
 const [ballSize, setBallSize] = useState(48);
 const [showKickPose, setShowKickPose] = useState(false);
 
 const stageRef = useRef<any>(null);
 const ballRef = useRef<any>(null);
 const shellRef = useRef<any>(null);
 const mascotVideoRef = useRef<any>(null);
 const ballVideoRef = useRef<any>(null);
 const kickPoseImgRef = useRef<any>(null);
 const kickToeRef = useRef<any>(null);
 const activeAnimationIdRef = useRef(0);
 
 // Assets - Update these paths
 const ASSETS = {
 juggle: ['/assets/mascot_juggle.mp4'],
 kickPose: ['/assets/mascot_kick.png'],
 ball: ['/assets/logo.png'],
 };

 const KICK_POSE_DURATION_MS = 1000;
 const KICK_BALL_RELEASE_MS = 160;
 const KICK_FACING_INVERT = true; // Changed to true for right side

 const BALL = {
 diameterRatio: 0.19,
 diameterCoverBoost: 1.0,
 toeX: 0.56,
 toeY: 0.9,
 };

 const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
 const easeOutCubic = (t) => 1 - (1 - t) ** 3;
 const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

 const isRasterImageUrl = (url) => {
 return /\.(png|jpe?g|webp|avif)$/i.test(url.toLowerCase());
 };

 const loadMascotClip = useCallback((sources, { loop }) => {
 const video = mascotVideoRef.current as HTMLVideoElement | null;
 if (!video) return;
 
 let index = 0;
 video.loop = Boolean(loop);

 const tryNext = () => {
 while (index < sources.length && isRasterImageUrl(sources[index])) {
 index += 1;
 }
 if (index >= sources.length) {
 video.removeAttribute('src');
 video.load();
 return;
 }

 const url = sources[index];

 const onError = () => {
 video.removeEventListener('error', onError);
 video.removeEventListener('loadeddata', onLoaded);
 index += 1;
 tryNext();
 };

 const onLoaded = () => {
 video.removeEventListener('error', onError);
 video.removeEventListener('loadeddata', onLoaded);
 video.play().catch(() => {});
 };

 video.addEventListener('error', onError, { once: true });
 video.addEventListener('loadeddata', onLoaded, { once: true });
 video.src = url;
 video.load();
 };

 tryNext();
 }, []);

 const setFacingTowardClick = useCallback((clickX) => {
 if (!stageRef.current) return;
 const rect = stageRef.current.getBoundingClientRect();
 const stageMidX = rect.left + rect.width * 0.5;
 let towardRight = clickX >= stageMidX;
 if (KICK_FACING_INVERT) {
 towardRight = !towardRight;
 }
 setFacing(towardRight ? 'right' : 'left');
 }, []);

 const ballDiameterPx = useCallback(() => {
 const sh = shellRef.current;
 if (!sh) {
 return 48;
 }
 const base = sh.clientWidth * BALL.diameterRatio * BALL.diameterCoverBoost;
 const size = clamp(base, 22, 120);
 setBallSize(size);
 return size;
 }, []);

 const positionKickToeAnchor = useCallback(() => {
 const sh = shellRef.current;
 const toe = kickToeRef.current;
 if (!sh || !toe) {
 return;
 }
 const w = sh.clientWidth;
 const h = sh.clientHeight;
 toe.style.left = `${w * BALL.toeX}px`;
 toe.style.top = `${h * BALL.toeY}px`;
 }, []);

 const getToeAnchorViewport = useCallback(() => {
 const sh = shellRef.current;
 const toe = kickToeRef.current;
 if (toe) {
 const r = toe.getBoundingClientRect();
 return {
 x: r.left + r.width / 2,
 y: r.top + r.height / 2,
 };
 }
 if (!sh) {
 return { x: 0, y: 0 };
 }
 const r = sh.getBoundingClientRect();
 const w = sh.clientWidth;
 const h = sh.clientHeight;
 return {
 x: r.left + w * BALL.toeX,
 y: r.top + h * BALL.toeY,
 };
 }, []);

 const removeAllShotBalls = useCallback(() => {
 setBallVisible(false);
 }, []);

 const animateShot = useCallback((start, end) => {
 return new Promise<void>((resolve) => {
 removeAllShotBalls();
 const shotId = ++activeAnimationIdRef.current;
 
 const distance = Math.hypot(end.x - start.x, end.y - start.y);
 const duration = clamp(520 + distance * 0.45, 520, 1100);
 const arcHeight = clamp(distance * 0.22, 55, 200);
 const direction = end.x >= start.x ? 1 : -1;
 const startTime = performance.now();

 setBallTransform({ x: start.x, y: start.y, rotation: 0, scale: 1 });
 setBallOpacity(1);
 setBallVisible(true);
 ballDiameterPx();

 const step = (now) => {
 if (shotId !== activeAnimationIdRef.current) {
 setBallVisible(false);
 resolve();
 return;
 }

 const t = clamp((now - startTime) / duration, 0, 1);
 const p = easeOutCubic(t);

 const x = start.x + (end.x - start.x) * p;
 const baseY = start.y + (end.y - start.y) * p;
 const arcY = arcHeight * 4 * p * (1 - p);
 const y = baseY - arcY;

 const rotation = direction * (35 + p * 620);
 const scale = 1 - p * 0.16;
 const fade = t > 0.92 ? 1 - (t - 0.92) / 0.08 : 1;

 setBallOpacity(fade);
 setBallTransform({ x, y, rotation, scale });

 if (t < 1) {
 window.requestAnimationFrame(step);
 return;
 }

 setBallOpacity(0);
 window.setTimeout(() => {
 setBallVisible(false);
 resolve();
 }, 140);
 };

 window.requestAnimationFrame(step);
 });
 }, [removeAllShotBalls, ballDiameterPx]);

 const handleKick = useCallback(async (clickX, clickY) => {
 if (isLocked || !shellRef.current || !mascotVideoRef.current) return;
 if (ballVisible) return;

 setIsLocked(true);
 setFacingTowardClick(clickX);
 positionKickToeAnchor();

 const shell = shellRef.current;
 const video = mascotVideoRef.current;
 
 setShowKickPose(true);
 video.pause();
 shell.classList.add('kicking');

 const releaseMs = clamp(KICK_BALL_RELEASE_MS, 120, KICK_POSE_DURATION_MS - 80);
 await wait(releaseMs);

 positionKickToeAnchor();
 const start = getToeAnchorViewport();

 const shotPromise = animateShot(start, { x: clickX, y: clickY });

 await wait(KICK_POSE_DURATION_MS);

 setShowKickPose(false);
 shell.classList.remove('kicking');
 loadMascotClip(ASSETS.juggle, { loop: true });

 await shotPromise;

 removeAllShotBalls();
 positionKickToeAnchor();
 setIsLocked(false);
 
 }, [isLocked, ballVisible, setFacingTowardClick, positionKickToeAnchor, getToeAnchorViewport, animateShot, loadMascotClip, removeAllShotBalls]);

 const onClick = useCallback((event) => {
 if (event.button !== 0 && event.button !== undefined) {
 return;
 }
 handleKick(event.clientX, event.clientY);
 }, [handleKick]);

 // Initialize
 useEffect(() => {
 if (kickPoseImgRef.current) {
 kickPoseImgRef.current.src = ASSETS.kickPose;
 }
 loadMascotClip(ASSETS.juggle, { loop: true });
 // Changed initial facing to left for right side
 const idleTargetX = window.innerWidth * 0.35;
 setFacingTowardClick(idleTargetX);
 positionKickToeAnchor();

 window.addEventListener('click', onClick, { passive: true });
 window.addEventListener('resize', positionKickToeAnchor, { passive: true });

 return () => {
 window.removeEventListener('click', onClick);
 window.removeEventListener('resize', positionKickToeAnchor);
 };
 }, [loadMascotClip, setFacingTowardClick, positionKickToeAnchor, onClick]);

 return (
 <>
 {/* Mascot Stage - Right side */}
 <div 
 ref={stageRef} 
 className="mascot-stage fixed right-[max(8px,env(safe-area-inset-right))] bottom-[max(8px,env(safe-area-inset-bottom))] w-[clamp(180px,23vw,300px)] aspect-square pointer-events-none bg-transparent [filter:url(#remove-white)]"
 style={{ position: 'fixed', zIndex: 2147483647 }}
 >
 <div 
 ref={shellRef} 
 className="absolute inset-0 bg-transparent transition-transform duration-180 ease-out"
 style={{ 
 transform: `scaleX(${facing === 'right' ? 1 : -1})`,
 transformOrigin: '52% 88%'
 }}
 >
 {/* Video - Always visible unless kick pose is shown */}
 <video
 ref={mascotVideoRef}
 className="mascot-img absolute inset-0 z-[1] w-full h-full object-contain object-[center_bottom] pointer-events-none bg-transparent will-change-transform"
 playsInline
 muted
 preload="auto"
 style={{
 opacity: showKickPose ? 0 : 1,
 visibility: showKickPose ? 'hidden' : 'visible'
 }}
 />
 
 {/* Kick Pose Image */}
 <img
 ref={kickPoseImgRef}
 className="mascot-kick-pose absolute inset-0 z-[9999] w-full h-full object-contain object-[center_bottom] pointer-events-none bg-transparent will-change-transform"
 alt="Kick pose"
 draggable="false"
 style={{
 opacity: showKickPose ? 1 : 0,
 visibility: showKickPose ? 'visible' : 'hidden',
 animation: showKickPose ? 'kick-pop 1000ms cubic-bezier(0.25, 0.9, 0.35, 1) both' : 'none'
 }}
 />
 
 {/* Kick Toe Anchor */}
 <div 
 ref={kickToeRef} 
 className="absolute z-[2] w-px h-px opacity-0 pointer-events-none"
 style={{ 
 transform: 'translate(-50%, -50%)',
 left: '0px',
 top: '0px'
 }}
 aria-hidden="true"
 />
 </div>
 </div>

 {/* Ball */}
 {ballVisible && (
 <div 
 className="fixed rounded-full overflow-hidden pointer-events-none bg-transparent [filter:url(#remove-white)]"
 style={{
 left: `${ballTransform.x}px`,
 top: `${ballTransform.y}px`,
 width: `${ballSize}px`,
 height: `${ballSize}px`,
 transform: `translate(-50%, -50%) rotate(${ballTransform.rotation}deg) scale(${ballTransform.scale})`,
 opacity: ballOpacity,
 transition: 'opacity 120ms linear',
 willChange: 'opacity, transform',
 position: 'fixed',
 zIndex: 2147483647
 }}
 >
 <img 
 src={ASSETS.ball[0]} 
 alt="Ball"
 className="w-full h-full object-contain object-center bg-transparent pointer-events-none border-none outline-none"
 onError={(e) => {
 if (ASSETS.ball.length > 1) {
 (e.target as HTMLImageElement).src = ASSETS.ball[1];
 }
 }}
 />
 </div>
 )}

 {/* Global CSS for animations */}
 <style>{`
 @keyframes kick-pop {
 0% {
 transform: translateY(0) rotate(0deg);
 }
 20% {
 transform: translateY(4px) rotate(-4deg);
 }
 48% {
 transform: translateY(-7px) rotate(7deg);
 }
 100% {
 transform: translateY(0) rotate(0deg);
 }
 }

 @media (prefers-reduced-motion: reduce) {
 .mascot-shell,
 .mascot-img,
 .mascot-kick-pose,
 .shot-ball {
 transition: none !important;
 animation: none !important;
 }
 }
 `}</style>
 <svg width="0" height="0" className="absolute pointer-events-none">
 <filter id="remove-white" color-interpolation-filters="sRGB">
 <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -2 -2 -2 5.5 0" />
 </filter>
 </svg>
 </>
 );
};
