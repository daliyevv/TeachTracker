import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * Kutubxonalarni ilova kodidan ajratamiz.
         *
         * Nega: Firebase SDK ~500KB va u deyarli hech qachon o'zgarmaydi,
         * ilova kodi esa har deploy'da o'zgaradi. Bitta faylda bo'lsa,
         * bitta tuzatish uchun foydalanuvchi butun 830KB ni QAYTA yuklab
         * olardi. Alohida bo'lsa, brauzer kutubxona bo'lagini keshdan
         * oladi.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Storage shu ro'yxatga TUSHMASLIGI kerak: u `dbService` da
          // dinamik import bilan yuklanadi, bu qoida esa uni majburan
          // birinchi yuklanadigan bo'lakka qaytarib qo'yardi.
          if (id.includes('@firebase/storage') || id.includes('firebase/storage')) {
            return undefined;
          }
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
});
