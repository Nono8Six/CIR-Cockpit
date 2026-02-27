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
              if (
                normalizedId.includes('/node_modules/react/') ||
                normalizedId.includes('/node_modules/react-dom/') ||
                normalizedId.includes('/node_modules/scheduler/') ||
                normalizedId.includes('/node_modules/object-assign/') ||
                normalizedId.includes('/node_modules/loose-envify/')
              ) {
                return 'react-core';
              }
              if (
                normalizedId.includes('/node_modules/@tanstack/react-router/') ||
                normalizedId.includes('/node_modules/@tanstack/router-core/') ||
                normalizedId.includes('/node_modules/@tanstack/history/') ||
                normalizedId.includes('/node_modules/@tanstack/store/')
              ) {
                return 'tanstack-core';
              }
              if (
                normalizedId.includes('/node_modules/@tanstack/react-query/') ||
                normalizedId.includes('/node_modules/@tanstack/query-core/')
              ) {
                return 'tanstack-query';
              }
              if (normalizedId.includes('/node_modules/@supabase/')) return 'supabase';
              if (
                normalizedId.includes('/node_modules/@trpc/client/') ||
                normalizedId.includes('/node_modules/@trpc/server/')
              ) {
                return 'supabase';
              }
              if (
                normalizedId.includes('/node_modules/react-hook-form/') ||
                normalizedId.includes('/node_modules/@hookform/resolvers/') ||
                normalizedId.includes('/node_modules/zod/')
              ) {
                return 'forms';
              }
              if (
                normalizedId.includes('/node_modules/@tanstack/react-table/') ||
                normalizedId.includes('/node_modules/@tanstack/table-core/') ||
                normalizedId.includes('/node_modules/@tanstack/react-virtual/') ||
                normalizedId.includes('/node_modules/@tanstack/virtual-core/')
              ) {
                return 'data-grid';
              }
              if (
                normalizedId.includes('/node_modules/date-fns/') ||
                normalizedId.includes('/node_modules/@date-fns/')
              ) {
                return 'ui-primitives';
              }
              if (normalizedId.includes('/node_modules/react-day-picker/')) return 'calendar';
              if (normalizedId.includes('/node_modules/lucide-react/')) return 'ui-primitives';
              if (
                normalizedId.includes('/node_modules/@radix-ui/') ||
                normalizedId.includes('/node_modules/@floating-ui/') ||
                normalizedId.includes('/node_modules/cmdk/') ||
                normalizedId.includes('/node_modules/sonner/') ||
                normalizedId.includes('/node_modules/clsx/') ||
                normalizedId.includes('/node_modules/class-variance-authority/') ||
                normalizedId.includes('/node_modules/tailwind-merge/')
              ) {
                return 'ui-primitives';
              }
              return 'ui-primitives';
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
