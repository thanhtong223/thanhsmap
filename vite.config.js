import { defineConfig } from 'vite'
import react from '@vitejs/react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This ensures the site works at thanhtong.xyz/thanhsmap
  base: '/thanhsmap/', 
})