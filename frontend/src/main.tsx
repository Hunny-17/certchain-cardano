import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Buffer } from 'buffer'
import App from './App.tsx'
import './index.css'

Object.assign(globalThis, {
  process: {
    env: {},
    browser: true,
    nextTick: (callback: () => void) => Promise.resolve().then(callback),
  },
  Buffer,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
