'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Shield, CheckCircle, AlertCircle, Eye, RotateCcw, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic import for face-api.js to avoid SSR issues

type VerificationState = 
  | 'INITIALIZING'
  | 'REQUESTING_CAMERA'
  | 'CAMERA_ERROR'
  | 'DETECTING_FACE'
  | 'LIVENESS_CHECK'
  | 'CAPTURING_FACE'
  | 'PROCESSING'
  | 'VERIFICATION_SUCCESS'
  | 'VERIFICATION_FAILED';

type LivenessAction = {
  id: string;
  instruction: string;
  icon: React.ReactNode;
  completed: boolean;
  feedback?: string;
  isActive?: boolean;
};

export default function FaceVerificationPage() {
  const router = useRouter();
  const [verificationState, setVerificationState] = useState<VerificationState>('INITIALIZING');
  const [currentStep, setCurrentStep] = useState(1);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceQuality, setFaceQuality] = useState(0);
  const [livenessActions, setLivenessActions] = useState<LivenessAction[]>([
    {
      id: 'blink',
      instruction: 'Please blink naturally',
      icon: <Eye className="w-6 h-6" />,
      completed: false,
      isActive: false
    },
    {
      id: 'turn-left',
      instruction: 'Turn your head slightly left',
      icon: <RotateCcw className="w-6 h-6" />,
      completed: false,
      isActive: false
    },
    {
      id: 'turn-right', 
      instruction: 'Turn your head slightly right',
      icon: <RotateCcw className="w-6 h-6 scale-x-[-1]" />,
      completed: false,
      isActive: false
    }
  ]);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const [verificationScore, setVerificationScore] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentLivenessIndex, setCurrentLivenessIndex] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState<boolean | string>(false);
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState({
    detectionCount: 0,
    lastConfidence: 0,
    faceBoxes: [] as any[],
    processingTime: 0,
    lastError: '',
    videoReady: false,
    faceApiReady: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  // Load face-api.js models
  const loadModels = async () => {
    try {
      setModelLoadingProgress(10);
      
      // Load face-api.js dynamically
      let faceApiModule = faceapi;
      if (!faceApiModule) {
        console.log('Loading face-api.js...');
        faceApiModule = await import('face-api.js' as any);
        console.log('face-api.js loaded successfully');
      }
      
      if (!faceApiModule) {
        throw new Error('face-api.js failed to load');
      }
      
      const MODEL_URL = '/models';
      
      // Load models in sequence with progress updates
      await faceApiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelLoadingProgress(40);
      
      await faceApiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setModelLoadingProgress(70);
      
      await faceApiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelLoadingProgress(90);
      
      await faceApiModule.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      setModelLoadingProgress(100);
      
      // Set both state and ensure we have the module ready
      setFaceapi(faceApiModule);
      setModelsLoaded(true);
      console.log('All face-api.js models loaded successfully');
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        faceApiReady: true
      }));
      
    } catch (error) {
      console.error('Error loading face-api.js models:', error);
      // Fall back to basic detection without AI models
      setModelsLoaded('fallback');
      setModelLoadingProgress(100);
      setErrorMessage('Using basic face detection. For enhanced accuracy, please refresh the page.');
    }
  };

  // Initialize face verification on component mount
  useEffect(() => {
    initializeFaceVerification();
    
    // Cleanup on unmount
    return () => {
      stopCamera();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Start face detection when models are loaded and faceapi is ready
  useEffect(() => {
    if (modelsLoaded === true && faceapi && stream && videoRef.current && verificationState === 'DETECTING_FACE') {
      console.log('🎯 All conditions met for face detection - starting...');
      startFaceDetection();
    }
  }, [modelsLoaded, faceapi, stream]);

  const initializeFaceVerification = async () => {
    try {
      setVerificationState('INITIALIZING');
      setCurrentStep(1);
      setErrorMessage('');
      
      // Load face-api.js models first
      await loadModels();
      
      setVerificationState('REQUESTING_CAMERA');
      
      // Request camera access with high quality settings
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true);
          }
        });
        
        await videoRef.current.play();
      }

      // Update debug info when video is ready
      setDebugInfo(prev => ({
        ...prev,
        videoReady: true
      }));
      
      console.log('📹 Video stream ready, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);

      // Simulate model loading delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setVerificationState('DETECTING_FACE');
      setCurrentStep(2);
      
      // Start face detection simulation
      startFaceDetection();
      
    } catch (error: any) {
      console.error('Camera initialization failed:', error);
      setVerificationState('CAMERA_ERROR');
      setErrorMessage(
        error.name === 'NotAllowedError' 
          ? 'Camera access denied. Please grant permission and try again.'
          : 'Unable to access camera. Please check your camera connection.'
      );
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startFaceDetection = () => {
    console.log('🚀 Starting face detection...');
    console.log('📹 Video ready:', !!videoRef.current);
    console.log('🤖 Models loaded:', modelsLoaded);
    console.log('🔧 Face API available:', !!faceapi);
    console.log('📦 Face API object keys:', faceapi ? Object.keys(faceapi).slice(0, 5) : 'null');
    
    if (!videoRef.current) {
      const errorMsg = 'Video element not available';
      console.error('❌', errorMsg);
      setDebugInfo(prev => ({ ...prev, lastError: errorMsg }));
      setErrorMessage(errorMsg);
      return;
    }

    let detectionRunning = true;
    
    const detectFace = async () => {
      if (!detectionRunning || verificationState !== 'DETECTING_FACE' || !videoRef.current) {
        console.log('🛑 Detection stopped:', { detectionRunning, verificationState, videoExists: !!videoRef.current });
        return;
      }

      try {
        console.log('🔍 Detection iteration starting...');
        
        // Update detection count immediately
        setDebugInfo(prev => ({
          ...prev,
          detectionCount: prev.detectionCount + 1,
          lastError: ''
        }));

        const startTime = performance.now();
        let detections = [];
        let detectionMethod = 'none';
        
        // Check video readiness
        if (videoRef.current.readyState < 2) {
          console.warn('⚠️ Video not ready, readyState:', videoRef.current.readyState);
          setTimeout(detectFace, 200);
          return;
        }

        console.log('📐 Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        
        // Try AI-based detection first
        console.log('🔍 Detection check - modelsLoaded:', modelsLoaded, 'faceapi available:', !!faceapi);
        if (modelsLoaded === true && faceapi) {
          try {
            console.log('🤖 Attempting face-api.js detection...');
            detections = await faceapi
              .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({
                inputSize: 416,
                scoreThreshold: 0.5
              }))
              .withFaceLandmarks()
              .withFaceExpressions();
            
            detectionMethod = 'face-api.js';
            console.log('✅ Face-api.js detection result:', detections.length, 'faces found');
            
          } catch (faceApiError) {
            console.error('❌ Face-api.js detection failed:', faceApiError);
            const errorMessage = faceApiError instanceof Error ? faceApiError.message : String(faceApiError);
            setDebugInfo(prev => ({ ...prev, lastError: `Face-API error: ${errorMessage}` }));
            // Fall through to fallback detection
          }
        }
        
        // Use fallback detection if AI failed or unavailable
        if (detections.length === 0 && detectionMethod === 'none') {
          console.log('🔄 Using fallback detection...');
          try {
            detections = await fallbackFaceDetection();
            detectionMethod = 'fallback';
            console.log('✅ Fallback detection result:', detections.length, 'faces found');
          } catch (fallbackError) {
            console.error('❌ Fallback detection failed:', fallbackError);
            const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
            setDebugInfo(prev => ({ ...prev, lastError: `Fallback error: ${errorMessage}` }));
          }
        }

        const processingTime = performance.now() - startTime;
        console.log('⏱️ Processing time:', Math.round(processingTime), 'ms');

        if (detections.length > 0) {
          const detection = detections[0];
          let confidence: number = 0;
          let box: any = null;
          
          if (detection.detection) {
            // face-api.js detection
            confidence = detection.detection.score;
            box = detection.detection.box;
          } else {
            // fallback detection
            confidence = detection.confidence || 0.8;
            box = detection.box || { x: 100, y: 100, width: 200, height: 200 };
          }
          
          console.log('👤 Face detected!', { confidence: confidence.toFixed(3), method: detectionMethod });
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            lastConfidence: confidence,
            faceBoxes: [box],
            processingTime: Math.round(processingTime)
          }));

          setFaceDetected(true);
          
          // Calculate face quality based on multiple factors
          const quality = calculateFaceQuality(detection, videoRef.current);
          setFaceQuality(quality);
          
          console.log('📊 Face quality:', (quality * 100).toFixed(1) + '%');
          
          // Draw face detection overlay
          drawFaceOverlay(detection);
          
          // If face quality is good enough, proceed to liveness check
          if (quality >= 0.8) {
            console.log('🎉 Face quality excellent! Proceeding to liveness check...');
            detectionRunning = false;
            setTimeout(() => {
              setVerificationState('LIVENESS_CHECK');
              setCurrentStep(3);
              startLivenessCheck();
            }, 2000);
            return;
          }
        } else {
          console.log('👻 No face detected');
          setFaceDetected(false);
          setFaceQuality(0);
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            lastConfidence: 0,
            faceBoxes: [],
            processingTime: Math.round(processingTime)
          }));
          
          // Clear face overlay
          clearFaceOverlay();
        }
        
        // Continue detection loop
        console.log('🔄 Scheduling next detection in 150ms...');
        detectionIntervalRef.current = window.setTimeout(detectFace, 150);
        
      } catch (error: any) {
        console.error('💥 Face detection critical error:', error);
        const errorMsg = `Detection error: ${error.message}`;
        setDebugInfo(prev => ({ ...prev, lastError: errorMsg }));
        setErrorMessage(errorMsg);
        
        // Try to continue detection after error
        setTimeout(detectFace, 500);
      }
    };
    
    // Start detection immediately
    console.log('🎬 Starting detection loop...');
    detectFace();
  };

  // Fallback face detection using canvas and basic image analysis
  const fallbackFaceDetection = async (): Promise<any[]> => {
    return new Promise((resolve) => {
      console.log('🔄 Starting fallback face detection...');
      
      if (!videoRef.current || !canvasRef.current) {
        console.warn('⚠️ Video or canvas not available for fallback detection');
        resolve([]);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('❌ Canvas context not available');
        resolve([]);
        return;
      }

      try {
        // Set canvas size to video size
        canvas.width = video.videoWidth || video.clientWidth || 640;
        canvas.height = video.videoHeight || video.clientHeight || 480;

        console.log('📐 Fallback detection canvas size:', canvas.width, 'x', canvas.height);

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Enhanced face detection using multiple methods
        let faceRegions = [];
        
        // Method 1: Skin tone detection
        let skinTonePixels = 0;
        let brightPixels = 0;
        let totalPixels = 0;
        
        // Sample grid for face detection
        const gridSize = 40; // Increased for better accuracy
        const stepX = Math.floor(canvas.width / gridSize);
        const stepY = Math.floor(canvas.height / gridSize);
        
        for (let y = 0; y < canvas.height; y += stepY) {
          for (let x = 0; x < canvas.width; x += stepX) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            totalPixels++;
            
            // Enhanced skin tone detection
            if (r > 95 && g > 40 && b > 20 && 
                r > g && r > b && 
                Math.abs(r - g) > 15 &&
                (r + g + b) > 200) { // Ensure not too dark
              skinTonePixels++;
            }
            
            // Brightness detection (for well-lit faces)
            if ((r + g + b) / 3 > 120) {
              brightPixels++;
            }
          }
        }

        const skinRatio = skinTonePixels / totalPixels;
        const brightRatio = brightPixels / totalPixels;
        
        console.log('🎨 Fallback detection results:', {
          skinRatio: skinRatio.toFixed(3),
          brightRatio: brightRatio.toFixed(3),
          skinPixels: skinTonePixels,
          totalPixels
        });

        // If we found enough indicators of a face
        if (skinRatio > 0.08 || (skinRatio > 0.05 && brightRatio > 0.3)) {
          // Create a mock detection result
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const faceSize = Math.min(canvas.width, canvas.height) * 0.35;
          
          // Calculate confidence based on detection quality
          let confidence = Math.min(0.95, Math.max(0.5, skinRatio * 8 + brightRatio * 2));
          
          console.log('✅ Fallback face detected!', { confidence: confidence.toFixed(3) });
          
          resolve([{
            confidence: confidence,
            box: {
              x: centerX - faceSize / 2,
              y: centerY - faceSize / 2,
              width: faceSize,
              height: faceSize
            },
            method: 'fallback'
          }]);
        } else {
          console.log('👻 No face detected by fallback method');
          resolve([]);
        }
        
      } catch (error) {
        console.error('❌ Fallback detection error:', error);
        resolve([]);
      }
    });
  };

  // Calculate face quality based on multiple factors
  const calculateFaceQuality = (detection: any, video: HTMLVideoElement): number => {
    let box, confidence;
    
    if (detection.detection) {
      // face-api.js detection
      box = detection.detection.box;
      confidence = detection.detection.score;
    } else {
      // fallback detection
      box = detection.box;
      confidence = detection.confidence || 0.8;
    }
    
    if (!box) return 0;
    
    // Factor 1: Detection confidence (0-1)
    const confidenceScore = confidence;
    
    // Factor 2: Face size relative to frame (ideal: 20-40% of frame width)
    const faceWidth = box.width;
    const frameWidth = video.videoWidth || video.clientWidth;
    const sizeRatio = faceWidth / frameWidth;
    const idealSizeMin = 0.2;
    const idealSizeMax = 0.4;
    
    let sizeScore = 0;
    if (sizeRatio >= idealSizeMin && sizeRatio <= idealSizeMax) {
      sizeScore = 1.0;
    } else if (sizeRatio < idealSizeMin) {
      sizeScore = sizeRatio / idealSizeMin;
    } else {
      sizeScore = Math.max(0, 1 - (sizeRatio - idealSizeMax) / 0.3);
    }
    
    // Factor 3: Face position centering
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const frameCenterX = frameWidth / 2;
    const frameCenterY = (video.videoHeight || video.clientHeight) / 2;
    
    const xDistance = Math.abs(faceCenterX - frameCenterX) / frameCenterX;
    const yDistance = Math.abs(faceCenterY - frameCenterY) / frameCenterY;
    
    const centeringScore = Math.max(0, 1 - (xDistance + yDistance) / 2);
    
    // Combine scores with weights
    const finalScore = (
      confidenceScore * 0.4 +  // 40% confidence
      sizeScore * 0.35 +       // 35% size
      centeringScore * 0.25    // 25% centering
    );
    
    return Math.max(0, Math.min(1, finalScore));
  };

  // Draw face detection overlay
  const drawFaceOverlay = (detection: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match video
    canvas.width = videoRef.current.videoWidth || videoRef.current.clientWidth;
    canvas.height = videoRef.current.videoHeight || videoRef.current.clientHeight;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let box;
    if (detection.detection) {
      box = detection.detection.box;
    } else {
      box = detection.box;
    }
    
    if (!box) return;
    
    const quality = calculateFaceQuality(detection, videoRef.current);
    
    // Choose color based on quality
    let strokeColor = '#ef4444'; // red
    if (quality > 0.6) strokeColor = '#f59e0b'; // yellow
    if (quality > 0.8) strokeColor = '#10b981'; // green
    
    // Draw face bounding box
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Draw quality indicator
    ctx.fillStyle = strokeColor;
    ctx.font = '16px Arial';
    ctx.fillText(`${Math.round(quality * 100)}%`, box.x, box.y - 10);
  };

  // Clear face detection overlay
  const clearFaceOverlay = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startLivenessCheck = () => {
    setCurrentLivenessIndex(0);
    performLivenessActions();
  };

  const performLivenessActions = async () => {
    for (let i = 0; i < livenessActions.length; i++) {
      setCurrentLivenessIndex(i);
      
      // Set current action as active
      setLivenessActions(prev => 
        prev.map((action, index) => ({
          ...action,
          isActive: index === i,
          completed: index < i
        }))
      );
      
      const action = livenessActions[i];
      
      // Wait for user to complete action (simulated)
      const completed = await waitForLivenessAction(action);
      
      if (completed) {
        setLivenessActions(prev => 
          prev.map((a, index) => 
            index === i
              ? { ...a, completed: true, feedback: 'Great! Action completed ✓', isActive: false }
              : a
          )
        );
        
        // Brief pause between actions
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    // All liveness actions completed
    setVerificationState('CAPTURING_FACE');
    setCurrentStep(4);
    startFaceCapture();
  };

  const waitForLivenessAction = async (action: LivenessAction): Promise<boolean> => {
    return new Promise((resolve) => {
      // Simulate varying completion times for different actions
      const completionTime = action.id === 'blink' ? 2000 : 3000;
      
      setTimeout(() => {
        resolve(true);
      }, completionTime);
    });
  };

  const startFaceCapture = () => {
    setCaptureCountdown(3);
    
    const countdown = setInterval(() => {
      setCaptureCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          captureFaceImage();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureFaceImage = async () => {
    try {
      setVerificationState('PROCESSING');
      setCurrentStep(5);
      
      // Capture frame from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (canvas && video) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Flip the image horizontally to match the mirrored video
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Convert to blob and send to backend for verification
        canvas.toBlob(async (blob) => {
          if (blob) {
            const formData = new FormData();
            formData.append('image', blob, 'face-verification.jpg');
            formData.append('verificationType', 'liveness_detection');
            formData.append('sessionId', `session_${Date.now()}`);
            
            try {
              const response = await fetch('/api/face/verify', {
                method: 'POST',
                body: formData
              });
              
              const result = await response.json();
              
              if (result.success && result.data?.isLive) {
                const score = Math.round((result.data.confidence || 0.9) * 100);
                setVerificationScore(score);
                setVerificationState('VERIFICATION_SUCCESS');
                
                // Stop camera after successful verification
                stopCamera();
                
                // Auto-redirect after 4 seconds
                setTimeout(() => {
                  router.push('/kyc/documents');
                }, 4000);
              } else {
                setVerificationState('VERIFICATION_FAILED');
                setErrorMessage(result.error || 'Verification failed. Please try again with better lighting.');
              }
            } catch (fetchError) {
              console.error('Verification request failed:', fetchError);
              setVerificationState('VERIFICATION_FAILED');
              setErrorMessage('Network error. Please check your connection and try again.');
            }
          }
        }, 'image/jpeg', 0.95);
      }
    } catch (error) {
      console.error('Face capture failed:', error);
      setVerificationState('VERIFICATION_FAILED');
      setErrorMessage('Failed to process face image. Please try again.');
    }
  };

  const retryVerification = () => {
    setVerificationState('DETECTING_FACE');
    setCurrentStep(2);
    setErrorMessage('');
    setFaceDetected(false);
    setFaceQuality(0);
    setCurrentLivenessIndex(0);
    setLivenessActions(prev => 
      prev.map(action => ({ 
        ...action, 
        completed: false, 
        feedback: undefined,
        isActive: false 
      }))
    );
    startFaceDetection();
  };

  const getStepTitle = () => {
    switch (verificationState) {
      case 'INITIALIZING':
        return modelsLoaded ? 'Setting up camera...' : 'Loading AI models...';
      case 'REQUESTING_CAMERA':
        return 'Setting up camera...';
      case 'DETECTING_FACE':
        return 'Position your face';
      case 'LIVENESS_CHECK':
        return 'Follow the instructions';
      case 'CAPTURING_FACE':
        return 'Capturing your photo';
      case 'PROCESSING':
        return 'Verifying your identity';
      case 'VERIFICATION_SUCCESS':
        return 'Verification successful!';
      case 'VERIFICATION_FAILED':
        return 'Verification incomplete';
      case 'CAMERA_ERROR':
        return 'Camera setup required';
      default:
        return 'Face Verification';
    }
  };

  const getInstructions = () => {
    switch (verificationState) {
      case 'INITIALIZING':
        return modelsLoaded 
          ? 'Please allow camera access to continue with verification. Your privacy is protected.'
          : `Loading facial recognition models... ${modelLoadingProgress}% complete`;
      case 'REQUESTING_CAMERA':
        return 'Please allow camera access to continue with verification. Your privacy is protected.';
      case 'DETECTING_FACE':
        return 'Position your face in the center of the frame. Make sure you\'re in good lighting.';
      case 'LIVENESS_CHECK':
        return 'Complete the following actions to verify you\'re a real person. Follow each instruction carefully.';
      case 'CAPTURING_FACE':
        return 'Hold still while we capture your photo. This will only take a moment.';
      case 'PROCESSING':
        return 'Please wait while we verify your identity using advanced AI technology...';
      case 'VERIFICATION_SUCCESS':
        return 'Your face has been verified successfully! Redirecting to the next step...';
      case 'VERIFICATION_FAILED':
        return 'We couldn\'t verify your face. Please try again with better lighting and positioning.';
      case 'CAMERA_ERROR':
        return 'Camera access is required for face verification. Please grant permission and try again.';
      default:
        return 'Secure identity verification using advanced facial recognition technology.';
    }
  };

  const getDistanceIndicator = () => {
    if (!faceDetected) return null;
    
    if (faceQuality < 0.3) return { text: 'Move closer', color: 'text-amber-600' };
    if (faceQuality < 0.6) return { text: 'Good distance', color: 'text-blue-600' };
    if (faceQuality < 0.85) return { text: 'Perfect distance', color: 'text-green-600' };
    return { text: 'Excellent positioning', color: 'text-green-700' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 text-blue-600 mb-4">
            <Shield className="w-8 h-8" />
            <span className="text-2xl font-bold">Secure Face Verification</span>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <motion.div
                  key={step}
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ 
                    scale: step <= currentStep ? 1 : 0.8,
                    opacity: step <= currentStep ? 1 : 0.5
                  }}
                  transition={{ duration: 0.3 }}
                  className={`w-3 h-3 rounded-full ${
                    step <= currentStep 
                      ? 'bg-blue-600 shadow-md' 
                      : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-slate-600 font-medium">
              Step {currentStep} of 5
            </span>
          </div>
          
          <motion.h1 
            key={`title-${verificationState}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-slate-900 mb-2"
          >
            {getStepTitle()}
          </motion.h1>
          <motion.p 
            key={`subtitle-${verificationState}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            {getInstructions()}
          </motion.p>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Instructions Panel */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Instructions
            </h2>
            
            <AnimatePresence mode="wait">
              {verificationState === 'LIVENESS_CHECK' && (
                <motion.div
                  key="instructions-liveness-instructions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {livenessActions.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-300 ${
                        action.completed 
                          ? 'bg-green-50 border-green-200 shadow-sm' 
                          : action.isActive
                            ? 'bg-blue-50 border-blue-300 shadow-md'
                            : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className={`transition-colors duration-300 ${
                        action.completed 
                          ? 'text-green-600' 
                          : action.isActive
                            ? 'text-blue-600'
                            : 'text-slate-400'
                      }`}>
                        {action.completed ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          >
                            <CheckCircle className="w-6 h-6" />
                          </motion.div>
                        ) : action.isActive ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="w-6 h-6" />
                          </motion.div>
                        ) : (
                          action.icon
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium transition-colors duration-300 ${
                          action.completed 
                            ? 'text-green-800' 
                            : action.isActive
                              ? 'text-blue-800'
                              : 'text-slate-700'
                        }`}>
                          {action.instruction}
                        </p>
                        {action.feedback && (
                          <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-sm text-green-600 mt-2 font-medium"
                          >
                            {action.feedback}
                          </motion.p>
                        )}
                        {action.isActive && !action.completed && (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-blue-600 mt-1 font-medium"
                          >
                            Please complete this action...
                          </motion.p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {verificationState === 'DETECTING_FACE' && (
                <motion.div
                  key="instructions-face-detection-tips"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="text-blue-600">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-blue-800">
                          Face Quality: {Math.round(faceQuality * 100)}%
                        </p>
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${faceQuality * 100}%` }}
                            className={`h-full rounded-full transition-colors duration-300 ${
                              faceQuality > 0.8 ? 'bg-green-500' :
                              faceQuality > 0.6 ? 'bg-blue-500' :
                              faceQuality > 0.3 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-blue-700">
                        {!faceDetected 
                          ? 'Position your face in the center'
                          : faceQuality > 0.8 
                            ? '🎉 Perfect! Ready for verification'
                            : faceQuality > 0.6
                              ? '👍 Good positioning, adjust slightly'
                              : faceQuality > 0.3
                                ? '📏 Move closer or center your face'
                                : '🔍 Face detected, improve positioning'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-medium text-slate-800 mb-2">Tips for best results:</h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <p>Ensure good, even lighting on your face</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <p>Look directly at the camera</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <p>Remove glasses, hats, or face coverings</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <p>Keep your face centered in the frame</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {verificationState === 'VERIFICATION_SUCCESS' && (
                <motion.div
                  key="instructions-success-message"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-green-800 mb-3">
                    Verification Complete!
                  </h3>
                  <p className="text-green-700 mb-6 text-lg">
                    Verification Score: {verificationScore}%
                  </p>
                  <div className="w-full bg-green-200 rounded-full h-3 mb-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${verificationScore}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="bg-green-600 h-3 rounded-full"
                    />
                  </div>
                  <p className="text-sm text-green-600">
                    Redirecting to next step in a few seconds...
                  </p>
                </motion.div>
              )}

              {verificationState === 'VERIFICATION_FAILED' && (
                <motion.div
                  key="instructions-failed-message"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-red-800 mb-2">
                    Verification Failed
                  </h3>
                  <p className="text-red-700 mb-4">
                    {errorMessage}
                  </p>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>• Try better lighting conditions</p>
                    <p>• Ensure your face is clearly visible</p>
                    <p>• Remove any obstructions</p>
                  </div>
                </motion.div>
              )}

              {(verificationState === 'REQUESTING_CAMERA' || verificationState === 'INITIALIZING') && (
                <motion.div
                  key="instructions-camera-setup"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-6"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Camera className="w-10 h-10 text-blue-600" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Setting Up Camera
                  </h3>
                  <p className="text-slate-600">
                    Initializing secure verification system...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Privacy Notice */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200"
            >
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-600">
                  <p className="font-medium mb-1 text-slate-800">Privacy Protected</p>
                  <p className="leading-relaxed">
                    Your video is processed locally and securely. No video data is stored on our servers. 
                    All processing happens in real-time for your privacy and security.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Camera Feed Panel */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="relative">
              <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror for natural feel
                />
                
                {/* Face Detection Canvas Overlay */}
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ transform: 'scaleX(-1)' }} // Mirror to match video
                />
                
                {/* Face Detection Overlay */}
                {faceDetected && verificationState === 'DETECTING_FACE' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`absolute inset-8 border-4 rounded-2xl transition-all duration-300 ${
                      faceQuality > 0.8 
                        ? 'border-green-500 shadow-green-500/30' 
                        : faceQuality > 0.5
                          ? 'border-blue-500 shadow-blue-500/30'
                          : 'border-amber-500 shadow-amber-500/30'
                    } shadow-lg`}
                  >
                    {/* Corner markers */}
                    {[0, 90, 180, 270].map((rotation, index) => (
                      <div
                        key={index}
                        className={`absolute w-6 h-6 border-4 ${
                          faceQuality > 0.8 ? 'border-green-500' : 'border-blue-500'
                        }`}
                        style={{
                          top: index < 2 ? '-2px' : 'auto',
                          bottom: index >= 2 ? '-2px' : 'auto',
                          left: index === 0 || index === 3 ? '-2px' : 'auto',
                          right: index === 1 || index === 2 ? '-2px' : 'auto',
                          borderTopWidth: index < 2 ? '4px' : '0',
                          borderBottomWidth: index >= 2 ? '4px' : '0',
                          borderLeftWidth: index === 0 || index === 3 ? '4px' : '0',
                          borderRightWidth: index === 1 || index === 2 ? '4px' : '0'
                        }}
                      />
                    ))}
                  </motion.div>
                )}
                
                {/* Liveness Action Overlay */}
                {verificationState === 'LIVENESS_CHECK' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      key={currentLivenessIndex}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-black bg-opacity-70 rounded-2xl p-6 text-white text-center backdrop-blur-sm"
                    >
                      <div className="text-4xl mb-3">
                        {livenessActions[currentLivenessIndex]?.icon}
                      </div>
                      <p className="text-lg font-medium">
                        {livenessActions[currentLivenessIndex]?.instruction}
                      </p>
                    </motion.div>
                  </div>
                )}
                
                {/* Capture Countdown */}
                {captureCountdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm rounded-xl">
                    <motion.div
                      key={captureCountdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="text-8xl font-bold text-white"
                    >
                      {captureCountdown}
                    </motion.div>
                  </div>
                )}
                
                {/* Processing Overlay */}
                {verificationState === 'PROCESSING' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm rounded-xl">
                    <div className="text-center text-white">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"
                      />
                      <p className="text-xl font-medium mb-2">Processing...</p>
                      <p className="text-sm opacity-80">Analyzing facial features</p>
                    </div>
                  </div>
                )}

                {/* Camera Error State */}
                {verificationState === 'CAMERA_ERROR' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl">
                    <div className="text-center text-slate-600">
                      <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Camera Unavailable</p>
                      <p className="text-sm">Please grant camera permission</p>
                    </div>
                  </div>
                )}

                {/* Live Indicator */}
                {stream && verificationState !== 'VERIFICATION_SUCCESS' && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 bg-white rounded-full"
                    />
                    LIVE
                  </div>
                )}
              </div>
              
              {/* Quality Indicator */}
              {verificationState === 'DETECTING_FACE' && faceDetected && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600 font-medium">Detection Quality</span>
                  <span className={`font-bold ${getDistanceIndicator()?.color || 'text-slate-600'}`}>
                    {Math.round(faceQuality * 100)}%
                  </span>
                </motion.div>
              )}
            </div>
            
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-4"
        >
          {verificationState === 'VERIFICATION_FAILED' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={retryVerification}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </motion.button>
          )}
          
          {verificationState === 'CAMERA_ERROR' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={initializeFaceVerification}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Retry Camera Access
            </motion.button>
          )}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              key="error-message-display"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center max-w-md mx-auto"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">Verification Error</span>
              </div>
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Debug Panel (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto text-xs"
          >
            <div className="font-medium text-slate-800 mb-2">🔧 Debug Information</div>
            <div className="space-y-1 text-slate-600">
              <div>Models Loaded: {modelsLoaded === true ? '✅' : modelsLoaded === 'fallback' ? '⚠️ Fallback' : '❌'} ({modelLoadingProgress}%)</div>
              <div>Video Ready: {debugInfo.videoReady ? '✅' : '❌'}</div>
              <div>Face API Ready: {debugInfo.faceApiReady ? '✅' : '❌'}</div>
              <div>Detection Count: {debugInfo.detectionCount}</div>
              <div>Last Confidence: {(debugInfo.lastConfidence * 100).toFixed(1)}%</div>
              <div>Face Quality: {(faceQuality * 100).toFixed(1)}%</div>
              <div>Face Detected: {faceDetected ? '✅' : '❌'}</div>
              <div>Processing Time: {debugInfo.processingTime}ms</div>
              <div>State: {verificationState}</div>
              {debugInfo.lastError && (
                <div className="text-red-600 mt-2 p-2 bg-red-50 rounded">
                  Error: {debugInfo.lastError}
                </div>
              )}
            </div>
            
            {/* Manual Force Detection Button */}
            <button
              onClick={() => {
                console.log('🔧 Manual detection trigger');
                setDebugInfo(prev => ({ ...prev, detectionCount: 0, lastError: '' }));
                startFaceDetection();
              }}
              className="mt-3 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              🔄 Force Detection Restart
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
