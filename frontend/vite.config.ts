import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
      '/health': { target: 'http://localhost:3333', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3333', changeOrigin: true },
    },
  },

  build: {
    // Limite de aviso de chunk (kB) — suprimir para chunks de vendor esperados
    chunkSizeWarningLimit: 600,

    // Source maps apenas em staging/review — desativar em produção para não expor código
    sourcemap: false,

    rollupOptions: {
      output: {
        // Code splitting manual por domínio de dependência
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
        // Nomeia chunks com hash determinístico para cache de longo prazo
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
