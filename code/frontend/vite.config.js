import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Lokal ishlashda /api bilan boshlangan so'rovlar backend'ga yo'naltiriladi (standart: localhost:5000).
// Shu tufayli frontend kodida to'liq manzil yozish shart emas va CORS muammosi bo'lmaydi.
// Backend boshqa portda bo'lsa: VITE_PROXY_TARGET=http://localhost:5001 npm run dev
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
    },
  },
});
