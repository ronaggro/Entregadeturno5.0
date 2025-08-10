# Entrega de turno — PWA (GitHub Pages)

Sitio estático listo para publicar en GitHub Pages. Incluye:
- `manifest.json` (PWA)
- `sw.js` Service Worker (cache-first + SWR)
- `images/` iconos
- `.nojekyll` para evitar procesado por Jekyll

## Despliegue rápido
1. Crea un repositorio nuevo en GitHub (público).
2. Sube estos archivos (drag & drop).
3. Ve a **Settings → Pages → Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / **Folder**: `/ (root)`
   - `Save`
4. Abre `https://<tu-usuario>.github.io/<repo>/` en Safari (iPad) y **Agregar a pantalla de inicio**.

> Primer uso online para cachear las librerías CDN. Luego funciona offline.