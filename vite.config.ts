
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // ส่งผ่าน API_KEY จาก Environment Variable ไปยัง Client-side code
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  server: {
    host: true,
    // อนุญาตให้เข้าถึงจากภายนอกในโหมด Dev (ถ้าจำเป็น)
    allowedHosts: true 
  },
  preview: {
    // ตั้งค่า Port ให้ตรงกับที่ Render กำหนด (ปกติคือ 10000 หรือตาม PORT env)
    port: Number(process.env.PORT) || 4173,
    host: '0.0.0.0',
    // สำคัญ: แก้ไข Error "Blocked request" โดยการอนุญาตทุก Host หรือระบุชื่อโดเมน
    allowedHosts: [
      'pro-sos.onrender.com',
      '.onrender.com' // อนุญาตทุกซับโดเมนของ onrender.com
    ]
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});
