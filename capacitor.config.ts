import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lensvault.app',
  appName: 'Lens Vault',
  webDir: 'dist',
  server: {
    // Allow external URLs for Supabase
    allowNavigation: [
      'https://*.supabase.co',
      'https://*.supabase.com',
      'https://lensvault.com'
    ],
    // Handle authentication redirects
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
