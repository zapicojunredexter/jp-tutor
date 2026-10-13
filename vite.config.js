import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180, // 5173 is used by another app; Vite moves to the next free port if 5180 is busy
    open: true, // opens the browser automatically
  },
})
