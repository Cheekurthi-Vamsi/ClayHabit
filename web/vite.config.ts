import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { darkColors, gradients, lightColors, type ThemeColors, type ThemeGradients } from '../src/theme/colors.ts';
import { radii } from '../src/theme/radii.ts';
import { spacing } from '../src/theme/spacing.ts';
import { typography } from '../src/theme/typography.ts';

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function colorVars(colors: ThemeColors): string {
  return Object.entries(colors)
    .map(([name, value]) => `  --color-${kebab(name)}: ${value};`)
    .join('\n');
}

function gradientVars(set: ThemeGradients): string {
  return Object.entries(set)
    .map(([name, stops]) => `  --gradient-${kebab(name)}: linear-gradient(135deg, ${stops.join(', ')});`)
    .join('\n');
}

/**
 * The phone's design tokens (src/theme) as CSS custom properties, generated at
 * build time so the web can never drift from the app: `import 'virtual:tokens.css'`.
 */
function designTokens(): Plugin {
  const id = 'virtual:tokens.css';
  const resolved = `\0${id}`;
  return {
    name: 'clayhabit-design-tokens',
    resolveId: (source) => (source === id ? resolved : null),
    load(loadId) {
      if (loadId !== resolved) return null;
      const scale = Object.entries(typography)
        .map(
          ([name, t]) =>
            `  --type-${kebab(name)}-size: ${t.fontSize}px;\n  --type-${kebab(name)}-line: ${t.lineHeight}px;\n  --type-${kebab(name)}-tracking: ${t.letterSpacing}px;`,
        )
        .join('\n');
      return `:root {
${colorVars(lightColors)}
${gradientVars(gradients.light)}
${Object.entries(radii).map(([n, v]) => `  --radius-${n}: ${v}px;`).join('\n')}
${Object.entries(spacing).map(([n, v]) => `  --space-${n}: ${v}px;`).join('\n')}
${scale}
  color-scheme: light;
}
:root[data-theme='dark'] {
${colorVars(darkColors)}
${gradientVars(gradients.dark)}
  color-scheme: dark;
}
`;
    },
  };
}

export default defineConfig({
  plugins: [react(), designTokens()],
  // One tsconfig for every file, including the shared ones in ../src. Otherwise those pick up the
  // phone app's tsconfig, which extends expo/tsconfig.base: fine locally, missing on Vercel, where
  // only web/ is installed.
  tsconfig: root('./tsconfig.json'),
  // The phone app's .env.local: the same Clerk key and Google client ID serve both.
  envDir: root('..'),
  envPrefix: ['EXPO_PUBLIC_'],
  resolve: {
    alias: [
      // Native-only modules the shared code imports, swapped for browser versions.
      { find: /^expo-sqlite$/, replacement: root('./src/shims/expo-sqlite.ts') },
      {
        find: /^@\/lib\/notifications\/notification-service$/,
        replacement: root('./src/shims/notification-service.ts'),
      },
      { find: /^.*\/modules\/clayhabit-kdf$/, replacement: root('./src/shims/clayhabit-kdf.ts') },
      // The phone app's code: data, domain, crypto, sync and feature hooks are shared as-is.
      { find: /^@\/assets\//, replacement: `${root('../assets')}/` },
      { find: /^@\//, replacement: `${root('../src')}/` },
    ],
    // Shared files live outside web/, so every package they import resolves from web/node_modules
    // (one copy of each stateful library, and nothing needed from the phone app's install).
    dedupe: ['react', 'react-dom', '@tanstack/react-query', '@noble/hashes'],
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  server: {
    port: 5173,
    fs: { allow: [root('..')] },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
