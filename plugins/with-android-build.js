// @ts-check
const fs = require('node:fs');
const path = require('node:path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

/**
 * Android build setup that has to survive `expo prebuild --clean`, which
 * regenerates android/ from scratch.
 *
 * - Pins the Gradle daemon to JDK 21. Newer JDKs break this build (Java 25
 *   fails react-native-worklets' CMake step, Java 26 breaks AGP's jlink). The
 *   Daemon JVM criteria file outranks JAVA_HOME and org.gradle.java.home, and
 *   Android Studio syncs with it too, so no machine-specific path is needed.
 * - Signs release builds with an upload key when CLAYHABIT_UPLOAD_* Gradle
 *   properties are set (see README → Android builds). Without them, release
 *   builds keep the template's debug key, whose SHA-1 is the one registered
 *   for Google sign-in.
 */

const DAEMON_JDK_VERSION = 21;

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withDaemonJdk = (config) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const gradleDir = path.join(config.modRequest.platformProjectRoot, 'gradle');
      await fs.promises.mkdir(gradleDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(gradleDir, 'gradle-daemon-jvm.properties'),
        `# Written by plugins/with-android-build.js on every prebuild.\ntoolchainVersion=${DAEMON_JDK_VERSION}\n`,
      );
      return config;
    },
  ]);

const RELEASE_SIGNING_CONFIG = `
        if (findProperty('CLAYHABIT_UPLOAD_STORE_FILE')) {
            release {
                storeFile file(findProperty('CLAYHABIT_UPLOAD_STORE_FILE'))
                storePassword findProperty('CLAYHABIT_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('CLAYHABIT_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('CLAYHABIT_UPLOAD_KEY_PASSWORD')
            }
        }`;

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes('CLAYHABIT_UPLOAD_STORE_FILE')) return config;

    const debugSigning = /(signingConfigs \{\s*debug \{[^}]*\})/;
    const releaseUsesDebug = /(release \{\s*(?:\/\/[^\n]*\s*)*)signingConfig signingConfigs\.debug/;
    if (!debugSigning.test(gradle) || !releaseUsesDebug.test(gradle)) {
      throw new Error(
        'with-android-build: android/app/build.gradle no longer matches the Expo template; update the release signing patch.',
      );
    }
    gradle = gradle.replace(debugSigning, `$1${RELEASE_SIGNING_CONFIG}`);
    gradle = gradle.replace(
      releaseUsesDebug,
      "$1signingConfig signingConfigs.findByName('release') ?: signingConfigs.debug",
    );
    config.modResults.contents = gradle;
    return config;
  });

/** @type {import('expo/config-plugins').ConfigPlugin} */
module.exports = (config) => withReleaseSigning(withDaemonJdk(config));
