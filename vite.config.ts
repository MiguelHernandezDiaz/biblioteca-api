import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const isHttps = process.env.HTTPS === 'true' || process.env.npm_lifecycle_event === 'dev:https';

  const plugins: any[] = [react(), tailwindcss()];

  if (isHttps) {
    try {
      const basicSsl = (await import('@vitejs/plugin-basic-ssl')).default;
      plugins.push(basicSsl());
    } catch {
      console.warn(
        '\n[Aviso] @vitejs/plugin-basic-ssl no está instalado en tus node_modules locales.\nEjecuta: npm install @vitejs/plugin-basic-ssl -D\n'
      );
    }
  }

  return {
    plugins,
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      ...(isHttps ? { https: true } : {}),
    },
  };
});

