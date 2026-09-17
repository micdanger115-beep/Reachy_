/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HF_TOKEN?: string;
  readonly VITE_HF_USERNAME?: string;
  readonly VITE_HF_OAUTH_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
