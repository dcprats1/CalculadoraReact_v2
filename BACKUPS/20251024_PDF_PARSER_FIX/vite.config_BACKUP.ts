import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/area-privada2/calculadora/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
