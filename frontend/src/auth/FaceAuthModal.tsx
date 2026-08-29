"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, AlertCircle, CheckCircle2, Loader2, ScanFace, ShieldCheck } from 'lucide-react';

interface FaceAuthModalProps {
  mode: 'enroll' | 'verify';
  onSuccess: (embedding: number[], imageBase64?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  avatarUrl?: string | null;
  externalError?: string | null;
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

export const FaceAuthModal: React.FC<FaceAuthModalProps> = ({ mode, onSuccess, onCancel, isLoading = false, avatarUrl, externalError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<string>('Initializing models...');
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Load models & start camera in parallel
  useEffect(() => {
    // Start camera immediately so video stream opens in < 1 second
    startCamera();

    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelsLoaded(true);

        if (mode === 'enroll' && avatarUrl) {
          setStatus('Extracting face from Profile Picture...');
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = avatarUrl;
          img.onload = async () => {
            try {
              let detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
              if (!detection) {
                detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
              }
              if (detection) {
                onSuccess(Array.from(detection.descriptor));
              } else {
                setError('No face detected in profile picture. Please verify with webcam.');
                setStatus('Models loaded. Ready to verify.');
              }
            } catch (e) {
              setError('Failed to extract face from DP. Please use webcam.');
            }
          };
          img.onerror = () => {
            setError('Failed to load profile picture. Please use webcam.');
          };
        } else {
          setStatus('Models loaded. Position your face in center.');
        }
      } catch (err: any) {
        setError('Failed to load facial recognition models.');
        console.error(err);
      }
    };
    loadModels();
  }, []);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: "user" 
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('Position your face in the center.');
      setError(null);
    } catch (err: any) {
      setError('Camera access denied or unavailable. Please enable camera permissions.');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (externalError) {
      setError(externalError);
      setStatus('Ready to capture!');
    }
  }, [externalError]);

  // Main Detection Loop
  useEffect(() => {
    let animationFrameId: number;

    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || !isModelsLoaded || isCapturing) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      if (video.readyState !== 4) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);

      try {
        let detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })).withFaceLandmarks().withFaceDescriptors();
        if (detections.length === 0) {
          detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        }
        
        if (!canvasRef.current) return;

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }

        if (detections.length === 0) {
          setStatus('No face detected.');
          setLivenessPassed(false);
        } else if (detections.length > 1) {
          setStatus('Multiple faces detected. Please ensure only you are in frame.');
          setLivenessPassed(false);
        } else {
          const face = detections[0];
          const score = face.detection.score;

          if (score < 0.60) {
            setStatus('Low confidence. Please improve lighting or move closer.');
            setLivenessPassed(false);
          } else {
            setStatus(livenessPassed ? 'Ready to capture!' : 'Hold still for liveness check...');
            if (!livenessPassed) {
               setLivenessPassed(true);
            }
          }
        }
      } catch (err) {
        console.error('Detection error:', err);
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    if (isModelsLoaded) {
      detect();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isModelsLoaded, isCapturing, livenessPassed]);

  useEffect(() => {
    if (!isLoading && isCapturing) {
      setIsCapturing(false);
      setStatus('Ready to capture!');
    }
  }, [isLoading, isCapturing]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setStatus('Processing...');
    
    try {
      let detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      }
      
      if (!detection) {
        setError('Failed to extract facial features. Try again.');
        setIsCapturing(false);
        return;
      }

      const embedding = Array.from(detection.descriptor);
      
      let imageBase64: string | undefined;
      if (mode === 'enroll') {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        }
      }

      onSuccess(embedding, imageBase64);
    } catch (err) {
      setError('An error occurred during capture.');
      setIsCapturing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white/95 backdrop-blur-2xl rounded-[1.5rem] md:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-md max-h-[95vh] overflow-y-auto flex flex-col relative border border-white/40"
        >
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-6 md:p-8 text-white text-center relative overflow-hidden shrink-0">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            
            <button 
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors cursor-pointer backdrop-blur-md"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-white/90" />
            </button>
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 backdrop-blur-md shadow-inner border border-white/30 transform rotate-3">
              <div className="transform -rotate-3">
                {mode === 'enroll' ? <ScanFace className="w-8 h-8 md:w-10 md:h-10 text-white" /> : <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-white" />}
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              {mode === 'enroll' ? 'Biometric Registration' : 'Face Verification'}
            </h2>
            <p className="text-indigo-100 mt-2 text-sm font-medium">
              {mode === 'enroll' 
                ? 'Position your face clearly to enroll.' 
                : 'Confirm your identity to proceed.'}
            </p>
          </div>

          <div className="px-5 py-5 md:px-8 md:pt-8 md:pb-4 flex flex-col items-center shrink-0">
            {error ? (
              <div className="w-full bg-red-50/80 backdrop-blur text-red-600 p-3 md:p-4 rounded-xl md:rounded-2xl flex items-start gap-3 border border-red-100 mb-2 md:mb-4 shadow-sm">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-relaxed">{error}</p>
              </div>
            ) : (
              <div className="relative w-full aspect-square max-w-[200px] md:max-w-[280px] bg-gradient-to-b from-gray-100 to-gray-200 rounded-full overflow-hidden shadow-[0_0_0_6px_rgba(255,255,255,1),0_8px_20px_rgba(0,0,0,0.1)] md:shadow-[0_0_0_8px_rgba(255,255,255,1),0_10px_30px_rgba(0,0,0,0.1)] ring-1 ring-gray-100">
                {!isModelsLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md z-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                    <span className="text-sm font-semibold text-gray-700 animate-pulse">{status}</span>
                  </div>
                )}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover scale-[1.3]"
                  style={{ transform: 'scaleX(-1) scale(1.3)' }} 
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full pointer-events-none scale-[1.3]"
                  style={{ transform: 'scaleX(-1) scale(1.3)' }}
                />
                {isModelsLoaded && (
                  <div className="absolute inset-0 pointer-events-none border-[8px] md:border-[12px] border-black/10 rounded-full z-10 transition-colors duration-500">
                     <div className={`absolute inset-0 border-[3px] md:border-4 rounded-full transition-colors duration-500 ${livenessPassed ? 'border-emerald-400 shadow-[inset_0_0_20px_rgba(52,211,153,0.5)]' : 'border-indigo-400/50'}`}></div>
                  </div>
                )}
                <div className="absolute bottom-4 md:bottom-6 left-0 right-0 flex justify-center z-10">
                  <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide backdrop-blur-xl flex items-center gap-2 shadow-lg transition-all duration-300 transform ${
                    livenessPassed 
                      ? 'bg-emerald-500/90 text-white translate-y-0' 
                      : 'bg-black/60 text-white/90 translate-y-2'
                  }`}>
                    {livenessPassed ? <CheckCircle2 className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    {status}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 md:p-8 pt-2 md:pt-4 shrink-0">
            <button
              onClick={handleCapture}
              disabled={!livenessPassed || isCapturing || !!error || isLoading}
              className={`w-full py-3.5 md:py-4 rounded-[1rem] md:rounded-2xl font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden ${
                livenessPassed && !error && !isLoading && !isCapturing
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-500 hover:scale-[1.02] shadow-indigo-500/30 cursor-pointer group' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              {livenessPassed && !error && !isLoading && !isCapturing && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              )}
              {isLoading || isCapturing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'enroll' ? 'Processing...' : 'Authenticating...'}
                </>
              ) : (
                mode === 'enroll' ? 'Capture & Enroll' : 'Verify Identity'
              )}
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-3 mt-2 md:mt-4 text-gray-500 font-medium hover:text-gray-800 transition-colors cursor-pointer text-sm"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
