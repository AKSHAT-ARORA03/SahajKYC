import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  User, 
  KYCState, 
  DocumentData, 
  FaceVerificationResult, 
  SyncItem, 
  KYCError,
  KYCStep,
  KYCMethod,
  AnalyticsEvent,
  NetworkStatus
} from '@/types/kyc';

interface AppState {
  // User state
  user: User;
  isAuthenticated: boolean;
  
  // KYC state
  kyc: KYCState;
  
  // App state
  loading: boolean;
  networkStatus: NetworkStatus;
  lastSync: Date | null;
  
  // UI state
  currentLanguage: 'hi' | 'en' | 'bn' | 'ta';
  theme: 'light' | 'dark' | 'auto';
  showOnboarding: boolean;
}

interface AppActions {
  // User actions
  setUser: (user: Partial<User>) => void;
  setLanguage: (language: 'hi' | 'en' | 'bn' | 'ta') => void;
  updateUserPreferences: (preferences: Partial<User['preferences']>) => void;
  
  // KYC actions
  setKYCStep: (step: KYCStep) => void;
  setKYCMethod: (method: KYCMethod) => void;
  addDocument: (document: DocumentData) => void;
  updateDocument: (id: string, updates: Partial<DocumentData>) => void;
  removeDocument: (id: string) => void;
  setFaceVerification: (result: FaceVerificationResult) => void;
  updateProgress: (progress: number) => void;
  addError: (error: KYCError) => void;
  clearErrors: () => void;
  
  // Offline sync actions
  queueForSync: (item: Omit<SyncItem, 'id' | 'createdAt'>) => void;
  processOfflineQueue: () => Promise<void>;
  clearSyncQueue: () => void;
  updateSyncItem: (id: string, updates: Partial<SyncItem>) => void;
  
  // Network actions
  setNetworkStatus: (status: NetworkStatus) => void;
  setLastSync: (date: Date) => void;
  
  // App actions
  setLoading: (loading: boolean) => void;
  resetKYC: () => void;
  completeOnboarding: () => void;
  
  // Analytics actions
  trackEvent: (event: AnalyticsEvent) => void;
}

type Store = AppState & AppActions;

const initialKYCState: KYCState = {
  currentStep: 'onboarding',
  selectedMethod: undefined,
  documents: [],
  faceVerification: undefined,
  isOffline: false,
  syncQueue: [],
  progress: 0,
  errors: []
};

const initialUser: User = {
  language: 'hi',
  isFirstTime: true,
  preferences: {
    fontSize: 'normal',
    highContrast: false,
    voiceInstructions: false,
    notifications: true
  }
};

