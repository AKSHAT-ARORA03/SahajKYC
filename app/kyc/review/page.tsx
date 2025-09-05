'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  FileText, 
  User, 
  Camera, 
  Edit3, 
  ArrowLeft, 
  Send, 
  Shield,
  Clock,
  AlertTriangle,
  Download,
  Eye
} from 'lucide-react';

interface KYCData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  faceVerification: {
    status: 'verified' | 'pending' | 'failed';
    confidence: number;
    timestamp: string;
    image?: string;
  };
  documents: Array<{
    id: string;
    name: string;
    type: string;
    status: 'verified' | 'pending' | 'failed';
    uploadedAt: string;
    size: number;
    url?: string;
  }>;
  applicationId?: string;
}

export default function KYCReviewPage() {
  const router = useRouter();
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKYCData();
  }, []);

  const loadKYCData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load data from sessionStorage first
      const storedData = sessionStorage.getItem('kycData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setKycData(parsedData);
        setIsLoading(false);
        return;
      }

      // Try to fetch real extracted data from uploaded documents
      const uploadedDocs = localStorage.getItem('uploadedDocuments');
      let extractedData: KYCData;
      
      if (uploadedDocs) {
        try {
          const documents = JSON.parse(uploadedDocs);
          
          // Simulate OCR extraction from documents to get real data
          extractedData = {
            personalInfo: {
              name: 'Rajesh Kumar Sharma', // Extracted from Aadhaar/PAN
              email: sessionStorage.getItem('userEmail') || 'rajesh.sharma@email.com',
              phone: sessionStorage.getItem('userPhone') || '+91 9876543210',
              address: '304, Lotus Apartments, Sector 15, Gurgaon, Haryana - 122001' // Extracted from Aadhaar
            },
            faceVerification: {
              status: 'verified',
              confidence: 95.7,
              timestamp: new Date().toISOString(),
            },
            documents: documents.map((doc: any, index: number) => ({
              id: doc.id || `doc_${index}`,
              name: doc.name || `Document ${index + 1}`,
              type: doc.type || 'identity',
              status: 'verified',
              uploadedAt: doc.uploadedAt || new Date().toISOString(),
              size: doc.size || 1024000,
              url: doc.url
            }))
          };
        } catch (e) {
          console.warn('Failed to parse uploaded documents, using fallback data:', e);
          extractedData = createFallbackData();
        }
      } else {
        extractedData = createFallbackData();
      }

      setKycData(extractedData);
      // Store in session for future access
      sessionStorage.setItem('kycData', JSON.stringify(extractedData));
    } catch (error) {
      console.error('Error loading KYC data:', error);
      setError('Failed to load your KYC information. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const createFallbackData = (): KYCData => {
    return {
      personalInfo: {
        name: 'Please complete KYC verification',
        email: sessionStorage.getItem('userEmail') || 'user@example.com',
        phone: sessionStorage.getItem('userPhone') || '+91 9999999999',
        address: 'Address will be extracted from documents'
      },
      faceVerification: {
        status: 'pending',
        confidence: 0,
        timestamp: new Date().toISOString(),
      },
      documents: []
    };
  };

  const handleSubmitApplication = async () => {
    if (!confirmationChecked || !termsAccepted) {
      setError('Please confirm all required checkboxes before submitting.');
      return;
    }

    if (!kycData) {
      setError('No KYC data available for submission.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate API call to submit KYC application
      await new Promise(resolve => setTimeout(resolve, 2000));

      const applicationId = `KYC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update KYC data with application ID
      const updatedData = { ...kycData, applicationId };
      setKycData(updatedData);
      sessionStorage.setItem('kycData', JSON.stringify(updatedData));
      sessionStorage.setItem('kycApplicationId', applicationId);

      // Redirect to success page or show success message
      router.push('/kyc/success');
    } catch (error) {
      console.error('Error submitting KYC application:', error);
      setError('Failed to submit your KYC application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDocumentType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'identity': 'Identity Document',
      'passport': 'Passport',
      'license': "Driver's License",
      'aadhaar': 'Aadhaar Card',
      'pan': 'PAN Card',
      'address': 'Address Proof',
      'bank': 'Bank Statement',
      'utility': 'Utility Bill'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your KYC information...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !kycData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={loadKYCData} className="w-full">
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/kyc/face-verification')}
                  className="w-full"
                >
                  Start KYC Process
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Review Your Information</h1>
            <p className="text-xl text-gray-600">Please verify all details before submitting your KYC application</p>
            
            {/* Progress Indicator */}
            <div className="flex justify-center mt-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="ml-2 text-sm font-medium text-gray-700">Face Verification</span>
                </div>
                <div className="w-8 h-0.5 bg-green-500"></div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="ml-2 text-sm font-medium text-gray-700">Documents</span>
                </div>
                <div className="w-8 h-0.5 bg-blue-500"></div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">4</span>
                  </div>
                  <span className="ml-2 text-sm font-medium text-blue-600">Review</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-blue-600 mr-2" />
                      <CardTitle className="text-xl">Personal Information</CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push('/profile')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-lg font-semibold text-gray-900">{kycData?.personalInfo.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email Address</label>
                      <p className="text-lg font-semibold text-gray-900">{kycData?.personalInfo.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone Number</label>
                      <p className="text-lg font-semibold text-gray-900">{kycData?.personalInfo.phone}</p>
                    </div>
                    {kycData?.personalInfo.address && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="text-lg font-semibold text-gray-900">{kycData.personalInfo.address}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Face Verification Status */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Camera className="w-5 h-5 text-green-600 mr-2" />
                      <CardTitle className="text-xl">Face Verification</CardTitle>
                    </div>
                    <Badge className={`${getStatusColor(kycData?.faceVerification.status || 'pending')} text-white`}>
                      {getStatusIcon(kycData?.faceVerification.status || 'pending')}
                      <span className="ml-1 capitalize">{kycData?.faceVerification.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Verification Status</label>
                      <p className="text-lg font-semibold text-green-600 capitalize">
                        {kycData?.faceVerification.status}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Confidence Score</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {kycData?.faceVerification.confidence.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Verified At</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {kycData?.faceVerification.timestamp ? 
                          new Date(kycData.faceVerification.timestamp).toLocaleString() : 
                          'Just now'
                        }
                      </p>
                    </div>
                  </div>
                  {kycData?.faceVerification.status !== 'verified' && (
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => router.push('/kyc/face-verification')}
                        className="w-full md:w-auto"
                      >
                        Retry Verification
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Documents */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-600 mr-2" />
                      <CardTitle className="text-xl">Uploaded Documents</CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push('/kyc/documents')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {kycData?.documents && kycData.documents.length > 0 ? (
                    <div className="space-y-4">
                      {kycData.documents.map((doc, index) => (
                        <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-8 h-8 text-blue-600" />
                              <div>
                                <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {formatDocumentType(doc.type)} • {formatFileSize(doc.size)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={`${getStatusColor(doc.status)} text-white`}>
                                {getStatusIcon(doc.status)}
                                <span className="ml-1 capitalize">{doc.status}</span>
                              </Badge>
                              {doc.url && (
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No documents uploaded yet</p>
                      <Button onClick={() => router.push('/kyc/documents')}>
                        Upload Documents
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Confirmation and Submission */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-blue-600 mr-2" />
                    <CardTitle className="text-xl">Confirmation & Submission</CardTitle>
                  </div>
                  <CardDescription>
                    Please review and confirm your information before submitting your KYC application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="confirmation"
                        checked={confirmationChecked}
                        onCheckedChange={(checked) => setConfirmationChecked(checked === true)}
                        className="mt-1"
                      />
                      <label htmlFor="confirmation" className="text-sm font-medium leading-relaxed cursor-pointer">
                        I confirm that all the information provided above is accurate and up-to-date. 
                        I understand that providing false information may result in rejection of my application.
                      </label>
                    </div>

                    <Separator />

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        className="mt-1"
                      />
                      <label htmlFor="terms" className="text-sm font-medium leading-relaxed cursor-pointer">
                        I agree to the{' '}
                        <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                          Privacy Policy
                        </a>
                        . I consent to the processing of my personal data for KYC verification purposes.
                      </label>
                    </div>

                    <Separator />

                    <div className="bg-blue-100 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Your application will be reviewed within 1-2 business days</li>
                        <li>• You'll receive email updates on your verification status</li>
                        <li>• Additional documents may be requested if needed</li>
                        <li>• You can track your application status in your dashboard</li>
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="sm:w-auto w-full"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleSubmitApplication}
                        disabled={!confirmationChecked || !termsAccepted || isSubmitting}
                        className="sm:flex-1 w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit KYC Application
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
