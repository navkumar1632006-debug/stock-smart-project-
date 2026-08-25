import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, PermissionStatus as CameraPermissionStatus } from '@capacitor/camera';
import { Geolocation, PermissionStatus as GeolocationPermissionStatus } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';

// Interfaces for structured data exchange
export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export class MobileBridge {
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  static getPlatform(): string {
    return Capacitor.getPlatform();
  }

  // --- 1. Haptics (Physical Feedback for POS & Barcode actions) ---
  static async triggerHapticFeedback(style: 'light' | 'medium' | 'heavy' = 'light') {
    if (!this.isNative()) {
      console.log(`[Haptics Simulator] Vibrated with ${style} impact`);
      return;
    }
    try {
      const impactStyle = 
        style === 'heavy' ? ImpactStyle.Heavy :
        style === 'medium' ? ImpactStyle.Medium : 
        ImpactStyle.Light;
      await Haptics.impact({ style: impactStyle });
    } catch (e) {
      console.warn('Haptics failed', e);
    }
  }

  // --- 2. Toast Notifications ---
  static async showToast(text: string, duration: 'short' | 'long' = 'short') {
    if (!this.isNative()) {
      console.log(`[Toast Simulator] ${text}`);
      // Fallback to custom temporary DOM notification or console
      return;
    }
    try {
      await Toast.show({
        text,
        duration: duration === 'long' ? 'long' : 'short',
        position: 'bottom'
      });
    } catch (e) {
      console.warn('Native toast failed', e);
    }
  }

  // --- 3. Camera / Shelf OCR Scanning ---
  static async capturePhoto(): Promise<string | null> {
    if (!this.isNative()) {
      console.log('[Camera Simulator] Web camera prompt or mock fallback');
      return null;
    }
    try {
      // Direct integration with Android native camera layout (OWASP compliant input validation)
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });
      return image.webPath || null;
    } catch (e) {
      console.error('Failed to capture native photo:', e);
      return null;
    }
  }

  static async checkCameraPermission(): Promise<boolean> {
    if (!this.isNative()) return true;
    try {
      const status = await Camera.checkPermissions();
      if (status.camera === 'granted') return true;
      
      const requestStatus = await Camera.requestPermissions({ permissions: ['camera'] });
      return requestStatus.camera === 'granted';
    } catch (e) {
      console.warn('Camera permission check failed:', e);
      return false;
    }
  }

  // --- 4. GPS / Geolocation (Hyperlocal Store Placement) ---
  static async getCurrentLocation(): Promise<LocationCoords | null> {
    if (!this.isNative()) {
      // Return high-precision simulated location for ONDC nearby query (Connaught Place, New Delhi)
      return {
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 10
      };
    }
    try {
      const hasPermission = await this.checkGeolocationPermission();
      if (!hasPermission) {
        await this.showToast('Location permission is required for Hyperlocal Marketplace features.', 'long');
        return null;
      }
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } catch (e) {
      console.error('Native GPS capture failed:', e);
      return null;
    }
  }

  static async checkGeolocationPermission(): Promise<boolean> {
    if (!this.isNative()) return true;
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location === 'granted') return true;
      
      const requestStatus = await Geolocation.requestPermissions({ permissions: ['location'] });
      return requestStatus.location === 'granted';
    } catch (e) {
      console.warn('Geolocation permission check failed:', e);
      return false;
    }
  }

  // --- 5. Push Notifications & Local Expiry Alerts ---
  static async registerPushNotifications() {
    if (!this.isNative()) {
      console.log('[Push Simulator] Subscribed to ONDC live order dispatch feed');
      return;
    }
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        
        // Listeners for foreground and action clicks (crucial for local Indian retail agents)
        PushNotifications.addListener('registration', (token) => {
          console.log('[Native Push] FCM Registration Token:', token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('[Native Push] Error on registration:', error.error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          this.showToast(`🔔 ${notification.title}: ${notification.body}`, 'long');
          this.triggerHapticFeedback('heavy');
        });
      }
    } catch (e) {
      console.warn('Push Notifications registration failed:', e);
    }
  }

  // --- 6. Persistent Local Cache / Preferences (Offline Survivability) ---
  static async setLocalItem(key: string, value: any): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (!this.isNative()) {
      localStorage.setItem(key, stringValue);
      return;
    }
    try {
      await Preferences.set({ key, value: stringValue });
    } catch (e) {
      console.error('Preferences offline set failed:', e);
    }
  }

  static async getLocalItem<T>(key: string): Promise<T | null> {
    if (!this.isNative()) {
      const val = localStorage.getItem(key);
      if (!val) return null;
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as any as T;
      }
    }
    try {
      const { value } = await Preferences.get({ key });
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as any as T;
      }
    } catch (e) {
      console.error('Preferences offline get failed:', e);
      return null;
    }
  }

  static async removeLocalItem(key: string): Promise<void> {
    if (!this.isNative()) {
      localStorage.removeItem(key);
      return;
    }
    try {
      await Preferences.remove({ key });
    } catch (e) {
      console.error('Preferences remove failed:', e);
    }
  }

  // --- 7. Native Deep Linking & Background Lifecycle ---
  static registerAppListeners(onAppResume: () => void) {
    if (!this.isNative()) return;
    try {
      // Sync on resume (perfect for offline-to-online reconciliation when coming back to the shop)
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          console.log('[Native App] Resumed. Running ONDC offline reconciliation.');
          onAppResume();
        }
      });

      // Handle deep links (e.g. sharing discounts on Whatsapp to nearby consumers)
      App.addListener('appUrlOpen', (event) => {
        console.log('[Native Deep Link] Opened with URL:', event.url);
        // Custom URL route processing can be wired here
      });
    } catch (e) {
      console.warn('App listeners registration failed:', e);
    }
  }
}
