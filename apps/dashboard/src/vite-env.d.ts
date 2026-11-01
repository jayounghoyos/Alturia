/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** Optional: the widget script shown in Apariencia → Instalación. */
  readonly VITE_WIDGET_SCRIPT_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
