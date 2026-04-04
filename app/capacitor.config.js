/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.kenmedya.gssdrive",
  appName: "GSS Drive",
  webDir: "dist",
  server: {
    url: "https://gss-drive.vercel.app",
    cleartext: false,
  },
};

module.exports = config;