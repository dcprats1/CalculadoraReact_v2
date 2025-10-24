import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/area-privada2/calculadora/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'excel': ['exceljs'],
          'icons': ['lucide-react'],
        },
      },
    },
  },
});
