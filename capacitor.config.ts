import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boreal.portal',
  appName: 'Boreal Staff Portal',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    // BF_PORTAL_SPLASH_RECURSION_v1
    // See BI-Client v096: splash-screen 8.0.2 observes the parent view's
    // frame/bounds then assigns viewController.view.frame, re-entering
    // updateSplashImageBounds() until the stack overflows. 600ms is non-zero,
    // so showOnLaunch() runs and registers the observers. backgroundColor is
    // kept -- it still colours the storyboard launch screen.
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#0B1F3A',
    },
  },
};

export default config;
