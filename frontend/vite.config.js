import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react-router-dom')) return 'vendor-router';
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) return 'vendor-redux';

          const coreReact = ['/react/', '/react-dom/', '/scheduler/'];
          if (coreReact.some((lib) => id.includes(lib))) return 'vendor-react';

          if (id.includes('react-icons')) return 'vendor-icons';
          if (id.includes('framer-motion')) return 'vendor-animation';
          if (id.includes('date-fns') || id.includes('moment')) return 'vendor-utils';
          if (id.includes('lottie-react')) return 'vendor-lottie';

          return 'vendor-others';
        },
      },
    },
  },
});
