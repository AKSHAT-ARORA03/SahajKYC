import type { LocalizedText, LanguageConfig } from '@/types/kyc';

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳',
    rtl: false
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    rtl: false
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇧🇩',
    rtl: false
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    rtl: false
  }
];

export const LOCALIZED_TEXTS = {
  // Common
  common: {
    next: {
      hi: 'आगे',
      en: 'Next',
      bn: 'পরবর্তী',
      ta: 'அடுத்தது'
    } as LocalizedText,
    back: {
      hi: 'पीछे',
      en: 'Back',
      bn: 'পিছনে',
      ta: 'பின்னால்'
    } as LocalizedText,
    continue: {
      hi: 'जारी रखें',
      en: 'Continue',
      bn: 'চালিয়ে যান',
      ta: 'தொடரவும்'
    } as LocalizedText,
    cancel: {
      hi: 'रद्द करें',
      en: 'Cancel',
      bn: 'বাতিল',
      ta: 'ரத்து செய்'
    } as LocalizedText,
    retry: {
      hi: 'दोबारा कोशिश करें',
      en: 'Try Again',
      bn: 'আবার চেষ্টা করুন',
      ta: 'மீண்டும் முயற்சிக்கவும்'
    } as LocalizedText,
    done: {
      hi: 'हो गया',
      en: 'Done',
      bn: 'সম্পন্ন',
      ta: 'முடிந்தது'
    } as LocalizedText,
    loading: {
      hi: 'लोड हो रहा है...',
      en: 'Loading...',
      bn: 'লোড হচ্ছে...',
      ta: 'ஏற்றுகிறது...'
    } as LocalizedText,
    error: {
      hi: 'कुछ गलत हुआ',
      en: 'Something went wrong',
      bn: 'কিছু ভুল হয়েছে',
      ta: 'ஏதோ தவறு நடந்துள்ளது'
    } as LocalizedText
  },

  // Onboarding
  onboarding: {
    welcome: {
      hi: 'स्वागत है',
      en: 'Welcome',
      bn: 'স্বাগতম',
      ta: 'வரவேற்கிறோம்'
    } as LocalizedText,
    selectLanguage: {
      hi: 'अपनी भाषा चुनें',
      en: 'Select Your Language',
      bn: 'আপনার ভাষা নির্বাচন করুন',
      ta: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்'
    } as LocalizedText,
    subtitle: {
      hi: 'आपकी पहचान सत्यापित करने के लिए',
      en: 'To verify your identity',
      bn: 'আপনার পরিচয় যাচাই করতে',
      ta: 'உங்கள் அடையாளத்தை சரிபார்க்க'
    } as LocalizedText,
    step1: {
      hi: 'सुरक्षित और तेज़ प्रक्रिया',
      en: 'Safe and fast process',
      bn: 'নিরাপদ এবং দ্রুত প্রক্রিয়া',
      ta: 'பாதுகாப்பான மற்றும் விரைவான செயல்முறை'
    } as LocalizedText,
    step2: {
      hi: 'केवल 5 মিনট में पूरा',
      en: 'Complete in just 5 minutes',
      bn: 'মাত্র ৫ মিনিটে সম্পূর্ণ',
      ta: 'வெறும் 5 நிமிடங்களில் முடிக்கவும்'
    } as LocalizedText,
    getStarted: {
      hi: 'शुरू करें',
      en: 'Get Started',
      bn: 'শুরু করুন',
      ta: 'தொடங்குங்கள்'
    } as LocalizedText
  },

  // Permissions
  permissions: {
    title: {
      hi: 'अनुमतियाँ चाहिए',
      en: 'Permissions Required',
      bn: 'অনুমতি প্রয়োজন',
      ta: 'அனுமதிகள் தேவை'
    } as LocalizedText,
    camera: {
      hi: 'फोटो लेने के लिए कैमरा चाहिए',
      en: 'Camera needed to take photos',
      bn: 'ছবি তোলার জন্য ক্যামেরা প্রয়োজন',
      ta: 'புகைப்படங்கள் எடுக்க கேமரா தேவை'
    } as LocalizedText,
    location: {
      hi: 'आपकी सुरक्षा के लिए स्थान',
      en: 'Location for your security',
      bn: 'আপনার নিরাপত্তার জন্য অবস্থান',
      ta: 'உங்கள் பாதுகாப்பிற்கான இடம்'
    } as LocalizedText,
    storage: {
      hi: 'ऑफलाइन सुविधा के लिए',
      en: 'For offline features',
      bn: 'অফলাইন বৈশিষ্ট্যের জন্য',
      ta: 'ஆஃப்லைன் அம்சங்களுக்காக'
    } as LocalizedText,
    allow: {
      hi: 'अनुमति दें',
      en: 'Allow',
      bn: 'অনুমতি দিন',
      ta: 'அனுமதிக்கவும்'
    } as LocalizedText
  },

  // KYC Selection
  kycSelection: {
    title: {
      hi: 'अपनी पहचान कैसे साबित करना चाहते हैं?',
      en: 'How would you like to verify your identity?',
      bn: 'আপনি কীভাবে আপনার পরিচয় যাচাই করতে চান?',
      ta: 'உங்கள் அடையாளத்தை எவ்வாறு சரிபார்க்க விரும்புகிறீர்கள்?'
    } as LocalizedText,
    digilockerTitle: {
      hi: 'DigiLocker से',
      en: 'Using DigiLocker',
      bn: 'DigiLocker ব্যবহার করে',
      ta: 'DigiLocker ஐப் பயன்படுத்தி'
    } as LocalizedText,
    digilockerSubtitle: {
      hi: 'सरकारी दस्तावेज़ ऑनलाइन से',
      en: 'Government documents online',
      bn: 'অনলাইনে সরকারি নথি',
      ta: 'அரசு ஆவணங்கள் ஆன்லைனில்'
    } as LocalizedText,
    documentsTitle: {
      hi: 'फोटो खींचकर',
      en: 'Take Photos',
      bn: 'ছবি তুলে',
      ta: 'புகைப்படங்கள் எடுத்து'
    } as LocalizedText,
    documentsSubtitle: {
      hi: 'आधार, PAN, DL की फोटो',
      en: 'Photos of Aadhaar, PAN, DL',
      bn: 'আধার, PAN, DL এর ছবি',
      ta: 'ஆதார், PAN, DL ன் புகைப்படங்கள்'
    } as LocalizedText,
    easy: {
      hi: 'आसान',
      en: 'Easy',
      bn: 'সহজ',
      ta: 'எளிதான'
    } as LocalizedText,
    moderate: {
      hi: 'थोड़ा कठিन',
      en: 'Moderate',
      bn: 'একটু কঠিন',
      ta: 'சற்று கடினம்'
    } as LocalizedText,
    recommended: {
      hi: 'सुझाया गया',
      en: 'Recommended',
      bn: 'প্রস্তাবিত',
      ta: 'பரிந்துரைக்கப்பட்டது'
    } as LocalizedText,
    time2min: {
      hi: '2 मিনট',
      en: '2 minutes',
      bn: '২ মিনিট',
      ta: '2 நிमிடங்கள்'
    } as LocalizedText,
    time5min: {
      hi: '5 মিনট',
      en: '5 minutes',
      bn: '৫ মিনিট',
      ta: '5 நிமிடங்கள்'
    } as LocalizedText
  },

  // DigiLocker
  digilocker: {
    title: {
      hi: 'DigiLocker क्या है?',
      en: 'What is DigiLocker?',
      bn: 'DigiLocker কী?',
      ta: 'DigiLocker என்றால் என்ன?'
    } as LocalizedText,
    point1: {
      hi: 'सरकार का सुरक्षित डिजिटल बटुआ',
      en: 'Government\'s secure digital wallet',
      bn: 'সরকারের নিরাপদ ডিজিটাল ওয়ালেট',
      ta: 'அரசின் பாதுகாப்பான டிஜிட்டல் வாலட்'
    } as LocalizedText,
    point2: {
      hi: 'आपके दस्तावेज़ সুরक्षित हैं',
      en: 'Your documents are safe',
      bn: 'আপনার নথিগুলি নিরাপদ',
      ta: 'உங்கள் ஆவணங்கள் பாதுகாப்பாக உள்ளன'
    } as LocalizedText,
    point3: {
      hi: 'कोई पासवर्ड याद রাখने की जरूरत नहीं',
      en: 'No need to remember passwords',
      bn: 'পাসওয়ার্ড মনে রাখার প্রয়োজন নেই',
      ta: 'கடவுச்சொற்களை நினைவில் வைக்க வேண்டிய அவশியமില்লை'
    } as LocalizedText,
    connect: {
      hi: 'DigiLocker से जुड़ें',
      en: 'Connect to DigiLocker',
      bn: 'DigiLocker এর সাথে সংযুক্ত হন',
      ta: 'DigiLocker உடன் இணைக்கவும்'
    } as LocalizedText,
    opening: {
      hi: 'DigiLocker খুল रहा है...',
      en: 'Opening DigiLocker...',
      bn: 'DigiLocker খোলা হচ্ছে...',
      ta: 'DigiLocker திறக்கிறது...'
    } as LocalizedText
  },

  // Document Upload
  documents: {
    selectType: {
      hi: 'कौन সা दस্तावেज़ अपलোड করना है?',
      en: 'Which document would you like to upload?',
      bn: 'আপনি কোন নথি আপলোড করতে চান?',
      ta: 'எந்த ஆவணத்தை பதிவேற்ற விரும்புகிறீர்கள்?'
    } as LocalizedText,
    aadhaar: {
      hi: 'आधार কার্ড',
      en: 'Aadhaar Card',
      bn: 'আধার কার্ড',
      ta: 'ஆதார் அட்டை'
    } as LocalizedText,
    pan: {
      hi: 'PAN কার্ড',
      en: 'PAN Card',
      bn: 'PAN কার্ড',
      ta: 'PAN அட்டை'
    } as LocalizedText,
    drivingLicense: {
      hi: 'ড্রাইভিং लाइসেंস',
      en: 'Driving License',
      bn: 'ড্রাইভিং লাইসেন্স',
      ta: 'ஓட்டுநர் உரிமம்'
    } as LocalizedText,
    voterId: {
      hi: 'वोটर आईডी',
      en: 'Voter ID',
      bn: 'ভোটার আইডি',
      ta: 'வாக்காளர் அடையாள அட்டை'
    } as LocalizedText,
    required: {
      hi: 'जरूरী',
      en: 'Required',
      bn: 'প্রয়োজনীয়',
      ta: 'தேவையான'
    } as LocalizedText,
    optional: {
      hi: 'वैकल্পিক',
      en: 'Optional',
      bn: 'ঐচ্ছিক',
      ta: 'விருப்பமான'
    } as LocalizedText,
    instructionTitle: {
      hi: 'फোটো लेने के निर्দেশ',
      en: 'Photo Instructions',
      bn: 'ছবি তোলার নির্দেশনা',
      ta: 'புகைப்பட வழிமுறைகள்'
    } as LocalizedText,
    instruction1: {
      hi: 'कार্ড को अच्छी रোशनी में रखें',
      en: 'Keep card in good lighting',
      bn: 'কার্ডটি ভাল আলোতে রাখুন',
      ta: 'அட்டையை நல்ல வெளிச்சத்தில் வைக்கவும்'
    } as LocalizedText,
    instruction2: {
      hi: 'সभी कोने दिखाई देने چाहिए',
      en: 'All corners should be visible',
      bn: 'সব কোণ দৃশ্যমান হওয়া উচিত',
      ta: 'அனைத்து மூலைகளும் தெரிய வேண்டும்'
    } as LocalizedText,
    instruction3: {
      hi: 'धुंধला न হো',
      en: 'Should not be blurry',
      bn: 'ঝাপসা হওয়া উচিত নয়',
      ta: 'மங்கலாக இருக்கக் கூடாது'
    } as LocalizedText,
    takePhoto: {
      hi: 'ফোটো लें',
      en: 'Take Photo',
      bn: 'ছবি তুলুন',
      ta: 'புகைப்படம் எடுக்கவும்'
    } as LocalizedText,
    retake: {
      hi: 'দোবারা लें',
      en: 'Retake',
      bn: 'আবার তুলুন',
      ta: 'மீண்டும் எடுக்கவும்'
    } as LocalizedText
  },

  // Face Verification
  face: {
    title: {
      hi: 'अपना चेহরा दिखाएं',
      en: 'Show Your Face',
      bn: 'আপনার মুখ দেখান',
      ta: 'உங்கள் முகத்தைக் காட்டுங்கள்'
    } as LocalizedText,
    purpose: {
      hi: 'यह सुनिश्चित করने के लिए কি आप ही हैं',
      en: 'To make sure it\'s really you',
      bn: 'এটা নিশ্চিত করতে যে এটা সত্যিই আপনি',
      ta: 'இது உண்மையில் நீங்கள்தான் என்பதை உறுதிப்படுத்த'
    } as LocalizedText,
    lookStraight: {
      hi: 'कैमरे को সীधে দেখें',
      en: 'Look straight at camera',
      bn: 'ক্যামেরার দিকে সোজা তাকান',
      ta: 'கேமராவை நேராகப் பாருங்கள்'
    } as LocalizedText,
    smile: {
      hi: 'धीরে-धीরে मুস্কুরাएं',
      en: 'Smile slowly',
      bn: 'ধীরে ধীরে হাসুন',
      ta: 'மெதுவாக புன்னகையுங்கள்'
    } as LocalizedText,
    blink: {
      hi: 'एक बार পলকें झপকाएं',
      en: 'Blink once',
      bn: 'একবার চোখের পাতা ফেলুন',
      ta: 'ஒருமுறை கண் சிமிட்டுங்கள்'
    } as LocalizedText,
    processing: {
      hi: 'तस্वীर मिला রহे हैं...',
      en: 'Processing image...',
      bn: 'ছবি প্রক্রিয়া করা হচ্ছে...',
      ta: 'படம் செயலாக்கப்படுகிறது...'
    } as LocalizedText,
    success: {
      hi: 'मैच हो গया! ✓',
      en: 'Match successful! ✓',
      bn: 'মিল সফল! ✓',
      ta: 'பொருத்தம் வெற்றிகரம்! ✓'
    } as LocalizedText,
    failed: {
      hi: 'मैच नहीं हुआ',
      en: 'No match found',
      bn: 'কোনো মিল পাওয়া যায়নি',
      ta: 'பொருத்தம் கிடைக்கவில்லை'
    } as LocalizedText
  },

  // Status and completion
  status: {
    verifying: {
      hi: 'सत्यापन হচ্ছে...',
      en: 'Verifying...',
      bn: 'যাচাই করা হচ্ছে...',
      ta: 'சரிபார்க்கிறது...'
    } as LocalizedText,
    completed: {
      hi: 'सत্यাপন पूरा!',
      en: 'Verification Complete!',
      bn: 'যাচাইকরণ সম্পূর্ণ!',
      ta: 'சரிபார்ப்பு முடிந்தது!'
    } as LocalizedText,
    thankYou: {
      hi: 'धন্যবাद',
      en: 'Thank You',
      bn: 'ধন্যবাদ',
      ta: 'நன்றி'
    } as LocalizedText,
    kycApproved: {
      hi: 'आपका KYC स্বীকৃত হয়েছে',
      en: 'Your KYC has been approved',
      bn: 'আপনার KYC অনুমোদিত হয়েছে',
      ta: 'உங்கள் KYC அங்கீகரிக்கப்பட்டது'
    } as LocalizedText
  },

  // Errors
  errors: {
    networkError: {
      hi: 'इंटरনेট की समस্যা',
      en: 'Network problem',
      bn: 'নেটওয়ার্ক সমস্যা',
      ta: 'நெட்வொர்க் பிரச்சனை'
    } as LocalizedText,
    cameraError: {
      hi: 'कैमरा খুলতে পারছে না',
      en: 'Cannot open camera',
      bn: 'ক্যামেরা খুলতে পারছে না',
      ta: 'கேமராவைத் திறக்க முடியவில்லை'
    } as LocalizedText,
    uploadError: {
      hi: 'अपলোड नहीं हुआ',
      en: 'Upload failed',
      bn: 'আপলোড ব্যর্থ',
      ta: 'பதிவேற்றம் தோல்வியடைந்தது'
    } as LocalizedText,
    blurryImage: {
      hi: 'ছবি धुंधली है',
      en: 'Image is blurry',
      bn: 'ছবি ঝাপসা',
      ta: 'படம் மங்கலாக உள்ளது'
    } as LocalizedText,
    poorLighting: {
      hi: 'रोशনी कम है',
      en: 'Poor lighting',
      bn: 'আলো কম',
      ta: 'மோசமான வெளிச்சம்'
    } as LocalizedText
  }
};

export const getLocalizedText = (
  key: string, 
  language: 'hi' | 'en' | 'bn' | 'ta' = 'hi'
): string => {
  const keys = key.split('.');
  let current: any = LOCALIZED_TEXTS;
  
  for (const k of keys) {
    current = current?.[k];
    if (!current) break;
  }
  
  if (current && typeof current === 'object' && current[language]) {
    return current[language];
  }
  
  // Fallback to English, then Hindi
  if (current && typeof current === 'object') {
    return current.en || current.hi || key;
  }
  
  return key;
};

export const t = getLocalizedText;
