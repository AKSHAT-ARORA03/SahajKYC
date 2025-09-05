'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Mail, 
  Phone, 
  ArrowLeft,
  RefreshCw,
  Download,
  Eye,
  MessageSquare
} from 'lucide-react';

interface ApplicationStatus {
  applicationId: string;
  status: 'submitted' | 'in-review' | 'approved' | 'rejected' | 'pending-documents';
  submittedAt: string;
  lastUpdated: string;
  estimatedCompletion: string;
  steps: Array<{
    name: string;
    status: 'completed' | 'in-progress' | 'pending' | 'failed';
    completedAt?: string;
    description: string;
  }>;
  messages?: Array<{
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    timestamp: string;
    actionRequired?: boolean;
  }>;
}

export default function KYCStatusPage() {
  const router = useRouter();
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplicationStatus();
  }, []);

  const loadApplicationStatus = async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      
      setError(null);

      const applicationId = sessionStorage.getItem('kycApplicationId');
      if (!applicationId) {
        setError('No KYC application found. Please submit your KYC application first.');
        return;
      }

      // Simulate API call - in real implementation, this would fetch from backend
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockStatus: ApplicationStatus = {
        applicationId,
        status: 'in-review',
        submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        lastUpdated: new Date().toISOString(),
        estimatedCompletion: '1 business day remaining',
        steps: [
          {
            name: 'Application Submitted',
            status: 'completed',
            completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            description: 'Your KYC application has been successfully submitted'
          },
          {
            name: 'Document Verification',
            status: 'completed',
            completedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
            description: 'Identity documents have been verified and approved'
          },
          {
            name: 'Face Verification',
            status: 'completed',
            completedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
            description: 'Biometric face verification completed successfully'
          },
          {
            name: 'Background Check',
            status: 'in-progress',
            description: 'Conducting enhanced due diligence and background verification'
          },
          {
            name: 'Final Review',
            status: 'pending',
            description: 'Compliance team final review and approval'
          },
          {
            name: 'Account Activation',
            status: 'pending',
            description: 'Your account will be activated upon approval'
          }
        ],
        messages: [
          {
            id: '1',
            type: 'success',
            title: 'Documents Verified',
            message: 'All your submitted documents have been successfully verified.',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            type: 'info',
            title: 'Background Check in Progress',
            message: 'We are currently conducting enhanced due diligence checks. This process may take 1-2 business days.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          }
        ]
      };

      setApplicationStatus(mockStatus);
    } catch (error) {
      console.error('Error loading application status:', error);
      setError('Failed to load application status. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'approved': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'in-review': return 'bg-blue-500';
      case 'pending': return 'bg-gray-400';
      case 'failed': return 'bg-red-500';
      case 'rejected': return 'bg-red-500';
      case 'pending-documents': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'in-progress':
      case 'in-review':
        return <Clock className="w-4 h-4" />;
      case 'failed':
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'submitted': 'Submitted',
      'in-review': 'Under Review',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'pending-documents': 'Pending Documents'
    };
    return statusMap[status] || status;
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
          <p className="text-gray-600 font-medium">Loading application status...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Status</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => loadApplicationStatus()} className="w-full">
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/kyc/face-verification')}
                  className="w-full"
                >
                  Start New Application
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Application Status</h1>
              <p className="text-xl text-gray-600">Track your KYC verification progress</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => loadApplicationStatus(true)}
                disabled={isRefreshing}
                className="flex items-center"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Application Overview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Application Overview</CardTitle>
                      <CardDescription>
                        Application ID: {applicationStatus?.applicationId}
                      </CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(applicationStatus?.status || 'pending')} text-white`}>
                      {getStatusIcon(applicationStatus?.status || 'pending')}
                      <span className="ml-1">{formatStatus(applicationStatus?.status || 'pending')}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Submitted</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {applicationStatus?.submittedAt ? 
                          new Date(applicationStatus.submittedAt).toLocaleDateString() : 
                          'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {applicationStatus?.lastUpdated ? 
                          new Date(applicationStatus.lastUpdated).toLocaleDateString() : 
                          'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Est. Completion</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {applicationStatus?.estimatedCompletion || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Progress Steps */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Verification Progress</CardTitle>
                  <CardDescription>Track the progress of your KYC verification</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {applicationStatus?.steps.map((step, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(step.status)} text-white flex-shrink-0`}>
                          {step.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : step.status === 'in-progress' ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">{step.name}</h4>
                            {step.completedAt && (
                              <span className="text-sm text-gray-500">
                                {new Date(step.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Messages and Updates */}
            {applicationStatus?.messages && applicationStatus.messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Recent Updates
                    </CardTitle>
                    <CardDescription>Important messages about your application</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {applicationStatus.messages.map((message) => (
                        <div key={message.id} className="border rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            {getMessageIcon(message.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">{message.title}</h4>
                                <span className="text-sm text-gray-500">
                                  {new Date(message.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{message.message}</p>
                              {message.actionRequired && (
                                <Badge variant="outline" className="mt-2 text-orange-600 border-orange-300">
                                  Action Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Contact and Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-900">Need Help?</CardTitle>
                  <CardDescription className="text-blue-700">
                    Our support team is here to assist you with your KYC verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Email Support</p>
                        <a 
                          href="mailto:kyc@company.com" 
                          className="text-blue-600 hover:underline text-sm"
                        >
                          kyc@company.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Phone Support</p>
                        <a 
                          href="tel:+1-555-123-4567" 
                          className="text-blue-600 hover:underline text-sm"
                        >
                          +1 (555) 123-4567
                        </a>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <p className="text-blue-700 text-sm">
                    <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST<br />
                    <strong>Average Response Time:</strong> Within 2 hours during business hours
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