export const useKYCStore = create<Store>()(
  persist(
    (set, get) => ({
      // Initial state
      user: initialUser,
      isAuthenticated: false,
      kyc: initialKYCState,
      loading: false,
      networkStatus: { isOnline: true },
      lastSync: null,
      currentLanguage: 'hi',
      theme: 'light',
      showOnboarding: true,

      // User actions
      setUser: (userUpdates) =>
        set((state) => ({
          user: { ...state.user, ...userUpdates }
        })),

      setLanguage: (language) =>
        set((state) => ({
          currentLanguage: language,
          user: { ...state.user, language }
        })),

      updateUserPreferences: (preferences) =>
        set((state) => ({
          user: {
            ...state.user,
            preferences: { ...state.user.preferences, ...preferences }
          }
        })),

      // KYC actions
      setKYCStep: (step) =>
        set((state) => ({
          kyc: { ...state.kyc, currentStep: step }
        })),

      setKYCMethod: (method) =>
        set((state) => ({
          kyc: { ...state.kyc, selectedMethod: method }
        })),

      addDocument: (document) =>
        set((state) => ({
          kyc: {
            ...state.kyc,
            documents: [...state.kyc.documents, document]
          }
        })),

      updateDocument: (id, updates) =>
        set((state) => ({
          kyc: {
            ...state.kyc,
            documents: state.kyc.documents.map((doc) =>
              doc.id === id ? { ...doc, ...updates } : doc
            )
          }
        })),

      removeDocument: (id) =>
        set((state) => ({
          kyc: {
            ...state.kyc,
            documents: state.kyc.documents.filter((doc) => doc.id !== id)
          }
        })),

      setFaceVerification: (result) =>
        set((state) => ({
          kyc: { ...state.kyc, faceVerification: result }
        })),

      updateProgress: (progress) =>
        set((state) => ({
          kyc: { ...state.kyc, progress }
        })),

      addError: (error) =>
        set((state) => ({
          kyc: {
            ...state.kyc,
            errors: [...state.kyc.errors, error]
          }
        })),

      clearErrors: () =>
        set((state) => ({
          kyc: { ...state.kyc, errors: [] }
        })),

      // Offline sync actions
      queueForSync: (item) => {
        const syncItem: SyncItem = {
          ...item,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          retries: 0
        };
        
        set((state) => ({
          kyc: {
            ...state.kyc,
            syncQueue: [...state.kyc.syncQueue, syncItem]
          }
        }));
      },

      processOfflineQueue: async () => {
        const { kyc, setLoading, updateSyncItem } = get();
        if (kyc.syncQueue.length === 0 || !navigator.onLine) return;

        setLoading(true);
        
        for (const item of kyc.syncQueue) {
          try {
            // Simulate API call - replace with actual API calls
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            // Remove successful items from queue
            set((state) => ({
              kyc: {
                ...state.kyc,
                syncQueue: state.kyc.syncQueue.filter((i) => i.id !== item.id)
              }
            }));
          } catch (error) {
            // Update retry count
            updateSyncItem(item.id, {
              retries: item.retries + 1,
              lastAttempt: new Date()
            });
          }
        }
        
        setLoading(false);
        set({ lastSync: new Date() });
      },

      clearSyncQueue: () =>
        set((state) => ({
          kyc: { ...state.kyc, syncQueue: [] }
        })),

      updateSyncItem: (id, updates) =>
        set((state) => ({
          kyc: {
            ...state.kyc,
            syncQueue: state.kyc.syncQueue.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            )
          }
        })),

      // Network actions
      setNetworkStatus: (status) => {
        set({ networkStatus: status });
        
        // Auto-sync when coming back online
        if (status.isOnline && !get().kyc.isOffline) {
          get().processOfflineQueue();
        }
        
        set((state) => ({
          kyc: { ...state.kyc, isOffline: !status.isOnline }
        }));
      },

      setLastSync: (date) => set({ lastSync: date }),

      // App actions
      setLoading: (loading) => set({ loading }),

      resetKYC: () =>
        set((state) => ({
          kyc: { ...initialKYCState },
          loading: false
        })),

      completeOnboarding: () =>
        set((state) => ({
          showOnboarding: false,
          user: { ...state.user, isFirstTime: false }
        })),

      // Analytics actions
      trackEvent: (event) => {
        // In a real app, send to analytics service
        console.log('Analytics Event:', event);
        
        // Store locally for offline analytics
        if (typeof window !== 'undefined') {
          const events = JSON.parse(
            localStorage.getItem('analytics_events') || '[]'
          );
          events.push(event);
          
          // Keep only last 100 events
          if (events.length > 100) {
            events.splice(0, events.length - 100);
          }
          
          localStorage.setItem('analytics_events', JSON.stringify(events));
        }
      }
    }),
    {
      name: 'kyc-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        currentLanguage: state.currentLanguage,
        theme: state.theme,
        showOnboarding: state.showOnboarding
      }),
      skipHydration: true
    }
  )
);

// Simple selector hooks to prevent infinite loops
export const useUser = () => useKYCStore((state) => state.user);
export const useKYC = () => useKYCStore((state) => state.kyc);
export const useLanguage = () => useKYCStore((state) => state.currentLanguage);
export const useLoading = () => useKYCStore((state) => state.loading);

// Action selectors
export const useKYCActions = () => {
  const setKYCStep = useKYCStore((state) => state.setKYCStep);
  const setKYCMethod = useKYCStore((state) => state.setKYCMethod);
  const addDocument = useKYCStore((state) => state.addDocument);
  const updateDocument = useKYCStore((state) => state.updateDocument);
  const setFaceVerification = useKYCStore((state) => state.setFaceVerification);
  const updateProgress = useKYCStore((state) => state.updateProgress);
  const addError = useKYCStore((state) => state.addError);
  const clearErrors = useKYCStore((state) => state.clearErrors);

  return {
    setKYCStep,
    setKYCMethod,
    addDocument,
    updateDocument,
    setFaceVerification,
    updateProgress,
    addError,
    clearErrors
  };
};

export const useUserActions = () => {
  const setUser = useKYCStore((state) => state.setUser);
  const setLanguage = useKYCStore((state) => state.setLanguage);
  const updateUserPreferences = useKYCStore((state) => state.updateUserPreferences);

  return {
    setUser,
    setLanguage,
    updateUserPreferences
  };
};

export const useAppActions = () => {
  const setLoading = useKYCStore((state) => state.setLoading);
  const resetKYC = useKYCStore((state) => state.resetKYC);
  const completeOnboarding = useKYCStore((state) => state.completeOnboarding);
  const trackEvent = useKYCStore((state) => state.trackEvent);

  return {
    setLoading,
    resetKYC,
    completeOnboarding,
    trackEvent
  };
};

export default useKYCStore;
