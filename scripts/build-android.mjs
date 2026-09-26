/**
 * Builds a standalone Android release (JS bundle embedded, no Metro needed).
 * Generates android/ first if it's missing.
 *
 *   npm run android:apk  → android/app/build/outputs/apk/release/app-release.apk
 *   npm run android:aab  → android/app/build/outputs/bundle/release/app-release.aab
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const targets = {
  apk: { task: 'app:assembleRelease', output: 'android/app/build/outputs/apk/release/app-release.apk' },
  aab: { task: 'app:bundleRelease', output: 'android/app/build/outputs/bundle/release/app-release.aab' },
};

const kind = process.argv[2] ?? 'apk';
const target = targets[kind];
if (!target) {
  console.error(`Unknown target "${kind}". Use one of: ${Object.keys(targets).join(', ')}.`);
  process.exit(1);
}

const isWindows = process.platform === 'win32';

function run(command, args, cwd) {
  // Windows can only spawn .cmd/.bat files (npx, gradlew.bat) through a shell,
  // which takes one command line rather than an args array.
  const result = isWindows
    ? spawnSync([command, ...args].join(' '), { cwd, stdio: 'inherit', shell: true })
    : spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Absolute path: cmd.exe skips the current directory when NoDefaultCurrentDirectoryInExePath is set.
const gradlew = path.resolve('android', isWindows ? 'gradlew.bat' : 'gradlew');

// No android/ yet, or a half-deleted one (e.g. an interrupted clean prebuild): generate it fresh.
if (!existsSync(gradlew)) {
  const prebuild = spawnSync(
    isWindows ? 'npx expo prebuild --platform android --clean --no-install' : 'npx',
    isWindows ? [] : ['expo', 'prebuild', '--platform', 'android', '--clean', '--no-install'],
    { stdio: 'inherit', shell: isWindows },
  );
  if (prebuild.status !== 0 || !existsSync(gradlew)) {
    console.error(
      '\nCould not regenerate android/. If it says a folder is "busy or locked", another program still has a file in' +
        ' android/ open (a copy to your phone, File Explorer, antivirus). Close it or restart Windows, then run this again.',
    );
    process.exit(1);
  }
}
run(isWindows ? `"${gradlew}"` : gradlew, [target.task], 'android');
console.log(`\n${kind.toUpperCase()} ready: ${path.resolve(target.output)}`);
