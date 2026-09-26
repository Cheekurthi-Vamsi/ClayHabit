// @ts-check
const fs = require('node:fs');
const path = require('node:path');
const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
  withProjectBuildGradle,
} = require('expo/config-plugins');

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
 * - Limits native (C++) build parallelism so clang doesn't run out of memory.
 * - Pins every Android library to the project's NDK version.
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

// Caps how many clang processes the app's C++ build (appmodules + every
// autolinked Fabric codegen library) runs at once, per ABI. Ninja defaults to
// cores + 2 jobs, and each RN codegen compile needs 1 GB+ of RAM, so on a 12-core,
// 8 GB machine clang got OOM-killed mid-compile ("clang frontend command failed
// due to signal"). Override with -Pclayhabit.cxxJobs=N (or in gradle.properties).
const CXX_JOBS_ARGS = `
        externalNativeBuild {
            cmake {
                def cxxJobs = findProperty('clayhabit.cxxJobs') ?: '2'
                arguments "-DCMAKE_JOB_POOLS=compile=\${cxxJobs}", "-DCMAKE_JOB_POOL_COMPILE=compile"
            }
        }`;

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withCxxJobLimit = (config) =>
  withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes('clayhabit.cxxJobs')) return config;

    const defaultConfig = /(\n    defaultConfig \{)/;
    if (!defaultConfig.test(gradle)) {
      throw new Error(
        'with-android-build: android/app/build.gradle has no defaultConfig block; update the C++ job limit patch.',
      );
    }
    config.modResults.contents = gradle.replace(defaultConfig, `$1${CXX_JOBS_ARGS}`);
    return config;
  });

// Gradle runs the per-ABI native builds as parallel tasks; each spawns its own
// ninja. Limiting workers bounds how many of those run at the same time.
const GRADLE_WORKERS_MAX = '3';

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withGradleWorkerLimit = (config) =>
  withGradleProperties(config, (config) => {
    const props = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.workers.max'),
    );
    props.push({ type: 'property', key: 'org.gradle.workers.max', value: GRADLE_WORKERS_MAX });
    config.modResults = props;
    return config;
  });

// Libraries with C++ that don't set ndkVersion themselves (expo-sqlite) fall
// back to AGP's built-in default (27.0.12077973 on AGP 8.12), so Gradle tries to
// download a second NDK next to the 27.1 the app and React Native use. Applied
// when each library's Android plugin loads, so a library's own ndkVersion still wins.
const NDK_PIN = `
// Added by plugins/with-android-build.js: one NDK for every module.
subprojects {
  pluginManager.withPlugin('com.android.library') {
    android.ndkVersion = rootProject.ext.ndkVersion
  }
}
`;

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withNdkPin = (config) =>
  withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('one NDK for every module')) {
      config.modResults.contents += NDK_PIN;
    }
    return config;
  });

/** @type {import('expo/config-plugins').ConfigPlugin} */
module.exports = (config) =>
  withNdkPin(withGradleWorkerLimit(withCxxJobLimit(withReleaseSigning(withDaemonJdk(config)))));
