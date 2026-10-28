import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 4200 },
  build: {
    rollupOptions: {
      output: {
        // Libraries change far less often than the app; separate files stay cached across deploys
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router', 'react-router/dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
