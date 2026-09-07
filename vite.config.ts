import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const isHttps = process.env.HTTPS === 'true' || process.env.npm_lifecycle_event === 'dev:https';

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isHttps ? [basicSsl()] : []),
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      ...(isHttps ? { https: true } : {}),
    },
  };
});

