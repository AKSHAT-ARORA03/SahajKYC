'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  FileText, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Settings,
  Bell,
  Download,
  Eye,
  Plus
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  const kycStatus = {
    status: 'in-review',
    applicationId: 'KYC_12345678',
    submittedDate: '2025-09-04',
    progress: 75
  };

  const recentActivity = [
    {
      id: '1',
      type: 'kyc_submitted',
      title: 'KYC Application Submitted',
      description: 'Your KYC verification application has been submitted for review',
      timestamp: '2 hours ago',
      icon: FileText
    },
    {
      id: '2',
      type: 'documents_verified',
      title: 'Documents Verified',
      description: 'All uploaded documents have been successfully verified',
      timestamp: '1 day ago',
      icon: CheckCircle
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-xl text-gray-600">Welcome back! Here's your account overview</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {/* KYC Status Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-blue-900">KYC Verification Status</CardTitle>
                      <CardDescription className="text-blue-700">
                        Application ID: {kycStatus.applicationId}
                      </CardDescription>
                    </div>
                    <Badge className="bg-blue-500 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      Under Review
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-blue-700">Progress</label>
                      <div className="flex items-center mt-1">
                        <div className="w-full bg-blue-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${kycStatus.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-blue-900 font-semibold text-sm">{kycStatus.progress}%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-blue-700">Submitted</label>
                      <p className="text-lg font-semibold text-blue-900 mt-1">{kycStatus.submittedDate}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-blue-700">Expected Completion</label>
                      <p className="text-lg font-semibold text-blue-900 mt-1">1-2 Days</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm"
                      onClick={() => router.push('/kyc/status')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push('/kyc/documents')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Manage Documents
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Quick Actions</CardTitle>
                    <CardDescription>Common tasks and services</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <Button 
                        variant="outline" 
                        className="justify-start h-auto p-4"
                        onClick={() => router.push('/kyc/face-verification')}
                      >
                        <User className="w-5 h-5 mr-3" />
                        <div className="text-left">
                          <p className="font-semibold">Update Profile</p>
                          <p className="text-sm text-gray-600">Manage your personal information</p>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start h-auto p-4"
                        onClick={() => router.push('/kyc/documents')}
                      >
                        <FileText className="w-5 h-5 mr-3" />
                        <div className="text-left">
                          <p className="font-semibold">Upload Documents</p>
                          <p className="text-sm text-gray-600">Add or update verification documents</p>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start h-auto p-4"
                        onClick={() => router.push('/kyc/status')}
                      >
                        <Clock className="w-5 h-5 mr-3" />
                        <div className="text-left">
                          <p className="font-semibold">Track Application</p>
                          <p className="text-sm text-gray-600">Monitor your KYC verification progress</p>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Recent Activity</CardTitle>
                    <CardDescription>Your latest account activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.map((activity) => {
                        const Icon = activity.icon;
                        return (
                          <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">{activity.title}</p>
                              <p className="text-gray-600 text-xs mt-1">{activity.description}</p>
                              <p className="text-gray-500 text-xs mt-1">{activity.timestamp}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Account Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Account Overview</CardTitle>
                  <CardDescription>Your account information and status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Profile</h4>
                      <Badge className="bg-green-500 text-white mt-1">Complete</Badge>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Documents</h4>
                      <Badge className="bg-blue-500 text-white mt-1">Under Review</Badge>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Face Verification</h4>
                      <Badge className="bg-green-500 text-white mt-1">Verified</Badge>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Account Status</h4>
                      <Badge className="bg-yellow-500 text-white mt-1">Pending</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Help and Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
                    <p className="text-blue-700 mb-4">
                      Our support team is available 24/7 to assist you with any questions or concerns.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="outline" size="sm" className="bg-white">
                        Contact Support
                      </Button>
                      <Button variant="outline" size="sm" className="bg-white">
                        View FAQ
                      </Button>
                      <Button variant="outline" size="sm" className="bg-white">
                        Live Chat
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
