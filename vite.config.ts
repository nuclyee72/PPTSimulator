import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production builds (and `vite preview`) are served from https://nuclyee72.github.io/PPTSimulator/
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/PPTSimulator/' : '/',
  plugins: [react()],
}));
