import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        fs: {
          allow: [path.resolve(__dirname, '..')]
        }
      },
      plugins: [react(), tailwindcss()],
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              if (!id.includes('node_modules')) return;
              const normalizedId = id.replace(/\\/g, '/');
              if (normalizedId.includes('/node_modules/@tanstack/react-query/')) return 'tanstack';
              if (normalizedId.includes('/node_modules/@supabase/')) return 'supabase';
              if (
                normalizedId.includes('/node_modules/react-hook-form/') ||
                normalizedId.includes('/node_modules/@hookform/resolvers/') ||
                normalizedId.includes('/node_modules/zod/')
              ) {
                return 'forms';
              }
              if (normalizedId.includes('/node_modules/lucide-react/')) return 'icons';
              if (
                normalizedId.includes('/node_modules/react/') ||
                normalizedId.includes('/node_modules/react-dom/') ||
                normalizedId.includes('/node_modules/scheduler/') ||
                normalizedId.includes('/node_modules/object-assign/') ||
                normalizedId.includes('/node_modules/loose-envify/')
              ) {
                return 'react';
              }
              return 'vendor';
            }
          }
        }
      },
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
          zod: path.resolve(__dirname, 'node_modules/zod'),
          'zod/v4': path.resolve(__dirname, 'node_modules/zod/v4')
        }
      }
    };
});
