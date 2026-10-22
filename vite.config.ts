import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 单文件构建：dist/index.html 自包含，可直接 file:// 打开或放到任意静态托管
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2017', cssTarget: 'chrome61' },
});
