/// <reference types="vite/client" />

declare module "*.css?inline" {
  const css: string;
  export default css;
}

interface ImportMetaEnv {
  readonly VITE_WIDGET_API_BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
