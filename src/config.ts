// Configuration for Frontend API requests
// In development / AI Studio preview: Empty string "" uses the local Vite server proxy.
// In production on Firebase Hosting: Set VITE_API_URL in your build environment (or replace the string below)
// with your live Render backend URL, e.g. "https://marking-scheme-generator.onrender.com"

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '';
