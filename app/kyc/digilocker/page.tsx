'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Building2, Shield, FileText, Loader2 } from 'lucide-react';
import { useKYCStore, useKYCActions, useLanguage } from '@/lib/store';
import { getLocalizedText } from '@/lib/i18n';

type DigiLockerStep = 'explanation' | 'consent' | 'redirecting' | 'processing' | 'success' | 'error';

export default function DigiLockerPage() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const language = useLanguage();
  const { kyc } = useKYCStore();
  const { setKYCStep, updateProgress } = useKYCActions();
  
  const [currentStep, setCurrentStep] = useState<DigiLockerStep>('explanation');
  const [isLoading, setIsLoading] = useState(false);

  const t = (key: string) => getLocalizedText(key, language);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    // Update progress based on current step
    const progressMap = {
      explanation: 25,
      consent: 40,
      redirecting: 60,
      processing: 80,
      success: 100,
      error: 25
    };
    updateProgress(progressMap[currentStep]);
  }, [currentStep, updateProgress, isHydrated]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (currentStep === 'explanation') {
      router.push('/kyc');
    } else {
      setCurrentStep('explanation');
    }
  };

  const handleContinue = () => {
    setCurrentStep('consent');
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setCurrentStep('redirecting');
    
    // Simulate DigiLocker connection process
    setTimeout(() => {
      setCurrentStep('processing');
      
      // Simulate document fetch
      setTimeout(() => {
        setCurrentStep('success');
        setIsLoading(false);
        
        // Auto redirect after success
        setTimeout(() => {
          setKYCStep('face');
          router.push('/kyc/face-verification');
        }, 2000);
      }, 3000);
    }, 2000);
  };

  const handleRetry = () => {
    setCurrentStep('explanation');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="touch-target"
              disabled={isLoading}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              DigiLocker
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-gray-100">
        <div className="container-mobile py-3">
          <div className="flex items-center space-x-2">
            <div className="progress-step-completed">1</div>
            <div className="h-1 flex-1 bg-gray-200 rounded">
              <div className="h-1 bg-primary rounded w-full"></div>
            </div>
            <div className={`progress-step ${currentStep === 'success' ? 'progress-step-completed' : 'progress-step-active'}`}>
              2
            </div>
            <div className="h-1 flex-1 bg-gray-200 rounded">
              <div className={`h-1 bg-primary rounded ${currentStep === 'success' ? 'w-1/2' : 'w-0'}`}></div>
            </div>
            <div className="progress-step-inactive">3</div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            चरण 2 का 3: DigiLocker से दस्तावेज़
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-mobile py-6">
        {currentStep === 'explanation' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl-readable font-bold text-gray-900 mb-3">
                {t('digilocker.title')}
              </h2>
              <p className="text-gray-600 text-base-readable">
                DigiLocker भारत सरकार का आधिकारिक डिजिटल प्लेटफॉर्म है
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('digilocker.point1')}
                  </h3>
                  <p className="text-gray-600 text-base-readable">
                    सभी दस्तावेज़ वैध और सुरक्षित हैं
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <FileText className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('digilocker.point2')}
                  </h3>
                  <p className="text-gray-600 text-base-readable">
                    आपका डेटा एन्क्रिप्टेड रहता है
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <ExternalLink className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('digilocker.point3')}
                  </h3>
                  <p className="text-gray-600 text-base-readable">
                    OTP से आसान लॉगिन
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleContinue}
              className="w-full btn-kyc text-lg"
              size="lg"
            >
              समझ गया, आगे बढ़ें
            </Button>
          </div>
        )}

        {currentStep === 'consent' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl-readable font-bold text-gray-900 mb-3">
                DigiLocker से जुड़ें
              </h2>
            </div>

            <Card className="kyc-card mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                हमें ये दस्तावेज़ चाहिए:
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-gray-700">आधार कार्ड</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-gray-700">PAN कार्ड</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm">
                  ✓ हम केवल आवश्यक जानकारी लेंगे<br/>
                  ✓ आपकी निजता सुरक्षित रहेगी
                </p>
              </div>
            </Card>

            <Button 
              onClick={handleConnect}
              className="w-full btn-kyc text-lg"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  कनेक्ट हो रहा है...
                </>
              ) : (
                <>
                  DigiLocker खोलें
                  <ExternalLink className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}

        {currentStep === 'redirecting' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              DigiLocker खुल रहा है...
            </h2>
            <p className="text-gray-600 mb-6">
              कृपया प्रतीक्षा करें, आपको DigiLocker पर भेजा जा रहा है
            </p>
            <div className="loading-shimmer h-2 rounded-full"></div>
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              दस्तावेज़ ला रहे हैं...
            </h2>
            <p className="text-gray-600 mb-6">
              आपके दस्तावेज़ सुरक्षित तरीके से डाउनलोड हो रहे हैं
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>आधार कार्ड</span>
                <span className="text-success">✓ मिल गया</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>PAN कार्ड</span>
                <span className="text-primary">डाउनलोड हो रहा...</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              दस्तावेज़ मिल गए! ✓
            </h2>
            <p className="text-gray-600 mb-6">
              सभी आवश्यक दस्तावेज़ सफलतापूर्वक प्राप्त हो गए हैं
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span>आधार कार्ड</span>
                <span className="text-success">✓ सत्यापित</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>PAN कार्ड</span>
                <span className="text-success">✓ सत्यापित</span>
              </div>
            </div>
            <p className="text-primary font-medium">
              अगला चरण: चेहरा सत्यापन
            </p>
          </div>
        )}

        {currentStep === 'error' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-destructive rounded-full flex items-center justify-center mx-auto mb-6">
              <ExternalLink className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              कुछ समस्या हुई
            </h2>
            <p className="text-gray-600 mb-6">
              DigiLocker से जुड़ने में समस्या हुई। कृपया दोबारा कोशिश करें।
            </p>
            <Button 
              onClick={handleRetry}
              className="w-full btn-kyc text-lg"
              size="lg"
            >
              दोबारा कोशिश करें
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
