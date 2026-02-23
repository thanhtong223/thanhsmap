import { defineConfig } from 'vite'
import react from '@vitejs/react-vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/thanhsmap/', // This ensures assets load from the sub-folder
})