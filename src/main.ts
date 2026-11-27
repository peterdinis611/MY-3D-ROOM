import '../css/app.css'

window.addEventListener('error', (e) => {
  const h = document.getElementById('hint')
  if (h) h.textContent = `Chyba: ${e.error?.message || e.message}`
  console.error(e.error || e)
})

window.addEventListener('unhandledrejection', (e) => {
  const h = document.getElementById('hint')
  if (h) h.textContent = `Chyba: ${e.reason?.message || e.reason}`
  console.error(e.reason)
})

// Desk study scene (Three.js) — side-effect modul
import './app'
