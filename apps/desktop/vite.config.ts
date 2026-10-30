import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@wespace/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
        '@wespace/ui': path.resolve(__dirname, '../../packages/ui/src'),
      },
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    clearScreen: false,
    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
  };
});
