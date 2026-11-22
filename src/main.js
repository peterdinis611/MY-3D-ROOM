import '../css/app.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import appCode from './app.js?raw'

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

const run = new Function('THREE', 'OrbitControls', appCode)
run(THREE, OrbitControls)
