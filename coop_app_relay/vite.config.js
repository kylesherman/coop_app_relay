import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '..', // Look for .env files in the project root (one level up from './src')
  plugins: [react()],
  root: './src', // Set Vite's root to the 'src' directory
  base: './',   // Ensures relative paths in the output HTML, crucial for Electron file:// loading
  build: {
    outDir: '../dist', // Output to 'dist' relative to the 'src' root (i.e., project_root/dist)
    emptyOutDir: true,
  },
});
