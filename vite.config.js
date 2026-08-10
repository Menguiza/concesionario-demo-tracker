import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/concesionario-demo-tracker/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gestión de Vehículos y Comerciales',
        short_name: 'ConcesionarioApp',
        start_url: '/concesionario-demo-tracker/',
        scope: '/concesionario-demo-tracker/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f2937',
        // TODO: agregar icons (192x192 / 512x512) cuando haya branding definido.
      },
    }),
  ],
})
