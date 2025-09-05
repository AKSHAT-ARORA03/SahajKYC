// User and language types
export interface User {
  id?: string;
  phone?: string;
  email?: string;
  language: 'hi' | 'en' | 'bn' | 'ta';
  isFirstTime: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  fontSize: 'normal' | 'large' | 'xl';
  highContrast: boolean;
  voiceInstructions: boolean;
  notifications: boolean;
}

// KYC flow types
export type KYCStep = 'onboarding' | 'selection' | 'digilocker' | 'documents' | 'face' | 'review' | 'complete';
export type KYCMethod = 'digilocker' | 'documents';
export type DocumentType = 'aadhaar' | 'pan' | 'driving_license' | 'voter_id' | 'passport';

export interface KYCState {
  currentStep: KYCStep;
  selectedMethod?: KYCMethod;
  documents: DocumentData[];
  faceVerification?: FaceVerificationResult;
  isOffline: boolean;
  syncQueue: SyncItem[];
  progress: number; // 0-100
  errors: KYCError[];
}

// Document types
export interface DocumentData {
  id: string;
  type: DocumentType;
  frontImage?: string; // base64 or blob URL
  backImage?: string;
  extractedData?: ExtractedDocumentData;
  validationResult?: DocumentValidationResult;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  createdAt: Date;
}

export interface ExtractedDocumentData {
  name?: string;
  fatherName?: string;
  dateOfBirth?: string;
  address?: string;
  idNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  confidence: number; // 0-1
}

export interface DocumentValidationResult {
  isValid: boolean;
  isAuthentic: boolean;
  qualityScore: number; // 0-1
  issues: ValidationIssue[];
  confidence: number;
}

export interface ValidationIssue {
  type: 'blur' | 'glare' | 'missing_corners' | 'low_resolution' | 'suspicious_patterns';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

// Face verification types
export interface FaceVerificationResult {
  id: string;
  faceImage: string; // base64
  livenessScore: number; // 0-1
  matchScore?: number; // 0-1 (match with document photo)
  isLive: boolean;
  isMatch: boolean;
  confidence: number;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface LivenessCheckResult {
  isLive: boolean;
  confidence: number;
  challenges: LivenessChallenge[];
}

export interface LivenessChallenge {
  type: 'blink' | 'smile' | 'turn_head' | 'nod';
  completed: boolean;
  confidence: number;
}

// DigiLocker types
export interface DigilockerSession {
  sessionId: string;
  accessToken?: string;
  consentToken?: string;
  status: 'initiated' | 'consent_given' | 'documents_fetched' | 'completed' | 'failed';
  redirectUrl?: string;
  documents: DigilockerDocument[];
  expiresAt: Date;
}

export interface DigilockerDocument {
  docType: string;
  docId: string;
  issuer: string;
  issueDate: string;
  name: string;
  uri: string;
  downloadUrl?: string;
}

// Offline sync types
export interface SyncItem {
  id: string;
  type: 'document' | 'face_verification' | 'kyc_submission';
  data: any;
  priority: 'low' | 'medium' | 'high';
  retries: number;
  createdAt: Date;
  lastAttempt?: Date;
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export interface KYCSubmissionRequest {
  userId: string;
  method: KYCMethod;
  documents: DocumentData[];
  faceVerification: FaceVerificationResult;
  digilockerSession?: DigilockerSession;
  metadata: {
    userAgent: string;
    ipAddress?: string;
    location?: GeolocationCoordinates;
    deviceInfo: DeviceInfo;
  };
}

export interface DeviceInfo {
  platform: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

// Error handling types
export interface KYCError {
  id: string;
  type: 'network' | 'validation' | 'permission' | 'camera' | 'processing' | 'server';
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

// Camera and media types
export interface CameraCapture {
  image: string; // base64
  quality: number;
  resolution: { width: number; height: number };
  timestamp: Date;
}

export interface CameraConstraints {
  video: {
    width: { ideal: number; max: number };
    height: { ideal: number; max: number };
    facingMode: 'user' | 'environment';
  };
}

// Language and localization types
export interface LocalizedText {
  hi: string;
  en: string;
  bn: string;
  ta: string;
}

export interface LanguageConfig {
  code: 'hi' | 'en' | 'bn' | 'ta';
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

// Analytics and tracking types
export interface AnalyticsEvent {
  event: string;
  category: 'kyc' | 'ui' | 'error' | 'performance';
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

// Form validation types
export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// Progressive Web App types
export interface PWAInstallEvent {
  prompt: () => Promise<void>;
  outcome: 'accepted' | 'dismissed';
}

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

// Geolocation types (for compliance and security)
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  city?: string;
  state?: string;
  country?: string;
}

export default {};
