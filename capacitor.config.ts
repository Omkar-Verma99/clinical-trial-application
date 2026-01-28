// Capacitor config - Web app only (mobile builds handled separately)
const config = {
  appId: 'com.kollectcare.clinicaltrial',
  appName: 'Kollectcare RWE',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    url: 'http://localhost:3000', // Development server
    cleartext: true, // Allow HTTP in development
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
