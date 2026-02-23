import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Log inicial para debug
console.log('🚀 Iniciando JurisPocket...')
console.log('📍 URL:', window.location.href)
console.log('🔑 Token:', localStorage.getItem('token') ? 'Presente' : 'Ausente')

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
