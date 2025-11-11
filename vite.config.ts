import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    //  Ensure the app is listening on all network interfaces
    host: '0.0.0.0',
    // Allow the Render domain to access the application
    allowedHosts: [
      'connect-4-cz3b.onrender.com', 
      'localhost',
      '127.0.0.1'
    ]
  }
})