/** Values Vite bakes into the bundle at build time (see vite.config.ts). */
interface ImportMetaEnv {
  /** Preview badge label; empty for production and local builds. */
  readonly VITE_PREVIEW_LABEL: string
}
