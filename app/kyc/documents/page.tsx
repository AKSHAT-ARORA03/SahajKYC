'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Camera, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Eye,
  Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DocumentsPage() {
  const router = useRouter();
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);
      formData.append('userId', 'user_' + Math.random().toString(36).substr(2, 9)); // Generate random user ID for demo

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      console.log('📤 Upload response:', result);

      if (result.success) {
        setUploadedDocs(prev => [...prev, {
          id: result.data.fileId,
          type: docType,
          filename: result.data.fileName,
          savedFileName: result.data.savedFileName,
          status: result.data.status,
          uploadedAt: result.data.uploadedAt,
          fileSize: result.data.fileSizeFormatted,
          extractedData: result.data.extractedData,
          processing: result.data.processing
        }]);
      } else {
        // Show specific API error with code if available
        const errorMessage = result.details 
          ? `${result.error} (${result.code}): ${result.details}`
          : result.error || 'Upload failed';
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Document upload error:', err);
      
      // Handle network errors
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to upload document');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Navigate to DigiLocker flow
  const startDigiLockerFlow = () => {
    router.push('/kyc/digilocker');
  };

  // Continue to next step
  const continueToNext = () => {
    router.push('/kyc/review');
  };

  const documentTypes = [
    {
      id: 'aadhaar',
      name: 'Aadhaar Card',
      description: 'Government-issued identity proof',
      icon: Shield,
      required: true,
      maxSize: '5MB',
      formats: ['JPG', 'PNG', 'PDF']
    },
    {
      id: 'pan',
      name: 'PAN Card', 
      description: 'Permanent Account Number card',
      icon: FileText,
      required: true,
      maxSize: '5MB',
      formats: ['JPG', 'PNG', 'PDF']
    },
    {
      id: 'driving_license',
      name: 'Driving License',
      description: 'Valid driving license (optional)',
      icon: FileText,
      required: false,
      maxSize: '5MB',
      formats: ['JPG', 'PNG', 'PDF']
    },
    {
      id: 'passport',
      name: 'Passport',
      description: 'Indian passport (optional)',
      icon: FileText,
      required: false,
      maxSize: '5MB',
      formats: ['JPG', 'PNG', 'PDF']
    }
  ];

  const isRequiredDocumentsUploaded = documentTypes
    .filter(doc => doc.required)
    .every(doc => uploadedDocs.some(uploaded => uploaded.type === doc.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Upload</h1>
          <p className="text-gray-600">Upload your identity documents for verification</p>
        </div>

        {/* DigiLocker Option */}
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Shield className="h-6 w-6" />
              Quick Verification with DigiLocker
            </CardTitle>
            <CardDescription className="text-blue-700">
              Get verified documents instantly from the government's secure digital locker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800 mb-2">Benefits:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Instant document verification</li>
                  <li>• No manual uploads needed</li>
                  <li>• Government-verified authenticity</li>
                  <li>• Supports Aadhaar, PAN, DL, and more</li>
                </ul>
              </div>
              <Button onClick={startDigiLockerFlow} className="bg-blue-600 hover:bg-blue-700">
                <Shield className="h-4 w-4 mr-2" />
                Use DigiLocker
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Upload Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Or Upload Documents Manually</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {documentTypes.map((docType) => {
              const isUploaded = uploadedDocs.some(doc => doc.type === docType.id);
              const IconComponent = docType.icon;
              
              return (
                <Card key={docType.id} className={`${isUploaded ? 'border-green-500 bg-green-50' : ''}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      {docType.name}
                      {docType.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                      {isUploaded && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{docType.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-xs text-gray-500">
                        <p>Max size: {docType.maxSize}</p>
                        <p>Formats: {docType.formats.join(', ')}</p>
                      </div>
                      
                      {!isUploaded ? (
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e, docType.id)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploading}
                          />
                          <Button 
                            variant="outline" 
                            className="w-full"
                            disabled={isUploading}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {isUploading ? 'Uploading...' : 'Upload Document'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Upload className="h-4 w-4 mr-2" />
                            Replace
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Tips */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">📸 Upload Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Photo Quality:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Clear, well-lit images</li>
                  <li>• All corners visible</li>
                  <li>• No blur or glare</li>
                  <li>• High resolution (min 300 DPI)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Document Requirements:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Original documents only</li>
                  <li>• Valid and not expired</li>
                  <li>• Text should be readable</li>
                  <li>• No photocopies accepted</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Documents Summary */}
        {uploadedDocs.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadedDocs.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{doc.filename}</p>
                        <p className="text-sm text-gray-500">
                          {documentTypes.find(dt => dt.id === doc.type)?.name} • 
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <div className="text-center">
          {isRequiredDocumentsUploaded ? (
            <Button onClick={continueToNext} size="lg" className="px-8">
              Continue to Review
            </Button>
          ) : (
            <p className="text-gray-500">
              Please upload all required documents to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
