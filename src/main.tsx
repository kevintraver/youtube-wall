import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useWall } from './state/wall'

// A shared wall link (#l=…&s=…) replaces the saved wall, then the hash is cleared.
function importFromHash() {
  if (useWall.getState().importShared(window.location.hash)) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}
importFromHash()
window.addEventListener('hashchange', importFromHash)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
