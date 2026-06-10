/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Production URL of the Cloudflare Worker that proxies to Claude. */
  readonly VITE_NAMING_API?: string;
  /** Production URL of the v2 studio backend (Worker). Empty => local engine. */
  readonly VITE_STUDIO_API?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
