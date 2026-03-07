import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Leading Edge Realty App',
  slug: config.slug ?? 'housing-finder',
  version: config.version ?? '0.0.4',
  android: {
    ...config.android,
    googleServicesFile:
      config.android?.googleServicesFile ??
      process.env.GOOGLE_SERVICES_FILE ??
      './google-services.json',
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
});