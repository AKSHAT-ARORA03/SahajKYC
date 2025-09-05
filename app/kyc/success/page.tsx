'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  Mail, 
  MessageSquare, 
  ArrowRight, 
  Download,
  Home,
  FileText,
  Bell
} from 'lucide-react';

interface ApplicationDetails {
  applicationId: string;
  submittedAt: string;
  status: 'submitted' | 'in-review' | 'approved' | 'rejected';
  estimatedCompletionTime: string;
}

export default function KYCSuccessPage() {
  const router = useRouter();
  const [applicationDetails, setApplicationDetails] = useState<ApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApplicationDetails();
  }, []);

  const loadApplicationDetails = () => {
    try {
      const applicationId = sessionStorage.getItem('kycApplicationId');
      if (!applicationId) {
        // Redirect to KYC start if no application found
        router.push('/kyc/face-verification');
        return;
      }

      const details: ApplicationDetails = {
        applicationId,
        submittedAt: new Date().toISOString(),
        status: 'submitted',
        estimatedCompletionTime: '1-2 business days'
      };

      setApplicationDetails(details);
    } catch (error) {
      console.error('Error loading application details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    // Generate a simple text receipt
    const receipt = `
KYC APPLICATION RECEIPT
========================

Application ID: ${applicationDetails?.applicationId}
Submission Date: ${applicationDetails ? new Date(applicationDetails.submittedAt).toLocaleString() : ''}
Status: ${applicationDetails?.status.toUpperCase()}
Estimated Processing Time: ${applicationDetails?.estimatedCompletionTime}

Next Steps:
- Your application is now under review
- You will receive email updates on progress
- Additional documents may be requested
- Check your dashboard for status updates

Thank you for choosing our KYC verification service.
    `;

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KYC_Receipt_${applicationDetails?.applicationId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Processing your application...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
            <p className="text-xl text-gray-600">Your KYC verification is now under review</p>
          </motion.div>

          {/* Application Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Card className="border-2 border-green-200 bg-white shadow-lg">
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center justify-center text-green-800">
                  <FileText className="w-5 h-5 mr-2" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">Application ID:</span>
                    <Badge variant="outline" className="font-mono text-sm">
                      {applicationDetails?.applicationId}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">Submitted:</span>
                    <span className="font-semibold text-gray-900">
                      {applicationDetails ? new Date(applicationDetails.submittedAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">Status:</span>
                    <Badge className="bg-blue-500 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      Under Review
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">Expected Completion:</span>
                    <span className="font-semibold text-gray-900">
                      {applicationDetails?.estimatedCompletionTime}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* What Happens Next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  What Happens Next?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-blue-600 font-bold text-sm">1</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">Document Review</h4>
                      <p className="text-gray-600 text-sm">Our verification team will review your submitted documents and face verification results.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-blue-600 font-bold text-sm">2</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">Additional Information</h4>
                      <p className="text-gray-600 text-sm">If needed, we may request additional documents or clarification via email.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">Verification Complete</h4>
                      <p className="text-gray-600 text-sm">You'll receive email confirmation once your KYC verification is approved.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notification Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">Stay Updated</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-800 font-medium">Email Notifications</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-800 font-medium">SMS Updates Available</span>
                  </div>
                </div>
                <p className="text-blue-700 text-sm mt-4">
                  We'll send you real-time updates about your application status. 
                  Check your email regularly for important notifications.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={handleDownloadReceipt}
              variant="outline"
              className="sm:w-auto w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              className="sm:w-auto w-full bg-blue-600 hover:bg-blue-700"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            <Button
              onClick={() => router.push('/kyc/status')}
              variant="outline"
              className="sm:w-auto w-full"
            >
              Track Status
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 text-center"
          >
            <p className="text-gray-600 text-sm">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@company.com" className="text-blue-600 hover:underline">
                support@company.com
              </a>{' '}
              or call{' '}
              <a href="tel:+1-555-123-4567" className="text-blue-600 hover:underline">
                +1 (555) 123-4567
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
