import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gss.drive',
  appName: 'GSS Drive',
  webDir: 'out',
  server: {
    url: 'https://gss-drive.vercel.app',
    cleartext: true
  }
};

export default config;