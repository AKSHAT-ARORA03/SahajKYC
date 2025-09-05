'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Shield, Clock, CheckCircle, Globe } from 'lucide-react';
import { useKYCStore, useUserActions, useAppActions } from '@/lib/store';
import { SUPPORTED_LANGUAGES, getLocalizedText } from '@/lib/i18n';

export default function OnboardingPage() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const { user, showOnboarding } = useKYCStore();
  const { setLanguage } = useUserActions();
  const { completeOnboarding } = useAppActions();
  const [currentStep, setCurrentStep] = useState<'language' | 'intro' | 'permissions'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<'hi' | 'en' | 'bn' | 'ta'>('hi');

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
    setSelectedLanguage(user.language);
  }, [user.language]);

  // Skip onboarding if user has already completed it
  useEffect(() => {
    if (isHydrated && !showOnboarding) {
      router.push('/kyc');
    }
  }, [showOnboarding, router, isHydrated]);

  // Don't render until hydrated to prevent mismatches
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-primary/20 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  const handleLanguageSelect = (languageCode: 'hi' | 'en' | 'bn' | 'ta') => {
    setSelectedLanguage(languageCode);
    setLanguage(languageCode);
    setCurrentStep('intro');
  };

  const handleGetStarted = () => {
    setCurrentStep('permissions');
  };

  const handlePermissions = async () => {
    try {
      // Request camera permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      // Request location permission
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
    } catch (error) {
      console.log('Permission request failed:', error);
    }
    
    completeOnboarding();
    router.push('/kyc');
  };

  const t = (key: string) => getLocalizedText(key, selectedLanguage);

  if (currentStep === 'language') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('onboarding.welcome')}
            </h1>
            <p className="text-gray-600 text-lg-readable">
              {t('onboarding.selectLanguage')}
            </p>
          </div>

          <div className="space-y-3">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 touch-target ${
                  selectedLanguage === lang.code
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">
                        {lang.nativeName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lang.name}
                      </div>
                    </div>
                  </div>
                  {selectedLanguage === lang.code && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (currentStep === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              KYC {t('onboarding.welcome')}
            </h1>
            <p className="text-gray-600 text-lg-readable">
              {t('onboarding.subtitle')}
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {t('onboarding.step1')}
                </h3>
                <p className="text-gray-600 text-base-readable">
                  आपकी जानकारी सुरक्षित रहेगी
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {t('onboarding.step2')}
                </h3>
                <p className="text-gray-600 text-base-readable">
                  बहुत आसान प्रक्रिया
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleGetStarted}
            className="w-full btn-kyc text-lg"
            size="lg"
          >
            {t('onboarding.getStarted')}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </Card>
      </div>
    );
  }

  if (currentStep === 'permissions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('permissions.title')}
            </h1>
            <p className="text-gray-600 text-lg-readable">
              आपकी सुरक्षा के लिए कुछ अनुमतियाँ चाहिए
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                📷
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {t('permissions.camera')}
                </h3>
                <p className="text-sm text-gray-600">
                  दस्तावेज़ों की फोटो के लिए
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                📍
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {t('permissions.location')}
                </h3>
                <p className="text-sm text-gray-600">
                  सुरक्षा सत्यापन के लिए
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                💾
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {t('permissions.storage')}
                </h3>
                <p className="text-sm text-gray-600">
                  ऑफलाइन काम के लिए
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handlePermissions}
              className="w-full btn-kyc text-lg"
              size="lg"
            >
              {t('permissions.allow')}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            
            <p className="text-center text-sm text-gray-500">
              आप बाद में भी सेटिंग्स में बदल सकते हैं
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
