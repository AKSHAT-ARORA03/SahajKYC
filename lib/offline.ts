import type { SyncItem, NetworkStatus } from '@/types/kyc';

class OfflineManager {
  private static instance: OfflineManager;
  private syncQueue: SyncItem[] = [];
  private isOnline: boolean = true;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeNetworkListeners();
      this.loadSyncQueue();
    }
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private initializeNetworkListeners() {
    this.isOnline = navigator.onLine;

    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Monitor connection quality if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', this.handleConnectionChange.bind(this));
    }
  }

  private handleOnline() {
    this.isOnline = true;
    this.notifyListeners({
      isOnline: true,
      connectionType: this.getConnectionType()
    });
    this.processQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    this.notifyListeners({
      isOnline: false
    });
  }

  private handleConnectionChange() {
    this.notifyListeners({
      isOnline: this.isOnline,
      connectionType: this.getConnectionType()
    });
  }

  private getConnectionType(): 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | undefined {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;
      // Validate the type and return only valid values
      if (effectiveType && ['slow-2g', '2g', '3g', '4g', 'wifi'].includes(effectiveType)) {
        return effectiveType as 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
      }
    }
    return undefined;
  }

  private notifyListeners(status: NetworkStatus) {
    this.listeners.forEach(listener => listener(status));
  }

  addNetworkListener(listener: (status: NetworkStatus) => void) {
    this.listeners.add(listener);
    
    // Return cleanup function
    return () => {
      this.listeners.delete(listener);
    };
  }

  getNetworkStatus(): NetworkStatus {
    return {
      isOnline: this.isOnline,
      connectionType: this.getConnectionType()
    };
  }

  // Sync queue management
  private loadSyncQueue() {
    try {
      const stored = localStorage.getItem('kyc_sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem('kyc_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  addToSyncQueue(item: Omit<SyncItem, 'id' | 'createdAt' | 'retries'>) {
    const syncItem: SyncItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      retries: 0
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return syncItem.id;
  }

  async processQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const itemsToProcess = [...this.syncQueue];
    
    for (const item of itemsToProcess) {
      try {
        await this.syncItem(item);
        
        // Remove successful items
        this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        
        // Update retry count
        const itemIndex = this.syncQueue.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
          this.syncQueue[itemIndex].retries += 1;
          this.syncQueue[itemIndex].lastAttempt = new Date();
          
          // Remove items that have failed too many times
          if (this.syncQueue[itemIndex].retries > 3) {
            this.syncQueue.splice(itemIndex, 1);
          }
        }
      }
    }

    this.saveSyncQueue();
  }

  private async syncItem(item: SyncItem): Promise<void> {
    // Simulate API call - replace with actual implementation
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    return response.json();
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  clearSyncQueue() {
    this.syncQueue = [];
    this.saveSyncQueue();
  }
}

// Storage utilities for offline data
export class OfflineStorage {
  static async storeData(key: string, data: any): Promise<void> {
    try {
      if ('indexedDB' in window) {
        await this.storeInIndexedDB(key, data);
      } else {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to store offline data:', error);
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  static async getData(key: string): Promise<any> {
    try {
      if ('indexedDB' in window) {
        return await this.getFromIndexedDB(key);
      } else {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.error('Failed to retrieve offline data:', error);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    }
  }

  private static async storeInIndexedDB(key: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KYCApp', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['data'], 'readwrite');
        const store = transaction.objectStore('data');
        
        store.put({ key, data, timestamp: Date.now() });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' });
        }
      };
    });
  }

  private static async getFromIndexedDB(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KYCApp', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['data'], 'readonly');
        const store = transaction.objectStore('data');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? result.data : null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }
}

// Image compression utilities for mobile
export class ImageUtils {
  static compressImage(
    file: File, 
    maxWidth: number = 1200, 
    maxHeight: number = 1200, 
    quality: number = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        resolve(compressedDataUrl);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  static base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  static async validateImage(file: File): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      errors.push('File size too large (max 5MB)');
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      errors.push('Invalid file type. Please select an image.');
    }

    // Check image dimensions
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 300 || img.height < 300) {
          warnings.push('Image resolution is low. Consider using a higher quality image.');
        }

        if (img.width > 4000 || img.height > 4000) {
          warnings.push('Image resolution is very high. It will be compressed.');
        }

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        });
      };

      img.onerror = () => {
        errors.push('Invalid or corrupted image file');
        resolve({
          isValid: false,
          errors,
          warnings
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

export default OfflineManager;
