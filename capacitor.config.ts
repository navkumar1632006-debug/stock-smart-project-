import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stocksmartai.app',
  appName: 'StockSmart AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      '*.run.app',
      'localhost:3000'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#020617'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#4f46e5',
      sound: 'beep.wav'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
