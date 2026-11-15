/**
 * Prefijo de ruta cuando la app se sirve bajo un subdirectorio de otro dominio
 * (p. ej. exkalibur.mx/caja). Vacío por defecto: la app vive en la raíz.
 * Se fija al compilar con NEXT_PUBLIC_BASE_PATH (sin barra final).
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/** Antepone el prefijo a una ruta absoluta de la propia app (fetch, descargas, service worker). */
export function withBase(path: string): string {
  return path.startsWith("/") ? `${BASE_PATH}${path}` : path;
}
