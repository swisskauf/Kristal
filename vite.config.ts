
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Inietta la variabile d'ambiente process.env.API_KEY durante la build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
