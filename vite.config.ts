import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const role = (env.VITE_APP_ROLE ?? 'caregiver').toLowerCase();
  const port = role === 'cared' ? 5174 : 5173;

  return {
    plugins: [react()],
    base: '/',
    server: {
      port,
      strictPort: true,
    },
    build: {
      outDir: `dist/${role}`,
      emptyOutDir: true,
    },
  };
});
