
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // แปลงค่า process.env จากระบบ Cloud ให้เข้าถึงได้ในโค้ดฝั่ง Client
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: 'dist'
  }
});
