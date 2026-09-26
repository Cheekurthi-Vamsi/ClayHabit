/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  readonly EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'virtual:tokens.css';
