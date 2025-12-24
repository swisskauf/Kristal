
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Permette all'app di leggere le variabili d'ambiente impostate su Vercel
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY)
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts', '@supabase/supabase-js'],
          ai: ['@google/genai']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
