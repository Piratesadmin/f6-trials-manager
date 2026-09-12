import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths allow the app to work at username.github.io/repository-name/.
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: 'index.html',
        welfare: 'welfare/index.html',
        signup: 'signup/index.html',
      },
    },
  },
})
