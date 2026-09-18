import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './styles/globals.css'
import App from './App.jsx'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!CLERK_PUBLISHABLE_KEY) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')

// Suppress THREE.Clock deprecation — @react-three/fiber v9.x uses Clock internally;
// upstream fix pending. Remove once R3F upgrades to THREE.Timer.
const _warn = console.warn.bind(console)
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Clock: This module has been deprecated')) return
  _warn(...args)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)

// Retire the pre-JS boot splash once React has painted the app shell.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const boot = document.getElementById('boot')
    if (!boot) return
    boot.classList.add('boot-hide')
    setTimeout(() => boot.remove(), 500)
  })
})
