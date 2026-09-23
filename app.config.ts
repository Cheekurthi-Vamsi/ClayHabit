import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json holds the config; this only adds what depends on `.env.local`.
 *
 * Google sign-in (the Cloud) needs its config plugin on iOS, which registers
 * the reversed iOS client ID as a URL scheme. Without options the plugin
 * switches to Firebase mode and fails the build, so it's only added once
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set. Android needs no plugin: the
 * native module autolinks, and the OAuth client is matched by package name
 * and signing SHA-1 in Google Cloud.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
  const match = /^([\w-]+)\.apps\.googleusercontent\.com$/.exec(iosClientId);
  const plugins = [...(config.plugins ?? [])];
  if (match) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: `com.googleusercontent.apps.${match[1]}` },
    ]);
  }
  return { ...config, name: config.name ?? 'ClayHabbit', slug: config.slug ?? 'clayhabit', plugins };
};
