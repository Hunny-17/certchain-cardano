import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss(), wasm(), topLevelAwait(), viteCommonjs()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@sidan-lab/sidan-csl-rs-nodejs': path.resolve(__dirname, './node_modules/@sidan-lab/sidan-csl-rs-browser/sidan_csl_rs.js'),
      crypto: path.resolve(__dirname, './src/components/v3/crypto-polyfill.cjs'),
      events: path.resolve(__dirname, './src/components/v3/events-polyfill.cjs'),
      'node:crypto': path.resolve(__dirname, './src/components/v3/crypto-polyfill.cjs'),
      'node:events': path.resolve(__dirname, './src/components/v3/events-polyfill.cjs'),
      'node:stream': path.resolve(__dirname, './src/components/v3/stream-polyfill.cjs'),
      process: path.resolve(__dirname, './node_modules/process/browser.js'),
      stream: path.resolve(__dirname, './src/components/v3/stream-polyfill.cjs'),
      util: path.resolve(__dirname, './node_modules/util/util.js'),
    },
  },
  optimizeDeps: {
    exclude: ['@meshsdk/core-csl', '@meshsdk/core-cst', '@sidan-lab/sidan-csl-rs-browser'],
    include: [
      'readable-stream', 'util',
      'bech32', 'json-bigint', 'base32-encoding',
      'blake2b', 'pbkdf2', 'bip39',
      '@stricahq/bip32ed25519', '@stricahq/cbors',
      '@harmoniclabs/cbor', '@harmoniclabs/plutus-data', '@harmoniclabs/uplc',
      '@simplewebauthn/browser',
    ],
  },
})
