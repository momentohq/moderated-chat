/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // more env variables may be added here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
