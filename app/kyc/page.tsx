'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronRight, Building2, Camera, Clock, Zap } from 'lucide-react';
import { useKYCStore, useKYCActions, useLanguage } from '@/lib/store';
import { getLocalizedText } from '@/lib/i18n';

export default function KYCSelectionPage() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const language = useLanguage();
  const { kyc } = useKYCStore();
  const { setKYCStep, setKYCMethod } = useKYCActions();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const t = (key: string) => getLocalizedText(key, language);

  const handleMethodSelect = (method: 'digilocker' | 'documents') => {
    setKYCMethod(method);
    if (method === 'digilocker') {
      setKYCStep('digilocker');
      router.push('/kyc/digilocker');
    } else {
      setKYCStep('documents');
      router.push('/kyc/documents');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

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
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              KYC Verification
            </h1>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-gray-100">
        <div className="container-mobile py-3">
          <div className="flex items-center space-x-2">
            <div className="progress-step-completed">1</div>
            <div className="h-1 flex-1 bg-gray-200 rounded">
              <div className="h-1 bg-primary rounded w-1/4"></div>
            </div>
            <div className="progress-step-inactive">2</div>
            <div className="h-1 flex-1 bg-gray-200 rounded"></div>
            <div className="progress-step-inactive">3</div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            चरण 1 का 3: सत्यापन विधि चुनें
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-mobile py-6">
        <div className="text-center mb-8">
          <h2 className="text-xl-readable font-bold text-gray-900 mb-3">
            {t('kycSelection.title')}
          </h2>
          <p className="text-gray-600 text-base-readable">
            अपने लिए सबसे आसान तरीका चुनें
          </p>
        </div>

        <div className="space-y-4">
          {/* DigiLocker Option */}
          <Card 
            className="kyc-card-interactive"
            onClick={() => handleMethodSelect('digilocker')}
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('kycSelection.digilockerTitle')}
                  </h3>
                  <Badge variant="default" className="bg-success text-white">
                    {t('kycSelection.recommended')}
                  </Badge>
                </div>
                <p className="text-gray-600 text-base-readable mb-3">
                  {t('kycSelection.digilockerSubtitle')}
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Zap className="w-4 h-4 text-success" />
                    <span className="text-success font-medium">
                      {t('kycSelection.easy')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      {t('kycSelection.time2min')}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Card>

          {/* Manual Documents Option */}
          <Card 
            className="kyc-card-interactive"
            onClick={() => handleMethodSelect('documents')}
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Camera className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('kycSelection.documentsTitle')}
                </h3>
                <p className="text-gray-600 text-base-readable mb-3">
                  {t('kycSelection.documentsSubtitle')}
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-warning rounded-full"></span>
                    <span className="text-warning font-medium">
                      {t('kycSelection.moderate')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      {t('kycSelection.time5min')}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Card>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">
            💡 कौन सा तरीका बेहतर है?
          </h4>
          <p className="text-blue-800 text-sm leading-relaxed">
            <strong>DigiLocker</strong> सबसे तेज़ और सुरक्षित है क्योंकि यह सरकारी दस्तावेज़ सीधे लेता है। 
            अगर आपके पास DigiLocker है तो इसे चुनें।
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            🔒 आपकी सभी जानकारी एन्क्रिप्टेड और सुरक्षित है
          </p>
        </div>
      </div>
    </div>
  );
}
