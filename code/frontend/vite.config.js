import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api bilan boshlangan so'rovlar backend'ga (localhost:5000) yo'naltiriladi.
// Shu tufayli frontend kodida to'liq manzil yozish shart emas va CORS muammosi bo'lmaydi.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
