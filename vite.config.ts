import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import basicSsl from '@vitejs/plugin-basic-ssl'
export default defineConfig({
  plugins: [react(),basicSsl()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'content' ? 'content.js' : '[name].[hash].js';
        },
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})