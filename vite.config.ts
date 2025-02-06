import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
// import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'fs';
import mkcert from 'vite-plugin-mkcert'
export default defineConfig({
  plugins: [react(),mkcert()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content.js'),
        background: resolve(__dirname, 'background.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') return 'content.js';
          if (chunkInfo.name === 'background') return 'background.js';
          return '[name].[hash].js';
        },
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost-cert.pem'),
    },
    cors: true,
    headers: {
      'Access-Control-Allow-Origin':
        '*',
    },
  },
})