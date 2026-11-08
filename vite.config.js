import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = import.meta.dirname;

// base نسبی تا هم در GitHub Pages (زیرپوشه) و هم داخل اپ اندروید کار کند
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    // CSS مدرن (logical properties, color-mix) بدون تبدیل به نسخه‌های قدیمی
    cssTarget: ['chrome111', 'safari16.4', 'firefox121', 'edge111'],
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        admin: resolve(root, 'admin.html'),
      },
    },
  },
});
