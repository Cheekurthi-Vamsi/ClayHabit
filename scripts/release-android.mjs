/**
 * Prepares a new Android release for GitHub Releases (the app isn't on the Play Store).
 *
 *   npm run release:android -- patch        1.0.0 → 1.0.1
 *   npm run release:android -- minor        1.0.0 → 1.1.0
 *   npm run release:android -- 2.0.0        an exact version
 *
 * It bumps the version in app.json (and android/, if it exists), raises the
 * versionCode (Android only installs an update over an older one when it does),
 * builds the signed release APK, and puts in release/:
 *
 *   ClayHabbit.apk            ← upload this: the website and the in-app update check use this name
 *   ClayHabbit-v1.0.1.apk     ← an archive copy with the version in its name
 *   RELEASE-v1.0.1.md         ← the release notes to paste, with the SHA-256 checksum
 *
 * Then create a GitHub release with the tag it prints and attach ClayHabbit.apk.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
const apkPath = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const outDir = path.join(root, 'release');

function nextVersion(current, request) {
  const [major, minor, patch] = current.split('.').map((part) => Number.parseInt(part, 10) || 0);
  if (request === 'major') return `${major + 1}.0.0`;
  if (request === 'minor') return `${major}.${minor + 1}.0`;
  if (request === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+$/.test(request ?? '')) return request;
  console.error('Say how to bump the version: patch, minor, major, or an exact version like 1.2.0.');
  process.exit(1);
}

const request = process.argv[2];
const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const expo = appJson.expo;
const previous = expo.version;
const version = nextVersion(previous, request);
const versionCode = (expo.android.versionCode ?? 0) + 1;

if (version === previous) {
  console.error(`app.json is already at ${version}. Pick a higher version.`);
  process.exit(1);
}

// 1. The version, in app.json and in the generated Android project.
expo.version = version;
expo.android.versionCode = versionCode;
writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);
if (existsSync(gradlePath)) {
  const gradle = readFileSync(gradlePath, 'utf8')
    .replace(/versionCode \d+/, `versionCode ${versionCode}`)
    .replace(/versionName "[^"]*"/, `versionName "${version}"`);
  writeFileSync(gradlePath, gradle);
}
console.log(`\nVersion ${previous} → ${version} (versionCode ${versionCode})\n`);

// 2. The signed release APK (scripts/build-android.mjs; the upload key comes from ~/.gradle/gradle.properties).
const build = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-android.mjs'), 'apk'], { cwd: root, stdio: 'inherit' });
if (build.status !== 0 || !existsSync(apkPath)) {
  console.error('\nThe build failed, so nothing was released. app.json keeps the new version; fix the build and run');
  console.error(`"npm run android:apk", then copy the APK by hand, or set app.json back to ${previous}.`);
  process.exit(build.status ?? 1);
}

// 3. The files to upload, and the notes with the checksum.
mkdirSync(outDir, { recursive: true });
const latest = path.join(outDir, 'ClayHabbit.apk');
const archived = path.join(outDir, `ClayHabbit-v${version}.apk`);
copyFileSync(apkPath, latest);
copyFileSync(apkPath, archived);
const sha256 = createHash('sha256').update(readFileSync(latest)).digest('hex');
const sizeMb = (statSync(latest).size / 1024 / 1024).toFixed(1);

const notes = `## ClayHabbit ${version}

<!-- What changed, in a few lines. The app shows the first part of this to people when it offers the update. -->
-

### Install
Download **ClayHabbit.apk** below on your Android phone (Android 7.0+), open it and allow your browser to install apps.
Updating? Install it over the old version: your data stays.

### Verify
\`ClayHabbit.apk\` · ${sizeMb} MB · SHA-256 \`${sha256}\`
`;
const notesPath = path.join(outDir, `RELEASE-v${version}.md`);
writeFileSync(notesPath, notes);

console.log(`
Release ${version} is ready in ${path.relative(root, outDir)}/

  Tag:      v${version}
  Upload:   ${path.relative(root, latest)}   (keep this exact file name)
  Notes:    ${path.relative(root, notesPath)}
  SHA-256:  ${sha256}

Next:
  1. Commit and push the version change (app.json).
  2. GitHub → Releases → Draft a new release → tag v${version} → paste the notes → attach ClayHabbit.apk → Publish.
  3. The website's Download button and the in-app update check pick it up by themselves.
`);
