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

if (!existsSync('android')) {
  run('npx', ['expo', 'prebuild', '--platform', 'android'], '.');
}
// Absolute path: cmd.exe skips the current directory when NoDefaultCurrentDirectoryInExePath is set.
const gradlew = path.resolve('android', isWindows ? 'gradlew.bat' : 'gradlew');
run(isWindows ? `"${gradlew}"` : gradlew, [target.task], 'android');
console.log(`\n${kind.toUpperCase()} ready: ${path.resolve(target.output)}`);
