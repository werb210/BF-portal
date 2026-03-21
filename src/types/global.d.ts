declare module '*.svg';
declare module '*.png';
declare module '*.jpg';

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
