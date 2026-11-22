/* 01-helpers.js */
const M = (c, r = 0.8, m = 0) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m })
function box(p, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  m.castShadow = m.receiveShadow = true
  p.add(m)
  return m
}
function cyl(p, r, h, mat, x, y, z, r2 = r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, 32), mat)
  m.position.set(x, y, z)
  m.castShadow = m.receiveShadow = true
  p.add(m)
  return m
}
function ctex(w, h, fn) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  fn(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
const wood = (a, b) =>
  ctex(512, 512, (g, w, h) => {
    g.fillStyle = a
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = b
      g.globalAlpha = 0.06 + Math.random() * 0.14
      g.lineWidth = 0.8 + Math.random() * 1.8
      g.beginPath()
      const y = Math.random() * h
      g.moveTo(0, y)
      for (let x = 0; x <= w; x += 28) g.lineTo(x, y + Math.sin(x * 0.018 + i * 0.7) * 3.5)
      g.stroke()
    }
  })
const screenMat = (t) => new THREE.MeshBasicMaterial({ map: t, toneMapped: false })
const DESK_TOP = 0.765,
  RISER_TOP = 0.948
const onDesk = (x, z, r = 0.002) => [x, DESK_TOP + r, z]
const cableMats = {
  white: new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.82, metalness: 0.02 }),
  black: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.88, metalness: 0.03 }),
  pvc: new THREE.MeshStandardMaterial({ color: 0xe8e5df, roughness: 0.76, metalness: 0.02 }),
  braid: new THREE.MeshStandardMaterial({ color: 0xcfcac2, roughness: 0.58, metalness: 0.1 }),
  charcoal: new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.7, metalness: 0.08 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x2a6b6e, roughness: 0.65, metalness: 0.05 }),
}
const chromePlug = () =>
  new THREE.MeshStandardMaterial({ color: 0xc9c9ce, metalness: 0.62, roughness: 0.28 })
const plasticDark = () =>
  new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.48, metalness: 0.12 })
const V = (...a) => new THREE.Vector3(...a)

function layCable(anchors, mat, parent, r = 0.002, opts = {}) {
  const pts = anchors.map((a) => new THREE.Vector3(a[0], a[1], a[2]))
  const sag = opts.sag ?? 1
  const tension = opts.tension ?? 0.35
  const nearEnd = opts.protectEnds ?? 2
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1],
      b = pts[i],
      c = pts[i + 1]
    const deskish = b.y < DESK_TOP + 0.055
    const span = a.distanceTo(c)
    const edge = i <= nearEnd || i >= pts.length - 1 - nearEnd
    if (deskish) {
      b.y = Math.min(b.y, DESK_TOP + r * 1.15 - Math.min(0.008, span * 0.014) * sag)
      // zvlnenie len v strede trasy — pri portoch by pretínalo notebook
      if (!edge) {
        const wiggle = Math.sin(i * 1.7 + span * 8) * Math.min(0.012, span * 0.03) * sag
        b.x += wiggle * 0.35
        b.z += wiggle * 0.55
      }
    } else {
      b.y -= Math.min(0.028, span * 0.055) * sag
    }
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', tension)
  const len = curve.getLength()
  const segs = Math.max(40, Math.ceil(len * 90))
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, 8, false), mat)
  mesh.castShadow = mesh.receiveShadow = true
  parent.add(mesh)
  const t0 = curve.getTangent(0).normalize()
  const t1 = curve.getTangent(1).normalize()
  return {
    end0: pts[0].clone(),
    end1: pts[pts.length - 1].clone(),
    tan0: t0,
    tan1: t1,
    mesh,
    curve,
  }
}
function orientAlong(g, from, to) {
  const dir = new THREE.Vector3().subVectors(to, from)
  if (dir.lengthSq() < 1e-8) return
  g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize())
}
function orientByTangent(g, p, tan, flip = false) {
  g.position.copy(p)
  const dir = tan.clone().normalize()
  if (flip) dir.negate()
  g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir)
}
function usbPlug(parent, p, intoLaptop = false, toward = null, tan = null) {
  const g = new THREE.Group()
  if (tan) orientByTangent(g, p, tan, intoLaptop)
  else {
    g.position.copy(p)
    if (toward) orientAlong(g, p, toward)
  }
  const shellMat = intoLaptop ? cableMats.braid : cableMats.charcoal
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(intoLaptop ? 0.03 : 0.022, intoLaptop ? 0.009 : 0.007, intoLaptop ? 0.013 : 0.01),
    shellMat
  )
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.0044, 0.007), chromePlug())
  tip.position.set(intoLaptop ? -0.018 : -0.014, 0, 0)
  const boot = new THREE.Mesh(
    new THREE.CylinderGeometry(intoLaptop ? 0.0045 : 0.0036, intoLaptop ? 0.0032 : 0.0026, 0.016, 12),
    shellMat
  )
  boot.rotation.z = Math.PI / 2
  boot.position.x = intoLaptop ? 0.018 : 0.014
  const strain = new THREE.Mesh(
    new THREE.CylinderGeometry(intoLaptop ? 0.003 : 0.0024, intoLaptop ? 0.0042 : 0.0034, 0.008, 10),
    shellMat
  )
  strain.rotation.z = Math.PI / 2
  strain.position.x = intoLaptop ? 0.028 : 0.022
  g.add(shell, tip, boot, strain)
  parent.add(g)
  return g
}
function hdmiPlug(parent, p, tan = null, toward = null) {
  const g = new THREE.Group()
  if (tan) orientByTangent(g, p, tan, true)
  else {
    g.position.copy(p)
    if (toward) orientAlong(g, p, toward)
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.01, 0.016), plasticDark())
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.006, 0.012), chromePlug())
  tip.position.x = -0.018
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.014, 10), cableMats.black)
  boot.rotation.z = Math.PI / 2
  boot.position.x = 0.018
  g.add(body, tip, boot)
  parent.add(g)
  return g
}
function magsafePlug(parent, p, tan = null) {
  const g = new THREE.Group()
  if (tan) orientByTangent(g, p, tan, true)
  else g.position.copy(p)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.007, 0.014), cableMats.braid)
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.01), chromePlug())
  tip.position.x = -0.011
  const led = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.002, 0.006),
    new THREE.MeshBasicMaterial({ color: 0x5ad07a })
  )
  led.position.set(0.002, 0.004, 0)
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0028, 0.016, 10), cableMats.braid)
  boot.rotation.z = Math.PI / 2
  boot.position.x = 0.014
  g.add(head, tip, led, boot)
  parent.add(g)
  return g
}
function dcJack(parent, p, toward = null, tan = null) {
  const g = new THREE.Group()
  if (tan) orientByTangent(g, p, tan, true)
  else {
    g.position.copy(p)
    if (toward) orientAlong(g, p, toward)
  }
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0082, 0.024, 14), plasticDark())
  body.rotation.z = Math.PI / 2
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0023, 0.0023, 0.011, 10), chromePlug())
  pin.rotation.z = Math.PI / 2
  pin.position.x = -0.015
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.0076, 0.0013, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.38, metalness: 0.35 })
  )
  ring.rotation.y = Math.PI / 2
  ring.position.x = -0.005
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0032, 0.014, 10), cableMats.pvc)
  boot.rotation.z = Math.PI / 2
  boot.position.x = 0.016
  g.add(body, pin, ring, boot)
  parent.add(g)
  return g
}
function iecPlug(parent, p, tan = null) {
  const g = new THREE.Group()
  if (tan) orientByTangent(g, p, tan, false)
  else g.position.copy(p)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.018, 0.022), plasticDark())
  const prongs = chromePlug()
  for (const [dx, dy] of [
    [-0.006, 0.004],
    [-0.006, -0.004],
    [0.006, 0],
  ]) {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0025, 0.0025), prongs)
    pin.position.set(-0.02, dy, dx * 0.4)
    g.add(pin)
  }
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.0035, 0.02, 10), cableMats.pvc)
  boot.rotation.z = Math.PI / 2
  boot.position.x = 0.024
  g.add(body, boot)
  parent.add(g)
  return g
}
function rj45Plug(parent, p, tan = null) {
  const g = new THREE.Group()
  if (tan) orientByTangent(g, p, tan, true)
  else g.position.copy(p)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.01, 0.014), cableMats.teal)
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.008, 0.011), M(0xd8d8dc, 0.4, 0.15))
  tip.position.x = -0.014
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.003, 0.006), M(0xb0b0b4, 0.5))
  clip.position.set(-0.01, 0.006, 0)
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0026, 0.012, 10), cableMats.teal)
  boot.rotation.z = Math.PI / 2
  boot.position.x = 0.014
  g.add(body, tip, clip, boot)
  parent.add(g)
  return g
}
function ferrite(parent, p, toward = null, tan = null) {
  const g = new THREE.Group()
  if (tan) orientByTangent(g, p, tan, false)
  else {
    g.position.copy(p)
    if (toward) orientAlong(g, p, toward)
  }
  const bead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0075, 0.0075, 0.022, 14),
    new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.75, metalness: 0.04 })
  )
  bead.rotation.z = Math.PI / 2
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.0225, 0.0015, 0.0155),
    new THREE.MeshStandardMaterial({ color: 0x2e2e32, roughness: 0.6 })
  )
  g.add(bead, seam)
  parent.add(g)
  return g
}
function cableClip(parent, x, z, yaw = 0.1) {
  const c = box(parent, 0.02, 0.007, 0.014, M(0x222226, 0.5), x, DESK_TOP + 0.0045, z)
  c.rotation.y = yaw
  return c
}
function cableTie(parent, p, tan) {
  const g = new THREE.Group()
  orientByTangent(g, p, tan || new THREE.Vector3(1, 0, 0), false)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.0045, 0.0011, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.55 })
  )
  ring.rotation.y = Math.PI / 2
  g.add(ring)
  parent.add(g)
  return g
}
function cableCoil(parent, cx, cy, cz, turns = 3, r = 0.035, tubeR = 0.0024, mat = cableMats.pvc) {
  const pts = []
  const steps = Math.max(24, Math.ceil(turns * 16))
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const a = u * turns * Math.PI * 2
    pts.push(
      new THREE.Vector3(
        cx + Math.cos(a) * r,
        cy + 0.01 + u * turns * 0.011,
        cz + Math.sin(a) * r * 0.75
      )
    )
  }
  // vstup / výstup, aby Frenet rámček neskolaboval
  pts.unshift(new THREE.Vector3(cx + r + 0.02, cy + 0.008, cz))
  pts.push(new THREE.Vector3(cx - r - 0.015, cy + 0.01 + turns * 0.011, cz + 0.02))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.25)
  const segs = Math.max(48, steps * 2)
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, tubeR, 6, false), mat)
  mesh.castShadow = true
  parent.add(mesh)
  return mesh
}
function txt(g, s, x, y, c = '#c9d1d9', f = '12px ui-monospace,Menlo,monospace') {
  g.fillStyle = c
  g.font = f
  g.fillText(s, x, y)
}

/* 02-time-of-day-presets-shared-by-both-scenes.js */
const P = [
  { n: 'Dawn', sp: [-6, 0.9, 1], sc: 0xff8a5c, si: 1.8, sky: 0xf08a6a, amb: 0.25, ex: 0.9 },
  { n: 'Morning', sp: [-6, 2.2, 1], sc: 0xffb15c, si: 3.2, sky: 0xf4b36a, amb: 0.35, ex: 1.0 },
  { n: 'Noon', sp: [-6, 3.2, 1], sc: 0xfff1dc, si: 3.8, sky: 0x7fb8ee, amb: 0.55, ex: 1.1 },
  { n: 'Afternoon', sp: [-5, 3.4, 1], sc: 0xffe2b8, si: 3.6, sky: 0x9cc8ee, amb: 0.5, ex: 1.1 },
  { n: 'Sunset', sp: [-6, 0.6, -0.6], sc: 0xff6a2a, si: 2.6, sky: 0xd2552e, amb: 0.25, ex: 0.9 },
  { n: 'Storm', sp: [-5, 3, 1], sc: 0x8fa3bd, si: 0.6, sky: 0x58626e, amb: 0.22, ex: 0.8 },
  { n: 'Moon', sp: [-5, 3, 0.5], sc: 0x7f9cff, si: 0.5, sky: 0x0a1030, amb: 0.08, ex: 0.7 },
]
const S = {
  i: 1,
  sp: new THREE.Vector3(...P[0].sp),
  sc: new THREE.Color(P[0].sc),
  si: P[0].si,
  sky: new THREE.Color(P[0].sky),
  amb: P[0].amb,
  blade: 0.35,
  open: 1,
  openT: 1,
  ceil: 1,
  ceilT: 1,
  lamp: 0,
  lampT: 0,
  air: 0.5,
  drift: true,
  study: false,
  flash: 0,
}

/* 03-renderer-outer-scene.js */
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.shadowMap.autoUpdate = false
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x252019)
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 50)
const HOME = new THREE.Vector3(1.1, 1.1, 3.3),
  HOMET = new THREE.Vector3(-0.1, 1.0, 0)
camera.position.copy(HOME)
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.copy(HOMET)
controls.enableDamping = true
controls.minDistance = 1
controls.maxDistance = 4
controls.enablePan = false
controls.zoomSpeed = 0.7
controls.dampingFactor = 0.08
controls.maxPolarAngle = Math.PI * 0.55
controls.minAzimuthAngle = -0.55
controls.maxAzimuthAngle = 1.2

const sun = new THREE.DirectionalLight(0xffffff, 2)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 })
sun.shadow.bias = -0.0004
sun.target.position.set(0, 0.8, 0.3)
scene.add(sun, sun.target)
const amb = new THREE.HemisphereLight(0xfff4e8, 0x5c5048, 0.34)
scene.add(amb)
const lampGlow = new THREE.PointLight(0x9ad0ff, 0, 3)
lampGlow.position.set(0, 1.3, 0.4)
scene.add(lampGlow)

/* 04-vyhlad-za-oknom-canvas-textura-podla-casu-dna.js */
const winSkyCanvas = document.createElement('canvas')
winSkyCanvas.width = 720
winSkyCanvas.height = 480
let winSkyTex
function skyHex(c) {
  return `#${(c >>> 0).toString(16).padStart(6, '0')}`
}
function mixHex(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16),
    ag = parseInt(a.slice(3, 5), 16),
    ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16),
    bg = parseInt(b.slice(3, 5), 16),
    bb = parseInt(b.slice(5, 7), 16)
  const m = (v) => Math.round(v).toString(16).padStart(2, '0')
  return `#${m(ar + (br - ar) * t)}${m(ag + (bg - ag) * t)}${m(ab + (bb - ab) * t)}`
}
function drawWinSky(di) {
  const g = winSkyCanvas.getContext('2d'),
    w = 720,
    h = 480,
    pr = P[Math.min(Math.max(di, 0), P.length - 1)]
  const hy = h * 0.54,
    night = di === 6,
    storm = di === 5
  g.clearRect(0, 0, w, h)
  const top = skyHex(pr.sky),
    hor = mixHex(top, '#e8dcc8', 0.45)
  const grd = g.createLinearGradient(0, 0, 0, h)
  grd.addColorStop(0, top)
  grd.addColorStop(0.42, hor)
  grd.addColorStop(1, storm ? '#6a7078' : night ? '#1a2540' : '#b8c4b0')
  g.fillStyle = grd
  g.fillRect(0, 0, w, h)
  if (di === 4) {
    g.fillStyle = 'rgba(255,120,50,.22)'
    g.fillRect(0, hy - 40, w, 90)
  }
  if (!night && !storm) {
    g.fillStyle = 'rgba(255,255,255,.55)'
    ;[
      [0.18, 0.14, 95, 34],
      [0.52, 0.09, 120, 28],
      [0.78, 0.17, 80, 24],
    ].forEach(([x, y, cw, ch]) => {
      g.beginPath()
      g.ellipse(x * w, y * h, cw, ch * 0.45, 0, 0, 7)
      g.fill()
    })
  }
  if (storm) {
    g.fillStyle = 'rgba(35,42,58,.55)'
    ;[
      [0.22, 0.12, 130],
      [0.55, 0.08, 160],
      [0.78, 0.15, 110],
    ].forEach(([x, y, cw]) => {
      g.beginPath()
      g.ellipse(x * w, y * h, cw, 36, 0, 0, 7)
      g.fill()
    })
  }
  if (night) {
    g.fillStyle = '#fff'
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w,
        y = Math.random() * hy * 0.85,
        s = Math.random() < 0.08 ? 1.6 : 0.6
      g.globalAlpha = 0.2 + Math.random() * 0.65
      g.fillRect(x, y, s, s)
    }
    g.globalAlpha = 1
    g.fillStyle = 'rgba(240,240,255,.92)'
    g.beginPath()
    g.arc(w * 0.72, hy * 0.45, 22, 0, 7)
    g.fill()
    g.fillStyle = 'rgba(160,170,190,.35)'
    g.beginPath()
    g.arc(w * 0.69, hy * 0.45, 20, 0, 7)
    g.fill()
  }
  const hill = (base, col) => {
    g.fillStyle = col
    g.beginPath()
    g.moveTo(0, h)
    for (let x = 0; x <= w; x += 20) {
      const t = x / w
      g.lineTo(x, base + Math.sin(t * 9) * 14 + Math.sin(t * 21) * 6 + Math.cos(t * 4) * 10)
    }
    g.lineTo(w, h)
    g.closePath()
    g.fill()
  }
  hill(hy, storm ? '#4a5348' : night ? '#1e2a22' : '#5a6f52')
  hill(hy + 28, storm ? '#3d463c' : night ? '#152019' : '#465a40')
  g.fillStyle = storm ? '#1f261e' : night ? '#0f1510' : '#2a3826'
  g.beginPath()
  g.moveTo(0, h)
  for (let x = 0; x <= w; x += 8) {
    const t = x / w,
      y = hy + 38 + Math.sin(t * 17) * 12 + Math.sin(t * 41) * 7 + (t > 0.35 && t < 0.75 ? -18 : 0)
    g.lineTo(x, y)
  }
  g.lineTo(w, h)
  g.closePath()
  g.fill()
  const roofs = [
    [0.05, 0.62, 0.12, 0.08, '#6e5848'],
    [0.2, 0.58, 0.14, 0.11, '#7a6555'],
    [0.38, 0.6, 0.16, 0.09, '#5c5048'],
    [0.58, 0.57, 0.18, 0.12, '#8a7260'],
    [0.78, 0.59, 0.15, 0.1, '#6a5a4c'],
  ]
  roofs.forEach(([x, yy, rw, rh, col]) => {
    g.fillStyle = col
    g.fillRect(x * w, (yy - 0.02) * h, rw * w, rh * h)
    g.fillStyle = 'rgba(255,255,255,.12)'
    g.fillRect((x + 0.01) * w, (yy - 0.015) * h, rw * w * 0.3, 3)
  })
  if (di <= 3) (g.fillStyle = 'rgba(120,170,230,.18)'), g.fillRect(w * 0.12, hy + 55, w * 0.22, 32)
  if (night) {
    g.fillStyle = '#f8d070'
    ;[
      [0.08, 0.62],
      [0.25, 0.58],
      [0.42, 0.6],
      [0.62, 0.57],
      [0.82, 0.59],
    ].forEach(([x, yy], i) => {
      if (i % 2) g.fillRect(x * w, yy * h, 5, 7)
    })
  }
  g.fillStyle = night ? 'rgba(0,0,0,.25)' : 'rgba(20,30,18,.18)'
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(w * 0.16, 0)
  g.lineTo(w * 0.22, h * 0.38)
  g.quadraticCurveTo(w * 0.08, h * 0.42, 0, h * 0.28)
  g.fill()
  g.beginPath()
  g.moveTo(w, 0)
  g.lineTo(w * 0.9, h * 0.22)
  g.lineTo(w, h * 0.35)
  g.fill()
  winSkyTex.needsUpdate = true
}

/* 05-buildroom-floor-walls-window.js */
function buildRoom() {
  const wall = M(0xf0ebe3, 0.94)
  box(scene, 6.4, 0.05, 5.5, M(0x8a6f55, 0.7), 0.6, -0.025, 2.1)
  ceilMesh = box(scene, 6.4, 0.05, 5.5, M(0xf1ece4, 0.95), 0.6, 3.025, 2.1)
  box(scene, 6.4, 3, 0.05, M(0xe9e4dc, 0.95), 0.6, 1.5, 4.8)
  box(scene, 0.05, 3, 5.5, M(0xe9e4dc, 0.95), 3.8, 1.5, 2.1) // floor + strop
  box(scene, 6.4, 3, 0.05, wall, 0.6, 1.5, -0.62) // back wall
  // left wall with window opening (x=-2.6, opening y .7–2.5, z -.4–1.8)
  const X = -2.6
  box(scene, 0.1, 0.7, 5.5, wall, X, 0.35, 2.1)
  box(scene, 0.1, 0.5, 5.5, wall, X, 2.75, 2.1)
  box(scene, 0.1, 1.8, 0.2, wall, X, 1.6, -0.5)
  box(scene, 0.1, 1.8, 3.2, wall, X, 1.6, 3.4)
  // window frame + mullion + sill
  const fr = M(0xf4efe6, 0.6)
  box(scene, 0.12, 0.06, 2.2, fr, X, 0.72, 0.7)
  box(scene, 0.12, 0.06, 2.2, fr, X, 2.48, 0.7)
  box(scene, 0.12, 1.8, 0.06, fr, X, 1.6, -0.38)
  box(scene, 0.12, 1.8, 0.06, fr, X, 1.6, 1.78)
  box(scene, 0.12, 1.8, 0.05, fr, X, 1.6, 0.7)
  box(scene, 0.12, 0.05, 2.2, fr, X, 1.6, 0.7)
  box(scene, 0.3, 0.04, 2.4, fr, X + 0.1, 0.7, 0.7)
  const sash = (z0, d) => {
    const q = new THREE.Group()
    q.position.set(X, 0, z0)
    scene.add(q)
    const w = 1.02,
      h = 1.64,
      yc = 1.61
    box(q, 0.04, 0.04, w, fr, 0, 0.8, (d * w) / 2)
    box(q, 0.04, 0.04, w, fr, 0, 2.42, (d * w) / 2)
    box(q, 0.04, h, 0.04, fr, 0, yc, 0)
    box(q, 0.04, h, 0.04, fr, 0, yc, d * w)
    const gl = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        roughness: 0,
      })
    )
    gl.rotation.y = Math.PI / 2
    gl.position.set(0, yc, (d * w) / 2)
    q.add(gl)
    return q
  }
  sashL = sash(-0.34, 1)
  sashR = sash(1.74, -1)
  winSkyTex = new THREE.CanvasTexture(winSkyCanvas)
  winSkyTex.colorSpace = THREE.SRGBColorSpace
  drawWinSky(S.i)
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.MeshBasicMaterial({ map: winSkyTex, color: 0xffffff, toneMapped: false })
  )
  sky.rotation.y = Math.PI / 2
  sky.position.set(-6, 1.6, 0.7)
  sky.name = 'sky'
  scene.add(sky)
  windowHit = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1.72),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  windowHit.rotation.y = Math.PI / 2
  windowHit.position.set(-2.57, 1.58, 0.7)
  windowHit.name = 'windowHit'
  scene.add(windowHit)
  // radiator (far left of back wall)
  radMats = []
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf7f7f5,
      roughness: 0.4,
      metalness: 0.05,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
    radMats.push(mat)
    box(scene, 0.07, 1.7, 0.1, mat, -2.3 + i * 0.075, 1.05, -0.54)
  }
  // light switch + plate
  switchBox = box(scene, 0.09, 0.09, 0.015, M(0xe8dcc0, 0.5), 2.05, 1.2, -0.59)
  box(scene, 0.018, 0.04, 0.012, M(0xffffff, 0.4), 2.05, 1.2, -0.578)
}

/* 05b-klima-teplota-radiator.js */
let radMats = [],
  radiatorOn = false,
  roomTemp = 20,
  outdoorTemp = 14
// vonkajšia teplota podľa času dňa (°C)
const OUT_TEMP = [7, 12, 22, 24, 15, 8, 2]
function outdoorForDay(i = S.i) {
  return OUT_TEMP[Math.min(OUT_TEMP.length - 1, Math.max(0, i | 0))]
}
function roomTempTarget() {
  const out = outdoorForDay()
  let t = out + (radiatorOn ? 11 : -0.5)
  if (windowIsOpen()) {
    // otvorené okno ťahá k vonkajšej teplote
    t = t * 0.35 + out * 0.65
  } else {
    t += radiatorOn ? 2.5 : 1.2 // zatvorená izba drží teplo
  }
  return t
}
function setRadiator(on, skipSave = false) {
  radiatorOn = !!on
  if ($('bRad')) setSw('bRad', radiatorOn)
  syncRadiatorLook()
  if (!skipSave) {
    savePrefs()
    sfxClick()
  }
}
function syncRadiatorLook() {
  const warm = radiatorOn ? 1 : 0
  radMats.forEach((m) => {
    m.emissive.setHex(warm ? 0xff6a2a : 0x000000)
    m.emissiveIntensity = warm ? 0.35 : 0
    m.color.setHex(warm ? 0xffe8dc : 0xf7f7f5)
  })
}
function syncClimateUi() {
  const dayEl = $('climateDay'),
    tempEl = $('climateTemp'),
    outEl = $('climateOut'),
    wrap = tempEl?.parentElement
  if (!dayEl || !tempEl) return
  dayEl.textContent = typeof SK !== 'undefined' ? SK[S.i] : P[S.i]?.n || ''
  tempEl.textContent = roomTemp.toFixed(1)
  if (outEl) outEl.textContent = String(Math.round(outdoorTemp))
  if (wrap) {
    wrap.classList.toggle('cold', roomTemp < 16)
    wrap.classList.toggle('warm', roomTemp >= 16 && roomTemp < 23)
    wrap.classList.toggle('hot', roomTemp >= 23)
  }
}
let climateUiAcc = 0
function updateClimate(dt) {
  outdoorTemp += (outdoorForDay() - outdoorTemp) * Math.min(1, dt * 0.6)
  const tgt = roomTempTarget()
  // radiátor ohrieva rýchlejšie; otvorené okno chladí / vyrovnáva rýchlejšie
  const rate = radiatorOn ? 0.28 : windowIsOpen() ? 0.4 : 0.14
  roomTemp += (tgt - roomTemp) * Math.min(1, dt * rate)
  climateUiAcc += dt
  if (climateUiAcc > 0.12) {
    climateUiAcc = 0
    syncClimateUi()
  }
}

/* 06-builddesk-desk-riser-mat-pouch-cables.js */
function buildDesk() {
  const top = new THREE.MeshStandardMaterial({
    map: wood('#a87a54', '#6d5240'),
    color: 0xc4a882,
    roughness: 0.58,
    clearcoat: 0.06,
  })
  box(scene, 3.4, 0.05, 1.2, top, 0, 0.74, 0)
  for (const x of [-1.6, 1.6])
    for (const z of [-0.5, 0.5]) box(scene, 0.05, 0.72, 0.05, M(0x222222, 0.5, 0.6), x, 0.36, z)
  const beech = new THREE.MeshStandardMaterial({
    map: wood('#d4bc94', '#9a7858'),
    color: 0xddc8a4,
    roughness: 0.55,
  })
  box(scene, 1.5, 0.035, 0.34, beech, 0, 0.93, -0.33)
  for (const x of [-0.7, 0.7]) box(scene, 0.04, 0.17, 0.34, beech, x, 0.835, -0.33)
  box(scene, 1.1, 0.004, 0.42, M(0x15151a, 0.9), 1.0, 0.766, 0.35) // mouse mat
  box(scene, 0.2, 0.04, 0.07, M(0x0e0e10, 0.8), -0.5, 0.78, -0.27) // pen pouch
  box(scene, 0.13, 0.015, 0.1, M(0xe7e2d0, 0.9), 0.3, 0.77, -0.25) // sticker sheet
}

/* 07-papier-na-stole-zapis-localstorage.js */
const PAPER_LS = 'deskstudy-paper-v1'
const PREF_LS = 'deskstudy-prefs-v1'
function defaultPrefs() {
  return {
    day: 1,
    open: 1,
    ceil: 1,
    lamp: 0,
    snd: 1,
    autoDay: 0,
    snow: 0,
    sit: 0,
    trash: 0,
    pwrAoc: 1,
    pwrDell: 1,
    pwrMac: 1,
    uiFold: 0,
    rad: 0,
  }
}
function loadPrefs() {
  try {
    const r = localStorage.getItem(PREF_LS)
    if (!r) return defaultPrefs()
    const raw = JSON.parse(r)
    const p = { ...defaultPrefs(), ...raw }
    // starý „tmavý režim“ → samostatná lampa / strop
    if (!('ceil' in raw) && 'dark' in raw) {
      p.ceil = raw.dark ? 0 : 1
      p.lamp = raw.dark ? 1 : 0
    }
    return p
  } catch {
    return defaultPrefs()
  }
}
function savePrefs() {
  try {
    localStorage.setItem(
      PREF_LS,
      JSON.stringify({
        day: S.i,
        open: S.openT > 0.5 ? 1 : 0,
        ceil: S.ceilT > 0.5 ? 1 : 0,
        lamp: S.lampT > 0.5 ? 1 : 0,
        snd: A.on ? 1 : 0,
        autoDay: autoDay ? 1 : 0,
        snow: snowOn ? 1 : 0,
        sit: sitting ? 1 : 0,
        trash: trashOpen ? 1 : 0,
        pwrAoc: PWR.aoc ? 1 : 0,
        pwrDell: PWR.dell ? 1 : 0,
        pwrMac: PWR.mac ? 1 : 0,
        uiFold: $('ui')?.classList.contains('fold') ? 1 : 0,
        rad: radiatorOn ? 1 : 0,
      })
    )
  } catch {}
}
function applyPrefs(p) {
  const day = Math.min(P.length - 1, Math.max(0, p.day | 0))
  setTimeOfDay(day, true, true)
  S.openT = S.open = p.open ? 1 : 0
  setSw('bWin', !!p.open)
  S.ceilT = S.ceil = p.ceil ? 1 : 0
  S.lampT = S.lamp = p.lamp ? 1 : 0
  if ($('bCeil')) setSw('bCeil', !!p.ceil)
  if ($('bLamp')) setSw('bLamp', !!p.lamp)
  setSound(!!p.snd)
  setSw('bSnd', !!p.snd)
  autoDay = !!p.autoDay
  setSw('bAuto', autoDay)
  snowOn = false
  if (p.uiFold) {
    $('ui').classList.add('fold')
    $('bFold').textContent = '+'
  }
  setSitting(!!p.sit, true)
  setTrashOpen(!!p.trash, true)
  PWR.aoc = !!p.pwrAoc
  PWR.dell = !!p.pwrDell
  PWR.mac = !!p.pwrMac
  setSw('bPwrAoc', PWR.aoc)
  setSw('bPwrDell', PWR.dell)
  setSw('bPwrMac', PWR.mac)
  applyDevicePower(true)
  macLidAng = PWR.mac ? -0.35 : -0.02
  setRadiator(!!p.rad, true)
  outdoorTemp = outdoorForDay()
  roomTemp = roomTempTarget()
  syncClimateUi()
}
let paperG,
  paperMesh,
  paperTex,
  paperMat,
  paperReadL,
  penMeshes = {},
  activePen = 'red'
const PAPER_FONT = '26px Georgia,serif'
const PAPER_FONT_PLACE = 'italic 22px Georgia,serif'
const PENS = {
  red: { id: 'red', label: 'Červené', ink: '#b01010', body: 0xc01818, yLift: 0.018 },
  blue: { id: 'blue', label: 'Modré', ink: '#143a8c', body: 0x1a3a8a, yLift: 0.018 },
  pencil: { id: 'pencil', label: 'Ceruzka', ink: '#3a2e22', body: 0xc9a06c, yLift: 0.016 },
}
function loadPaperData() {
  try {
    const r = localStorage.getItem(PAPER_LS)
    if (!r) return { text: '', pen: 'red' }
    if (r.trim().startsWith('{')) {
      const o = JSON.parse(r)
      return { text: typeof o.text === 'string' ? o.text : '', pen: PENS[o.pen] ? o.pen : 'red' }
    }
    return { text: r, pen: 'red' }
  } catch {
    return { text: '', pen: 'red' }
  }
}
function savePaperData(text, pen = activePen) {
  try {
    localStorage.setItem(PAPER_LS, JSON.stringify({ text, pen }))
  } catch {}
}
function textFromStorage() {
  return loadPaperData().text
}
function paperWrapLines(c, text, maxW) {
  const lines = []
  c.font = PAPER_FONT
  ;(text || '').split('\n').forEach((par) => {
    if (!par.trim()) {
      lines.push('')
      return
    }
    const words = par.split(/\s+/)
    let line = ''
    words.forEach((w) => {
      const next = line ? `${line} ${w}` : w
      if (c.measureText(next).width > maxW && line) {
        lines.push(line)
        line = w
      } else line = next
    })
    if (line) lines.push(line)
  })
  return lines
}
function paperInk() {
  return (PENS[activePen] || PENS.red).ink
}
function paperDraw(c, w, h, text) {
  c.fillStyle = '#f8f4eb'
  c.fillRect(0, 0, w, h)
  c.strokeStyle = 'rgba(55,95,175,.22)'
  c.lineWidth = 1.2
  for (let y = 48; y < h; y += 36) {
    c.beginPath()
    c.moveTo(36, y)
    c.lineTo(w - 28, y)
    c.stroke()
  }
  c.strokeStyle = 'rgba(200,60,60,.28)'
  c.lineWidth = 1.5
  c.beginPath()
  c.moveTo(88, 28)
  c.lineTo(88, h - 24)
  c.stroke()
  const body = (text || '').trim()
  const ink = paperInk()
  if (!body) {
    c.fillStyle = 'rgba(40,32,24,.55)'
    c.font = PAPER_FONT_PLACE
    c.fillText('Klikni papier = prečítať · P = písať', 102, 64)
    c.fillText('Klikni pero na stole = farba atramentu', 102, 100)
  } else {
    const lines = paperWrapLines(c, body, w - 130).slice(0, 18)
    c.fillStyle = ink
    c.font = PAPER_FONT
    lines.forEach((ln, i) => c.fillText(ln, 102, 66 + i * 36))
  }
}
function refreshPaper(tex = textFromStorage()) {
  if (!paperTex?.image) return
  paperDraw(paperTex.image.getContext('2d'), paperTex.image.width, paperTex.image.height, tex)
  paperTex.needsUpdate = true
}
function syncPenUi() {
  document.querySelectorAll('.penPick').forEach((b) => {
    b.classList.toggle('on', b.dataset.pen === activePen)
  })
  const ta = $('paperText')
  if (ta) {
    ta.style.color = paperInk()
    ta.style.caretColor = paperInk()
  }
  Object.entries(penMeshes).forEach(([id, mesh]) => {
    if (!mesh) return
    const on = id === activePen
    mesh.position.y = on ? mesh.userData.baseY + 0.012 : mesh.userData.baseY
    mesh.scale.setScalar(on ? 1.12 : 1)
  })
}
function setActivePen(id, { save = true, redraw = true } = {}) {
  if (!PENS[id]) return
  activePen = id
  syncPenUi()
  if (redraw) refreshPaper()
  if (save) {
    const d = loadPaperData()
    savePaperData(d.text, activePen)
  }
  sfxClick()
}
function addPenPart(g, mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
  g.add(mesh)
  return mesh
}
/** Valec/kužeľ pozdĺž osi X (hrot smeruje k −X). */
function penAlongX(geo, mat, x, y = 0) {
  const m = new THREE.Mesh(geo, mat)
  m.rotation.z = Math.PI / 2
  m.position.set(x, y, 0)
  return m
}
function buildBallpointPen(id, bodyCol, x, y, z, yaw) {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  g.rotation.y = yaw
  const body = M(bodyCol, 0.36, 0.2)
  const chrome = M(0xc9cad0, 0.28, 0.88)
  const tipM = M(0x2c2c30, 0.32, 0.75)
  const inkDot = M(0x111111, 0.25, 0.9)
  addPenPart(g, penAlongX(new THREE.CylinderGeometry(0.007, 0.0076, 0.085, 20), body, 0.002))
  addPenPart(g, penAlongX(new THREE.CylinderGeometry(0.0064, 0.007, 0.014, 14), chrome, -0.046))
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.0064, 0.015, 14), tipM)
  cone.rotation.z = -Math.PI / 2
  cone.position.set(-0.056, 0, 0)
  addPenPart(g, cone)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 10, 8), inkDot)
  ball.position.set(-0.064, 0, 0)
  addPenPart(g, ball)
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0024, 0.007), chrome)
  clip.position.set(0.032, 0.0085, 0)
  addPenPart(g, clip)
  addPenPart(g, penAlongX(new THREE.CylinderGeometry(0.0052, 0.0056, 0.012, 12), chrome, 0.05))
  addPenPart(g, penAlongX(new THREE.CylinderGeometry(0.0034, 0.0034, 0.01, 10), tipM, 0.06))
  g.userData = { penId: id, baseY: y }
  paperG.add(g)
  penMeshes[id] = g
  return g
}
function buildPencilPen(id, x, y, z, yaw) {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  g.rotation.y = yaw
  const wood = M(0xd2a46a, 0.72, 0.04)
  const paint = M(0xe8b84a, 0.55, 0.06)
  const graphite = M(0x2a2a2a, 0.4, 0.15)
  const ferrule = M(0xb8b8bc, 0.3, 0.82)
  const eraser = M(0xe89aa0, 0.68, 0.04)
  addPenPart(g, penAlongX(new THREE.CylinderGeometry(0.0062, 0.0062, 0.08, 6), paint, 0.004))
  const woodTip = new THREE.Mesh(new THREE.ConeGeometry(0.0062, 0.018, 6), wood)
  woodTip.rotation.z = -Math.PI / 2
  woodTip.position.set(-0.048, 0, 0)
  addPenPart(g, woodTip)
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.009, 6), graphite)
  lead.rotation.z = -Math.PI / 2
  lead.position.set(-0.06, 0, 0)
  addPenPart(g, lead)
  addPenPart(g, penAlongX(new THREE.CylinderGeometry(0.0066, 0.0066, 0.012, 12), ferrule, 0.05))
  addPenPart(g, penAlongX(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 12), eraser, 0.062))
  g.userData = { penId: id, baseY: y }
  paperG.add(g)
  penMeshes[id] = g
  return g
}
function buildPaper() {
  const data = loadPaperData()
  activePen = PENS[data.pen] ? data.pen : 'red'
  paperG = new THREE.Group()
  paperG.position.set(-0.36, DESK_TOP, 0.2)
  scene.add(paperG)
  box(paperG, 0.28, 0.0035, 0.19, M(0xe8e0d4, 0.92), 0, 0.0018, 0)
  const sheetM = new THREE.MeshStandardMaterial({
    color: 0xf2ece2,
    roughness: 0.94,
    side: THREE.DoubleSide,
  })
  ;[
    [0.014, 0.002, -0.01, 0.04],
    [-0.01, 0.0012, 0.012, -0.03],
  ].forEach(([x, y, z, rz]) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.165), sheetM)
    s.rotation.x = -Math.PI / 2
    s.position.set(x, y, z)
    s.rotation.z = rz
    paperG.add(s)
  })
  paperTex = ctex(1024, 740, (c, w, h) => paperDraw(c, w, h, data.text))
  paperMat = new THREE.MeshBasicMaterial({
    map: paperTex,
    toneMapped: false,
    side: THREE.FrontSide,
  })
  const paperGeo = new THREE.PlaneGeometry(0.26, 0.18)
  // 180° v UV: pôvodný mapping bol zrkadlený + hore nohou pri pohľade na čítanie
  {
    const uv = paperGeo.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), 1 - uv.getY(i))
    uv.needsUpdate = true
  }
  paperMesh = new THREE.Mesh(paperGeo, paperMat)
  paperMesh.rotation.x = -Math.PI / 2
  paperMesh.position.set(0, 0.012, 0)
  paperMesh.rotation.z = 0.02
  paperMesh.renderOrder = 4
  paperMesh.castShadow = false
  paperMesh.receiveShadow = true
  paperG.add(paperMesh)
  paperReadL = new THREE.PointLight(0xfff4e4, 1.35, 1.2)
  paperReadL.position.set(0, 0.22, 0.02)
  paperReadL.visible = false
  paperG.add(paperReadL)
  buildBallpointPen('red', 0xb41c1c, 0.05, 0.014, 0.055, 0.35)
  buildBallpointPen('blue', 0x1a3a8a, -0.05, 0.013, -0.06, -0.45)
  buildPencilPen('pencil', 0.1, 0.012, -0.01, 0.95)
  syncPenUi()
}
function pickPen(e) {
  if (!paperG) return null
  const h = pick(e, paperG)
  if (!h) return null
  let o = h.object
  while (o && o !== paperG) {
    if (o.userData?.penId) return o
    o = o.parent
  }
  return null
}

/* 08-stolicka-sedenie-vstavanie.js */
let chairG
const SEAT_POS = new THREE.Vector3(0.06, 1.04, 1.02),
  SEAT_TGT = new THREE.Vector3(0.02, 0.97, -0.12)
const SEAT_FOV = 44
let sitting = false,
  seatFov = SEAT_FOV
function initSeatYawPitch() {
  const dx = SEAT_TGT.x - SEAT_POS.x,
    dy = SEAT_TGT.y - SEAT_POS.y,
    dz = SEAT_TGT.z - SEAT_POS.z
  const h = Math.hypot(dx, dz) || 0.001
  yaw = Math.atan2(dx, dz)
  pitch = Math.max(-0.95, Math.min(1.1, Math.atan2(dy, h)))
}
function seatLookAt() {
  const p = camera.position
  camera.lookAt(
    p.x + Math.sin(yaw) * Math.cos(pitch),
    p.y + Math.sin(pitch),
    p.z + Math.cos(yaw) * Math.cos(pitch)
  )
}
function buildChair() {
  chairG = new THREE.Group()
  chairG.position.set(0.05, 0, 0.95)
  chairG.rotation.y = Math.PI
  scene.add(chairG)
  const fab = M(0x1c1c22, 0.58, 0.22),
    cush = new THREE.MeshStandardMaterial({ color: 0x2e2e36, roughness: 0.85 }),
    rim = M(0x3a3a42, 0.45, 0.12)
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5
    cyl(chairG, 0.025, 0.2, fab, Math.sin(a) * 0.13, 0.1, Math.cos(a) * 0.13, 0.032).rotation.z =
      0.38
  }
  cyl(chairG, 0.026, 0.34, fab, 0, 0.35, 0)
  box(chairG, 0.46, 0.07, 0.44, cush, 0, 0.485, 0)
  box(chairG, 0.46, 0.56, 0.05, cush, 0, 0.79, -0.18)
  box(chairG, 0.06, 0.24, 0.06, rim, -0.28, 0.6, 0.02)
  box(chairG, 0.06, 0.24, 0.06, rim, 0.28, 0.6, 0.02)
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.72, 0.58),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  hit.position.set(0, 0.44, 0)
  hit.name = 'chairHit'
  chairG.add(hit)
}
function setSitting(on, skipSave = false) {
  if (on === sitting) return
  if (on && (zoom || pano || topView)) {
    zoom = null
    setPano(false)
    setTopView(false)
  }
  sitting = on
  returning = on ? 110 : 130
  if (on) {
    initSeatYawPitch()
    seatFov = SEAT_FOV
  }
  if (!on && panoAnchor === 'seat') setPano(false)
  if (!skipSave) {
    savePrefs()
    sfxClick()
  }
  syncViewUi()
}

/* 08b-doplnky-izby.js */
function buildRoomExtras() {
  const woodDark = M(0x5c4030, 0.72, 0.04)
  const woodMid = M(0x7a5538, 0.68, 0.03)
  const metal = M(0x2a2a30, 0.4, 0.55)
  const fabric = M(0x3d4f45, 0.9, 0.02)
  const leaf = M(0x2f7a48, 0.78, 0.02)
  const leaf2 = M(0x1f5c36, 0.82, 0.01)
  const ceramic = M(0xd9cfc2, 0.55, 0.05)
  const paper = M(0xe8e0d2, 0.88, 0.01)

  // koberec pod stolom
  const rugTex = ctex(256, 256, (c, w, h) => {
    c.fillStyle = '#6b4e3a'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#5a4030'
    for (let y = 8; y < h; y += 14) c.fillRect(0, y, w, 5)
    c.strokeStyle = '#8a6a52'
    c.lineWidth = 10
    c.strokeRect(8, 8, w - 16, h - 16)
  })
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.7),
    new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 })
  )
  rug.rotation.x = -Math.PI / 2
  rug.position.set(0.15, 0.004, 0.55)
  rug.receiveShadow = true
  scene.add(rug)

  // izbová rastlina pri okne
  const plant = new THREE.Group()
  plant.position.set(-2.15, 0, 1.55)
  scene.add(plant)
  cyl(plant, 0.11, 0.18, ceramic, 0, 0.09, 0, 0.13)
  cyl(plant, 0.09, 0.06, M(0x4a3424, 0.9), 0, 0.2, 0)
  const stem = cyl(plant, 0.012, 0.55, M(0x3a5a2a, 0.7), 0, 0.5, 0)
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2
    const fr = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), i % 2 ? leaf : leaf2)
    fr.scale.set(1.4, 0.55, 0.9)
    fr.position.set(Math.cos(ang) * 0.14, 0.72 + (i % 3) * 0.08, Math.sin(ang) * 0.14)
    fr.castShadow = true
    plant.add(fr)
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), leaf)
  top.position.set(0, 0.92, 0)
  top.scale.set(1.1, 0.7, 1.1)
  top.castShadow = true
  plant.add(top)
  stem.castShadow = true

  // menšia rastlina na parapete
  const sill = new THREE.Group()
  sill.position.set(-2.42, 0.72, 0.15)
  scene.add(sill)
  cyl(sill, 0.055, 0.08, M(0xb85c38, 0.55), 0, 0.04, 0, 0.06)
  for (let i = 0; i < 5; i++) {
    const blade = box(sill, 0.012, 0.22, 0.004, leaf2, (i - 2) * 0.02, 0.16, 0)
    blade.rotation.z = (i - 2) * 0.18
    blade.rotation.x = 0.15
  }

  // knižnica pri pravej stene
  const shelf = new THREE.Group()
  shelf.position.set(3.45, 0, 1.4)
  shelf.rotation.y = -Math.PI / 2
  scene.add(shelf)
  box(shelf, 0.9, 0.04, 0.32, woodDark, 0, 0.04, 0)
  box(shelf, 0.9, 0.04, 0.32, woodDark, 0, 0.72, 0)
  box(shelf, 0.9, 0.04, 0.32, woodDark, 0, 1.4, 0)
  box(shelf, 0.9, 0.04, 0.32, woodDark, 0, 2.05, 0)
  box(shelf, 0.04, 2.05, 0.32, woodDark, -0.43, 1.025, 0)
  box(shelf, 0.04, 2.05, 0.32, woodDark, 0.43, 1.025, 0)
  box(shelf, 0.9, 2.05, 0.03, woodMid, 0, 1.025, -0.15)
  const bookCols = [0x2c4a6e, 0x6b2e2e, 0x2e5a3a, 0x5a3d6b, 0xc4a35a, 0x1f1f24, 0x3a6f8a, 0x8a4a2a]
  for (let row = 0; row < 3; row++) {
    let x = -0.34
    for (let i = 0; i < 8; i++) {
      const w = 0.05 + (i % 3) * 0.012
      const h = 0.22 + (i % 4) * 0.03
      const d = 0.18 + (i % 2) * 0.04
      const b = box(shelf, w, h, d, M(bookCols[(row * 3 + i) % bookCols.length], 0.7), x + w / 2, 0.08 + row * 0.68 + h / 2, 0.02)
      b.rotation.z = ((i % 5) - 2) * 0.01
      x += w + 0.008
    }
  }
  // dekor na hornej polici
  cyl(shelf, 0.05, 0.12, ceramic, -0.22, 2.12, 0.02)
  box(shelf, 0.14, 0.02, 0.1, M(0x222228, 0.5), 0.2, 2.08, 0.02)
  box(shelf, 0.12, 0.08, 0.02, M(0xe8e4dc, 0.6), 0.2, 2.13, 0.06)

  // stojacia lampa v rohu
  const lamp = new THREE.Group()
  lamp.position.set(3.2, 0, 3.6)
  scene.add(lamp)
  cyl(lamp, 0.12, 0.03, metal, 0, 0.015, 0)
  cyl(lamp, 0.018, 1.55, metal, 0, 0.8, 0)
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 0.28, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf2e6c9, roughness: 0.85, side: THREE.DoubleSide })
  )
  shade.position.y = 1.7
  shade.castShadow = true
  lamp.add(shade)
  const bulb = new THREE.PointLight(0xffd9a8, 0.35, 4.5, 2)
  bulb.position.set(0, 1.55, 0)
  lamp.add(bulb)

  // bočný stolík + kniha + slúchadlá
  const side = new THREE.Group()
  side.position.set(1.55, 0, 1.35)
  scene.add(side)
  cyl(side, 0.22, 0.04, woodMid, 0, 0.48, 0)
  cyl(side, 0.03, 0.48, woodDark, 0, 0.24, 0)
  cyl(side, 0.16, 0.03, woodDark, 0, 0.02, 0)
  box(side, 0.14, 0.02, 0.1, M(0x3a5080, 0.65), 0.02, 0.51, 0.02)
  box(side, 0.12, 0.018, 0.09, M(0x804030, 0.65), -0.02, 0.53, -0.02)
  // slúchadlá
  const hp = new THREE.Group()
  hp.position.set(-0.08, 0.56, 0.05)
  hp.rotation.y = 0.4
  side.add(hp)
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.008, 8, 20, Math.PI),
    metal
  )
  band.rotation.z = Math.PI / 2
  band.position.y = 0.02
  hp.add(band)
  for (const sx of [-1, 1]) {
    const cup = cyl(hp, 0.035, 0.04, M(0x1a1a1e, 0.45, 0.2), sx * 0.07, -0.02, 0)
    cup.rotation.z = Math.PI / 2
  }

  // batoh pri stoličke
  const bag = new THREE.Group()
  bag.position.set(0.55, 0, 1.35)
  bag.rotation.y = -0.5
  scene.add(bag)
  box(bag, 0.28, 0.38, 0.16, fabric, 0, 0.22, 0)
  box(bag, 0.22, 0.12, 0.04, M(0x2a3830, 0.85), 0, 0.32, 0.1)
  box(bag, 0.04, 0.28, 0.02, metal, -0.1, 0.35, -0.02)
  box(bag, 0.04, 0.28, 0.02, metal, 0.1, 0.35, -0.02)

  // topánky
  const shoeMat = M(0x1c1c22, 0.55, 0.08)
  for (const [sx, syaw] of [
    [-0.35, 0.2],
    [-0.22, -0.15],
  ]) {
    const sh = box(scene, 0.1, 0.06, 0.26, shoeMat, sx, 0.03, 1.55)
    sh.rotation.y = syaw
  }

  // plagát na pravej stene
  const poster = ctex(256, 384, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#1a2a3a')
    g.addColorStop(1, '#3a6a5a')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#e8dcc8'
    c.font = 'bold 36px Georgia, serif'
    c.fillText('APERTURE', 28, 160)
    c.font = '22px Georgia, serif'
    c.fillText('& air', 90, 200)
    c.strokeStyle = '#c9a86a'
    c.lineWidth = 4
    c.strokeRect(16, 16, w - 32, h - 32)
  })
  const posterM = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.82),
    new THREE.MeshStandardMaterial({ map: poster, roughness: 0.7 })
  )
  posterM.position.set(3.76, 1.7, 2.6)
  posterM.rotation.y = -Math.PI / 2
  scene.add(posterM)
  box(scene, 0.02, 0.86, 0.59, woodDark, 3.77, 1.7, 2.6)

  // kalendár na zadnej stene
  const cal = ctex(256, 280, (c, w, h) => {
    c.fillStyle = '#f4f0e8'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#c45c3a'
    c.fillRect(0, 0, w, 48)
    c.fillStyle = '#fff'
    c.font = 'bold 28px sans-serif'
    c.fillText('NOV', 95, 34)
    c.fillStyle = '#333'
    c.font = 'bold 72px sans-serif'
    c.fillText('22', 85, 150)
    c.font = '18px sans-serif'
    c.fillText('nedeľa', 95, 190)
    c.strokeStyle = '#ddd'
    for (let i = 0; i < 5; i++) c.strokeRect(30 + (i % 5) * 40, 210, 32, 32)
  })
  const calM = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.32),
    new THREE.MeshStandardMaterial({ map: cal, roughness: 0.85 })
  )
  calM.position.set(2.35, 1.85, -0.58)
  scene.add(calM)

  // reproduktor / bluetooth box na stole-rohu
  const spk = new THREE.Group()
  spk.position.set(-1.15, DESK_TOP, -0.15)
  scene.add(spk)
  box(spk, 0.12, 0.16, 0.1, M(0x1a1a1c, 0.45, 0.15), 0, 0.08, 0)
  cyl(spk, 0.035, 0.01, M(0x333338, 0.4), 0, 0.1, 0.052).rotation.x = Math.PI / 2
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x44ffaa })
  )
  led.position.set(0.04, 0.14, 0.052)
  spk.add(led)

  // záclona pri okne (ľahká látka)
  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 2.05),
    new THREE.MeshStandardMaterial({
      color: 0xe8dcc8,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    })
  )
  curtain.position.set(-2.52, 1.55, 1.95)
  curtain.rotation.y = Math.PI / 2
  scene.add(curtain)
  box(scene, 0.02, 0.02, 0.6, metal, -2.52, 2.58, 1.95)

  // kartónová krabica / sklad pod poličkou
  const boxG = new THREE.Group()
  boxG.position.set(3.2, 0, 0.55)
  boxG.rotation.y = 0.2
  scene.add(boxG)
  box(boxG, 0.35, 0.28, 0.28, M(0xc4a574, 0.85), 0, 0.14, 0)
  box(boxG, 0.36, 0.02, 0.29, M(0xb89560, 0.8), 0, 0.29, 0)

  // stoh kníh na podlahe
  const stack = new THREE.Group()
  stack.position.set(2.7, 0, 2.1)
  stack.rotation.y = 0.35
  scene.add(stack)
  ;[0x2a4060, 0x704030, 0x406050].forEach((col, i) => {
    box(stack, 0.22, 0.035, 0.16, M(col, 0.7), 0, 0.02 + i * 0.038, 0)
  })
}

/* 09-kos-pod-stol-zahodenie-listkov-viko.js */
let trashG,
  trashHit,
  trashLidG,
  trashPedal,
  trashMessG,
  trashScraps = [],
  trashOpen = false,
  trashLidAng = 0,
  trashAutoT = 0,
  trashLidKick = 0
const TRASH_LID_OPEN = -1.38
const TRASH_LS = 'deskstudy-trash-v1'
const _trashEnd = new THREE.Vector3(),
  _trashMid = new THREE.Vector3(),
  _trashA = new THREE.Vector3(),
  _trashB = new THREE.Vector3()
function loadTrashMess() {
  try {
    const r = localStorage.getItem(TRASH_LS)
    trashScraps = r ? JSON.parse(r) : []
  } catch {
    trashScraps = []
  }
  if (!Array.isArray(trashScraps)) trashScraps = []
}
function saveTrashMess() {
  try {
    localStorage.setItem(TRASH_LS, JSON.stringify(trashScraps.slice(-42)))
  } catch {}
}
function spawnTrashScrap(data, idx) {
  if (!trashMessG) return null
  const g = new THREE.Group()
  const layer = Math.floor(idx / 6),
    ring = idx % 6
  const ang = ring * ((Math.PI * 2) / 6) + layer * 0.55 + (Math.random() - 0.5) * 0.35
  const r = 0.012 + ring * 0.009 + layer * 0.007
  g.position.set(
    Math.cos(ang) * r,
    0.03 + layer * 0.02 + Math.random() * 0.014,
    Math.sin(ang) * r - 0.008
  )
  g.rotation.set(
    -0.32 - Math.random() * 0.3,
    ang + (Math.random() - 0.5) * 0.7,
    (Math.random() - 0.5) * 1.25
  )
  const col = data?.c || '#e7dfc8'
  const label = (data?.t || 'lístok').split('|')[0].slice(0, 12)
  const t = ctex(112, 84, (c, w, h) => {
    c.fillStyle = col
    c.fillRect(0, 0, w, h)
    c.fillStyle = 'rgba(0,0,0,.1)'
    for (let i = 0; i < 22; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 2)
    c.strokeStyle = 'rgba(0,0,0,.08)'
    c.beginPath()
    c.moveTo(8, 12)
    c.lineTo(w - 8, h - 10)
    c.stroke()
    c.fillStyle = '#333'
    c.font = 'bold 11px sans-serif'
    c.fillText(label, 8, 22)
  })
  const sh = 0.05 + Math.random() * 0.016
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(sh, sh * 0.76),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, side: THREE.DoubleSide })
  )
  paper.position.y = 0.008
  paper.rotation.x = -0.18
  g.add(paper)
  const fold = new THREE.Mesh(
    new THREE.PlaneGeometry(sh * 0.62, sh * 0.44),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, side: THREE.DoubleSide })
  )
  fold.position.set(0.014, 0.016, 0.01)
  fold.rotation.set(0.55, -0.35, 0.5)
  g.add(fold)
  g.scale.setScalar(0.85)
  g.userData = { t: data?.t, c: col, idle: Math.random() * 10, pop: 1.1 }
  trashMessG.add(g)
  return g
}
function pushTrashMess(meta) {
  trashScraps.push({
    t: meta?.t || '?',
    c: meta?.c || NOTE_COLS[trashScraps.length % NOTE_COLS.length],
  })
  const n = spawnTrashScrap(trashScraps[trashScraps.length - 1], trashScraps.length - 1)
  saveTrashMess()
  trashLidKick = 1
  if (n) n.userData.pop = 1.2
  pulseTrashOpen(2.6)
}
function rebuildTrashMess() {
  if (!trashMessG) return
  while (trashMessG.children.length) trashMessG.remove(trashMessG.children[0])
  trashScraps.forEach((s, i) => spawnTrashScrap(s, i))
}
function trashMouthWorld(out) {
  _trashEnd.set(
    (Math.random() - 0.5) * 0.05,
    0.09 + Math.random() * 0.035,
    (Math.random() - 0.5) * 0.05
  )
  return trashG.localToWorld(out.copy(_trashEnd))
}
function updateTrashMess(dt, t) {
  if (!trashMessG) return
  trashMessG.children.forEach((g) => {
    const ph = g.userData.idle || 0
    if (trashOpen) g.rotation.y += Math.sin(t * 1.7 + ph) * dt * 0.12
    if (g.userData.pop > 0) {
      g.userData.pop -= dt * 2.8
      const s = 0.85 + g.userData.pop * 0.35
      g.scale.setScalar(s)
      if (g.userData.pop <= 0) g.scale.setScalar(0.85)
    }
  })
}
function setTrashOpen(on, quiet = false) {
  on = !!on
  if (on === trashOpen && !quiet && !trashAutoT) return
  trashOpen = on
  if ($('bTrash')) setSw('bTrash', on)
  if (quiet && trashLidG) {
    trashLidAng = on ? TRASH_LID_OPEN : 0
    trashLidG.rotation.x = trashLidAng
  }
  if (!quiet) {
    sfxClick()
    savePrefs()
  }
  if (!on) trashAutoT = 0
}
function toggleTrash() {
  if (zoom === 'trash') {
    zoom = null
    returning = 90
    syncHint()
    return
  }
  const opening = !trashOpen
  setTrashOpen(opening)
  if (opening && trashScraps.length && !sitting && !pano && !topView) {
    zoom = 'trash'
    returning = 0
    trashAutoT = 0
    syncHint()
  }
}
function pulseTrashOpen(sec = 2.2) {
  trashOpen = true
  if ($('bTrash')) setSw('bTrash', true)
  trashAutoT = sec
}
function updateTrashLid(dt) {
  const tgt = trashOpen ? TRASH_LID_OPEN : 0
  trashLidAng += (tgt - trashLidAng) * (1 - 0.02 ** dt)
  if (trashLidG) {
    let wob = 0
    if (trashLidKick > 0) {
      trashLidKick -= dt * 3.2
      wob = -Math.sin(trashLidKick * Math.PI) * 0.14
    }
    trashLidG.rotation.x = trashLidAng + wob
  }
  if (trashPedal) {
    const press = Math.min(1, Math.max(0, -trashLidAng / TRASH_LID_OPEN))
    trashPedal.position.y = 0.008 - press * 0.007
    trashPedal.rotation.x = press * 0.12
  }
  if (trashAutoT > 0) {
    trashAutoT -= dt
    if (trashAutoT <= 0) setTrashOpen(false, true)
  }
}
function buildTrashBin() {
  trashG = new THREE.Group()
  trashG.position.set(-1.18, 0.02, 0.46)
  scene.add(trashG)
  const body = M(0x2c2c30, 0.58, 0.12),
    rim = M(0x3a3a40, 0.45, 0.2),
    lidMat = M(0x323238, 0.48, 0.16)
  cyl(trashG, 0.105, 0.11, body, 0, 0.075, 0, 0.125)
  cyl(trashG, 0.118, 0.014, rim, 0, 0.152, 0, 0.13)
  const liner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.1, 0.16, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.95, side: THREE.DoubleSide })
  )
  liner.position.y = 0.07
  trashG.add(liner)
  trashLidG = new THREE.Group()
  trashLidG.position.set(0, 0.159, -0.048)
  trashG.add(trashLidG)
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.116, 0.116, 0.011, 28), lidMat)
  lid.position.set(0, 0, 0.048)
  lid.castShadow = true
  trashLidG.add(lid)
  box(trashLidG, 0.036, 0.028, 0.008, M(0x28282c, 0.55), 0, 0.014, 0.078)
  trashPedal = box(trashG, 0.05, 0.015, 0.07, M(0x1e1e22, 0.6), 0.04, 0.008, 0.1)
  trashPedal.castShadow = true
  trashHit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.14, 0.28, 20),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  trashHit.position.y = 0.14
  trashG.add(trashHit)
  trashMessG = new THREE.Group()
  trashMessG.position.set(0, 0.05, 0)
  trashG.add(trashMessG)
  loadTrashMess()
  rebuildTrashMess()
  trashLidG.rotation.x = trashOpen ? TRASH_LID_OPEN : 0
  trashLidAng = trashLidG.rotation.x
}
// pohľad ako pri čítaní za stolom
const PAPER_Z = V(-0.36, DESK_TOP + 0.42, 0.48),
  PAPER_T = V(-0.36, DESK_TOP + 0.01, 0.2)
function openPaperRead() {
  if (sitting) setSitting(false, true)
  if (topView) setTopView(false)
  if (pano) setPano(false)
  zoom = 'paper'
  returning = 0
  controls.enabled = false
  if (paperReadL) paperReadL.visible = true
  refreshPaper()
  syncHint()
  sfxClick()
}
function pickPaper(e) {
  if (!paperMesh) return null
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  ray.setFromCamera(ptr, camera)
  return ray.intersectObject(paperMesh, true)[0]
}
function openPaperDialog() {
  const d = loadPaperData()
  activePen = PENS[d.pen] ? d.pen : activePen
  $('paperText').value = d.text
  syncPenUi()
  $('paperDlg').classList.add('open')
  setTimeout(() => $('paperText').focus(), 40)
}
function closePaperDialog() {
  $('paperDlg').classList.remove('open')
}
function savePaper() {
  const t = $('paperText').value
  savePaperData(t, activePen)
  refreshPaper(t)
  closePaperDialog()
  if (zoom !== 'paper') openPaperRead()
  sfxClick()
}

/* 10-pocasie-za-oknom-dazd-sneh.js */
let snow,
  snowPack,
  snowOn = false,
  rain,
  rainPack
const WX_X0 = -5.2,
  WX_X1 = -2.85,
  WX_Y0 = 0.72,
  WX_Y1 = 2.45,
  WX_Z0 = -0.15,
  WX_Z1 = 1.65
function randWxSlot(i, pos) {
  pos[i * 3] = WX_X0 + Math.random() * (WX_X1 - WX_X0)
  pos[i * 3 + 1] = WX_Y0 + Math.random() * (WX_Y1 - WX_Y0)
  pos[i * 3 + 2] = WX_Z0 + Math.random() * (WX_Z1 - WX_Z0)
}
function buildSnow() {
  const N = 900,
    pos = new Float32Array(N * 3),
    vel = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    randWxSlot(i, pos)
    vel[i * 3] = (Math.random() - 0.5) * 0.01
    vel[i * 3 + 1] = -0.02 - Math.random() * 0.035
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.006
  }
  snowPack = { pos, vel, N }
  snow = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({
      size: 0.045,
      map: softDot(),
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      sizeAttenuation: true,
      color: 0xffffff,
    })
  )
  snow.visible = false
  scene.add(snow)
}
function buildRain() {
  const N = 1400,
    pos = new Float32Array(N * 3),
    vel = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    randWxSlot(i, pos)
    vel[i * 3] = (Math.random() - 0.5) * 0.008
    vel[i * 3 + 1] = -0.12 - Math.random() * 0.25
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01
  }
  rainPack = { pos, vel, N }
  rain = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({
      size: 0.028,
      map: softDot(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
      color: 0xa8c4e8,
    })
  )
  rain.visible = false
  scene.add(rain)
}
function weatherDoor() {
  return S.open * (0.25 + 0.75 * Math.cos(S.blade * 1.4))
}
function updateWindowWeather(dt) {
  const door = weatherDoor()
  if (snow) snow.visible = false
  if (rain) {
    rain.visible = door > 0.15 && S.i === 5
    rain.material.opacity = 0.35 + 0.5 * door
    if (rain.visible) {
      const p = rain.geometry.attributes.position.array,
        v = rainPack.vel
      for (let i = 0; i < rainPack.N; i++) {
        p[i * 3] += v[i * 3] * dt * 60
        p[i * 3 + 1] += v[i * 3 + 1] * dt * 60
        p[i * 3 + 2] += v[i * 3 + 2] * dt * 60
        if (p[i * 3 + 1] < WX_Y0 || p[i * 3] > -WX_X0) {
          randWxSlot(i, p)
          p[i * 3 + 1] = WX_Y1 + Math.random() * 0.5
        }
      }
      rain.geometry.attributes.position.needsUpdate = true
    }
  }
}

const REPO = 'https://github.com/peterdinis511/Spst-Kni%C5%BEnica'
const BROWSER_TABS = [
  { label: 'JOJ play', url: 'https://www.joj.sk/', ext: true },
  { label: '(334) YouTube', url: 'https://www.youtube.com/', ext: true },
  { label: 'GitHub · Spst-Knižnica', mode: 'github', url: REPO },
  { label: 'Desk study — aperture and air', mode: 'study' },
  { label: '+ New Tab', url: 'https://threejs.org/examples/', ext: true },
]
let activeTab = 2,
  nestedPlane,
  extPlane,
  sbCanvas,
  sbTex

function extTabTex(title, url) {
  return ctex(1024, 614, (c, w, h) => {
    c.fillStyle = '#10141c'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#1c2530'
    c.fillRect(0, 0, w, 56)
    txt(c, title, 48, 36, '#e8f0f8', 'bold 22px sans-serif')
    txt(c, url, 48, 120, '#6ec9c4', '16px ui-monospace,Menlo,monospace')
    txt(c, 'Odkaz sa otvorí v novom okne prehliadača.', 48, 168, '#8b9aab', '15px sans-serif')
    txt(
      c,
      'Klikni ešte raz na obsah alebo na záložku vľavo.',
      48,
      198,
      '#6b7a88',
      '14px sans-serif'
    )
    c.strokeStyle = '#2dd4bf'
    c.lineWidth = 2
    c.strokeRect(48, 250, 420, 84)
    txt(c, 'Otvoriť →', 68, 302, '#2dd4bf', 'bold 18px sans-serif')
  })
}

function paintSidebar(ai = activeTab) {
  if (!sbCanvas) return
  const c = sbCanvas.getContext('2d'),
    w = 256,
    h = 640
  c.fillStyle = '#1a1714'
  c.fillRect(0, 0, w, h)
  ;['#e85a24', '#d4a84a', '#7a9e6e'].forEach((k, i) => {
    c.fillStyle = k
    c.beginPath()
    c.arc(20 + i * 22, 22, 6, 0, 7)
    c.fill()
  })
  c.fillStyle = '#2a2622'
  c.fillRect(12, 50, w - 24, 26)
  BROWSER_TABS.forEach((tab, i) => {
    const y = 100 + i * 34
    if (i === ai) {
      c.fillStyle = 'rgba(232,90,36,.28)'
      c.fillRect(10, y - 18, w - 20, 28)
      c.strokeStyle = '#e85a24'
      c.lineWidth = 1
      c.strokeRect(10, y - 18, w - 20, 28)
    }
    txt(
      c,
      tab.label.slice(0, 26),
      18,
      y,
      i === ai ? '#f5f0e8' : '#b8aea3',
      i === ai ? 'bold 13px Georgia,serif' : '13px Georgia,serif'
    )
  })
  sbTex.needsUpdate = true
}

/* 11-buildscreens-aoc-nested-scene-dell-github.js */
let ceilMesh
let ceilHit
let clockH
let clockM
let clockS
let skyM
let tabHL
let lampG
let switchBox
let ceilL
let deskL
let deskFill
let bulbM
let deskBulb
let bigScreen
let hudPlane
let dellG
let ghBig
let sbPlane
let sashL
let sashR
let noteBoard
let noteGroup
let windowHit
let aocBlank
let dellBlank
let dellScreen
let laptopG
let laptopLid
let laptopScr
let extG
const PWR = { aoc: true, dell: true, mac: true }
let macLidAng = -0.35
function refreshAocContent() {
  if (!PWR.aoc) return
  if (!ghBig || !hudPlane || !nestedPlane) return
  const tab = BROWSER_TABS[activeTab]
  ghBig.visible = tab.mode === 'github'
  hudPlane.visible = tab.mode === 'study'
  nestedPlane.visible = tab.mode === 'study'
  if (extPlane) extPlane.visible = !!tab.ext
}
function applyDevicePower(skipSave = false) {
  if (aocBlank) aocBlank.visible = !PWR.aoc
  if (PWR.aoc) refreshAocContent()
  else {
    ;[sbPlane, nestedPlane, hudPlane, extPlane, tabHL, ghBig].forEach((m) => {
      if (m) m.visible = false
    })
  }
  if (dellBlank) dellBlank.visible = !PWR.dell
  if (dellScreen) dellScreen.visible = PWR.dell
  if (!PWR.aoc && zoom === 'screen') {
    zoom = null
    returning = 90
  }
  if (!PWR.dell && zoom === 'dell') {
    zoom = null
    returning = 90
  }
  setSw('bPwrAoc', PWR.aoc)
  setSw('bPwrDell', PWR.dell)
  setSw('bPwrMac', PWR.mac)
  if (!skipSave) savePrefs()
}
function togglePwr(which) {
  PWR[which] = !PWR[which]
  applyDevicePower()
  sfxClick()
}
function applyMacLid(dt) {
  const tgt = PWR.mac ? -0.35 : -0.04
  macLidAng += (tgt - macLidAng) * (1 - 0.02 ** dt)
  if (laptopLid) laptopLid.rotation.x = macLidAng
  if (laptopScr) laptopScr.visible = PWR.mac && macLidAng < -0.18
  if (cursor)
    cursor.visible = PWR.mac && laptopScr?.visible && Math.floor(performance.now() / 500) % 2 === 0
}
function buildScreens(rtTex, hudTex) {
  const black = M(0x0c0c0e, 0.38, 0.15)
  const plastic = M(0x141416, 0.48, 0.08)
  const aocAccent = M(0x2aa59a, 0.35, 0.2)
  const silver = M(0xa8abb0, 0.32, 0.72)

  // ——— AOC centre (riser) ———
  const g = new THREE.Group()
  g.position.set(0, 0.95, -0.35)
  scene.add(g)
  // stand: oval base + tapered neck + hinge
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 0.014, 28), plastic)
  base.position.y = 0.007
  base.castShadow = base.receiveShadow = true
  g.add(base)
  const footRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.004, 8, 28),
    M(0x1a1a1c, 0.5, 0.2)
  )
  footRing.rotation.x = Math.PI / 2
  footRing.position.y = 0.002
  g.add(footRing)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.28, 12), plastic)
  neck.position.set(0, 0.16, -0.025)
  neck.castShadow = true
  g.add(neck)
  const hinge = box(g, 0.08, 0.028, 0.036, plastic, 0, 0.3, -0.01)
  hinge.rotation.x = 0.15
  // panel chassis
  const panelY = 0.43
  box(g, 0.66, 0.4, 0.018, black, 0, panelY, -0.004)
  box(g, 0.64, 0.02, 0.02, plastic, 0, panelY - 0.195, 0) // chin
  box(g, 0.08, 0.005, 0.004, aocAccent, 0, panelY - 0.195, 0.011)
  // thin bezels (frame around glass)
  box(g, 0.655, 0.008, 0.01, black, 0, panelY + 0.188, 0.006)
  box(g, 0.008, 0.372, 0.01, black, -0.324, panelY, 0.006)
  box(g, 0.008, 0.372, 0.01, black, 0.324, panelY, 0.006)
  // back vent / ports plate
  box(g, 0.22, 0.08, 0.006, M(0x1c1c20, 0.55), 0, panelY - 0.05, -0.014)
  for (const dx of [-0.04, 0, 0.04])
    box(g, 0.012, 0.008, 0.004, M(0x2a2a30, 0.4, 0.3), dx, panelY - 0.05, -0.017)

  sbCanvas = document.createElement('canvas')
  sbCanvas.width = 256
  sbCanvas.height = 640
  sbTex = new THREE.CanvasTexture(sbCanvas)
  sbTex.colorSpace = THREE.SRGBColorSpace
  paintSidebar(activeTab)
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.35), screenMat(sbTex))
  sb.position.set(-0.22, panelY, 0.008)
  g.add(sb)
  sbPlane = sb
  tabHL = new THREE.Mesh(
    new THREE.PlaneGeometry(0.129, 0.0153),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      toneMapped: false,
    })
  )
  tabHL.position.set(-0.22, panelY, 0.0085)
  g.add(tabHL)
  const ns = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.35),
    new THREE.ShaderMaterial({
      uniforms: { t: { value: rtTex } },
      vertexShader:
        'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:
        'uniform sampler2D t;varying vec2 v;void main(){vec3 c=texture2D(t,v).rgb;c=c/(1.+c*.25);gl_FragColor=vec4(pow(c,vec3(.4545)),1.);}',
    })
  )
  ns.position.set(0.07, panelY, 0.008)
  g.add(ns)
  nestedPlane = ns
  hudPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.35),
    new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, toneMapped: false })
  )
  hudPlane.position.set(0.07, panelY, 0.0085)
  g.add(hudPlane)
  extG = new THREE.Group()
  extG.position.set(0.07, panelY, 0.009)
  g.add(extG)
  extPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.35),
    screenMat(extTabTex('JOJ play', 'https://www.joj.sk/'))
  )
  extPlane.visible = false
  extG.add(extPlane)
  aocBlank = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.385),
    new THREE.MeshBasicMaterial({ color: 0x040404, toneMapped: false })
  )
  aocBlank.position.set(0, panelY, 0.0095)
  aocBlank.visible = false
  g.add(aocBlank)
  // subtle glass sheen
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.63, 0.375),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.08,
      transparent: true,
      opacity: 0.06,
    })
  )
  glass.position.set(0, panelY, 0.01)
  g.add(glass)
  bigScreen = g

  // ——— Dell left ———
  const d = new THREE.Group()
  d.position.set(-1.05, 0.765, -0.15)
  d.rotation.y = 0.4
  scene.add(d)
  // silver stand
  const dBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, 0.18), silver)
  dBase.position.set(0, 0.006, 0.01)
  dBase.castShadow = dBase.receiveShadow = true
  d.add(dBase)
  box(d, 0.05, 0.01, 0.14, M(0x7a7d82, 0.35, 0.65), 0, 0.008, -0.02)
  const dNeck = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.028), silver)
  dNeck.position.set(0, 0.14, -0.04)
  dNeck.castShadow = true
  d.add(dNeck)
  box(d, 0.07, 0.03, 0.04, silver, 0, 0.27, -0.015)
  // panel tilted
  const panel = new THREE.Group()
  panel.position.set(0, 0.34, 0)
  panel.rotation.x = -0.1
  d.add(panel)
  box(panel, 0.54, 0.34, 0.016, black, 0, 0, -0.002)
  box(panel, 0.54, 0.018, 0.018, plastic, 0, -0.162, 0.002)
  box(panel, 0.05, 0.004, 0.003, silver, 0, -0.162, 0.012)
  // side bezels
  box(panel, 0.008, 0.3, 0.008, black, -0.266, 0.01, 0.006)
  box(panel, 0.008, 0.3, 0.008, black, 0.266, 0.01, 0.006)
  box(panel, 0.52, 0.008, 0.008, black, 0, 0.162, 0.006)
  const gh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.51, 0.305),
    screenMat(
      ctex(1024, 614, (c, w, h) => {
        c.fillStyle = '#0d1117'
        c.fillRect(0, 0, w, h)
        c.fillStyle = '#161b22'
        c.fillRect(0, 0, w, 60)
        txt(c, 'peterdinis511 / Spst-Knižnica   Public', 60, 38, '#e6edf3', 'bold 20px sans-serif')
        ;[
          'Code',
          'Issues',
          'Pull requests',
          'Actions',
          'Projects',
          'Wiki',
          'Security',
          'Insights',
          'Settings',
        ].forEach((s, i) =>
          txt(c, s, 40 + i * 100, 86, i ? '#8b949e' : '#e6edf3', '15px sans-serif')
        )
        const f = [
          ['.github/workflows', 'feat: Optimalize app'],
          ['load', 'feat: Updating seo'],
          ['node_modules', 'feat: More tests'],
          ['scripts', 'feat: storybook in start-script'],
          ['src', 'feat: Optimalize app'],
          ['web', 'fix: Fixing issues'],
          ['.env.example', 'feat: Updating app for pentest'],
          ['.gitignore', 'feat: storybook in start-script'],
          ['README.md', 'feat: EmailService'],
          ['docker-compose.yml', 'More rabbitmq and kafka in backend'],
          ['start.sh', 'feat: Entry'],
          ['stop.sh', 'feat: Entry'],
        ]
        f.forEach((r, i) => {
          const y = 130 + i * 30
          c.fillStyle = '#21262d'
          c.fillRect(30, y + 8, 680, 1)
          txt(c, r[0], 60, y, '#e6edf3', '15px sans-serif')
          txt(c, r[1], 300, y, '#8b949e', '14px sans-serif')
        })
        c.fillStyle = '#161b22'
        c.fillRect(740, 110, 260, 200)
        txt(c, 'About', 755, 140, '#e6edf3', 'bold 16px sans-serif')
        txt(c, 'No description, website,', 755, 170, '#8b949e', '13px sans-serif')
        txt(c, 'or topics provided.', 755, 190, '#8b949e', '13px sans-serif')
        txt(c, 'SPST Knižnica', 60, 520, '#e6edf3', 'bold 30px sans-serif')
        txt(
          c,
          'Školský knižničný katalóg Strednej priemyselnej školy technickej v Bardejove',
          60,
          555,
          '#8b949e',
          '15px sans-serif'
        )
      })
    )
  )
  gh.position.set(0, 0.01, 0.009)
  panel.add(gh)
  dellScreen = gh
  dellG = d
  dellBlank = new THREE.Mesh(
    new THREE.PlaneGeometry(0.51, 0.305),
    new THREE.MeshBasicMaterial({ color: 0x040404, toneMapped: false })
  )
  dellBlank.position.set(0, 0.01, 0.0095)
  dellBlank.visible = false
  panel.add(dellBlank)
  const dGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.505, 0.3),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.1,
      transparent: true,
      opacity: 0.05,
    })
  )
  dGlass.position.set(0, 0.01, 0.01)
  panel.add(dGlass)

  ghBig = new THREE.Group()
  ghBig.position.set(0.07, 0.43, 0.0095)
  bigScreen.add(ghBig)
  ghBig.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x0d1117, toneMapped: false })
    )
  )
  const gpg = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.264), gh.material)
  gpg.position.set(0, 0.043, 0.0005)
  ghBig.add(gpg)
  setTab(2, false)
  applyDevicePower(true)
}

/* 12-buildlaptop-vs-code-screen.js */
let cursor
function buildLaptop() {
  const L = new THREE.Group()
  L.position.set(0, 0.765, 0.45)
  scene.add(L)
  laptopG = L
  const al = M(0x9a9da3, 0.28, 0.82)
  const alDark = M(0x6e7176, 0.35, 0.7)
  const blackIn = M(0x1a1a1e, 0.55, 0.1)

  // wedge base (thicker at back)
  const baseGeo = new THREE.BoxGeometry(0.38, 0.014, 0.26)
  const base = new THREE.Mesh(baseGeo, al)
  base.position.set(0, 0.007, 0)
  base.castShadow = base.receiveShadow = true
  L.add(base)
  // underside feet
  for (const [fx, fz] of [
    [-0.15, -0.1],
    [0.15, -0.1],
    [-0.15, 0.1],
    [0.15, 0.1],
  ])
    box(L, 0.02, 0.003, 0.02, M(0x2a2a2e, 0.7), fx, 0.0015, fz)
  // palm rest + speaker grills
  box(L, 0.36, 0.002, 0.08, alDark, 0, 0.0145, 0.07)
  for (const sx of [-0.15, 0.15]) {
    for (let i = 0; i < 8; i++)
      box(L, 0.002, 0.001, 0.012, M(0x333338, 0.5), sx + (i - 3.5) * 0.006, 0.015, 0.095)
  }
  // keyboard deck
  const kb = new THREE.Mesh(
    new THREE.PlaneGeometry(0.33, 0.115),
    new THREE.MeshBasicMaterial({
      map: ctex(640, 220, (c, w, h) => {
        c.fillStyle = '#121214'
        c.fillRect(0, 0, w, h)
        const rows = [
          { n: 14, y: 8, gap: 2 },
          { n: 14, y: 48, gap: 2 },
          { n: 13, y: 88, gap: 2 },
          { n: 12, y: 128, gap: 2 },
          { n: 10, y: 168, gap: 2 },
        ]
        rows.forEach((row, ri) => {
          const kw = (w - 16 - (row.n - 1) * row.gap) / row.n
          for (let k = 0; k < row.n; k++) {
            const x = 8 + k * (kw + row.gap)
            const kh = ri === 4 && k === 4 ? kw * 2.2 : 32
            const xx = ri === 4 && k > 4 ? x + kw * 1.2 : x
            if (ri === 4 && k === 5) continue
            c.fillStyle = '#2a2a30'
            c.fillRect(xx, row.y, kw, kh)
            c.fillStyle = 'rgba(140,180,255,.22)'
            c.fillRect(xx + 2, row.y + 2, kw - 4, 2)
          }
        })
      }),
      toneMapped: false,
    })
  )
  kb.rotation.x = -Math.PI / 2
  kb.position.set(0, 0.015, -0.02)
  L.add(kb)
  // glass trackpad
  const tp = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.0025, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x5a5d62, metalness: 0.55, roughness: 0.25 })
  )
  tp.position.set(0, 0.0155, 0.085)
  L.add(tp)
  // side ports (USB-C)
  for (const z of [-0.04, 0.02]) {
    box(L, 0.004, 0.005, 0.01, blackIn, -0.191, 0.008, z)
    box(L, 0.004, 0.005, 0.01, blackIn, 0.191, 0.008, z)
  }
  // hinge barrel
  const hingeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 12), alDark)
  hingeBar.rotation.z = Math.PI / 2
  hingeBar.position.set(0, 0.014, -0.128)
  L.add(hingeBar)

  const lid = new THREE.Group()
  lid.position.set(0, 0.014, -0.128)
  lid.rotation.x = -0.35
  L.add(lid)
  laptopLid = lid
  // lid shell + thin edge
  box(lid, 0.38, 0.25, 0.007, al, 0, 0.125, -0.002)
  box(lid, 0.372, 0.242, 0.002, blackIn, 0, 0.125, 0.0025)
  // camera notch
  box(lid, 0.012, 0.006, 0.002, M(0x111114, 0.4), 0, 0.24, 0.004)
  cyl(lid, 0.0022, 0.001, M(0x222228, 0.3), 0, 0.24, 0.005).rotation.x = Math.PI / 2

  const sc = new THREE.Mesh(
    new THREE.PlaneGeometry(0.355, 0.225),
    screenMat(
      ctex(1024, 660, (c, w, h) => {
        c.fillStyle = '#181818'
        c.fillRect(0, 0, w, h)
        c.fillStyle = '#252526'
        c.fillRect(0, 0, w, 28)
        ;[
          'Slabé miesta analýza',
          'Application load tes…',
          'auth-nav-cluster.stories.tsx',
          'stop-all.sh',
          'admin/books/status-actions',
        ].forEach((s, i) =>
          txt(c, s, 10 + i * 190, 19, i === 3 ? '#fff' : '#999', '12px sans-serif')
        )
        c.fillStyle = '#1e1e1e'
        c.fillRect(0, 28, 300, h - 28)
        txt(c, 'Zistil som problém s load-test', 10, 70, '#ddd', '13px sans-serif')
        for (let i = 0; i < 5; i++) {
          c.fillStyle = '#2d2d30'
          c.fillRect(10, 110 + i * 50, 270, 40)
          txt(c, `./scripts/load-test.sh  ${i + 1}`, 18, 135 + i * 50, '#9cdcfe', '12px monospace')
        }
        const code = [
          '#!/bin/bash',
          'set -eo pipefail',
          'ROOT="$(cd "$(dirname "$0")/.." && pwd)"',
          'echo "==> Stopping SPST processes..."',
          'if [[ -d "$ROOT/.pids" ]]; then',
          '  for pidfile in "$ROOT"/.pids/*.pid; do',
          '    kill "$pid" 2>/dev/null || true',
          '  done',
          'fi',
          'for port in 3000 3001 3002 8080; do',
          '  lsof -ti:$port | xargs kill -9',
          'done',
        ]
        code.forEach((s, i) =>
          txt(
            c,
            s,
            320,
            60 + i * 20,
            ['#6a9955', '#c586c0', '#ce9178', '#9cdcfe'][i % 4],
            '13px monospace'
          )
        )
        c.fillStyle = '#1e1e1e'
        c.fillRect(840, 28, 184, h - 28)
        ;[
          '.github',
          '.pids',
          'load',
          'node_modules',
          'scripts',
          'src',
          'web',
          '.env',
          'docker-compose.yml',
          'start.sh',
          'stop.sh',
        ].forEach((s, i) => txt(c, s, 852, 60 + i * 20, '#ccc', '12px sans-serif'))
        c.fillStyle = '#0c0c0c'
        c.fillRect(300, 380, 540, h - 380)
        ;[
          '$ git push',
          'Enumerating objects: 21, done.',
          'Writing objects: 100% (12/12)',
          'To github.com:peterdinis511/spst-kniznica.git',
          '   main -> main',
        ].forEach((s, i) => txt(c, s, 312, 404 + i * 20, '#4ec9b0', '12px monospace'))
      })
    )
  )
  sc.position.set(0, 0.125, 0.0048)
  lid.add(sc)
  laptopScr = sc
  // screen glass
  const lg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.355, 0.225),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.08,
      transparent: true,
      opacity: 0.05,
    })
  )
  lg.position.set(0, 0.125, 0.0055)
  lid.add(lg)
  cursor = box(lid, 0.006, 0.012, 0.001, M(0xffffff, 1), 0.0, 0.06, 0.0055)
  cursor.material = new THREE.MeshBasicMaterial({ color: 0xffffff })
}

/* 13-buildmugs-owl-mug-white-cup-steam-pen-mouse.js */
let steam
let steam2
function buildMugs() {
  const owl = ctex(512, 256, (c, w, h) => {
    c.fillStyle = '#f4f1ea'
    c.fillRect(0, 0, w, h)
    ;[128, 384].forEach((x) => {
      c.fillStyle = '#6b4a2f'
      c.fillRect(x - 100, 200, 200, 8)
      c.fillStyle = '#4aa86a'
      c.beginPath()
      c.ellipse(x + 60, 190, 50, 10, 0.3, 0, 7)
      c.fill()
      c.fillStyle = '#3a8fc4'
      c.beginPath()
      c.ellipse(x, 130, 48, 62, 0, 0, 7)
      c.fill()
      c.fillStyle = '#2ab3a8'
      c.beginPath()
      c.ellipse(x, 150, 32, 38, 0, 0, 7)
      c.fill()
      c.fillStyle = '#fff'
      ;[-20, 20].forEach((o) => {
        c.beginPath()
        c.arc(x + o, 105, 18, 0, 7)
        c.fill()
      })
      c.fillStyle = '#111'
      ;[-20, 20].forEach((o) => {
        c.beginPath()
        c.arc(x + o, 105, 8, 0, 7)
        c.fill()
      })
      c.fillStyle = '#f2a33a'
      c.beginPath()
      c.moveTo(x - 6, 118)
      c.lineTo(x + 6, 118)
      c.lineTo(x, 132)
      c.fill()
    })
  })
  vessel(-0.6, -0.33, 0.9475, 0.05, 0.054, 0.11, owl, 0xb5651d) // čaj
  box(scene, 0.03, 0.004, 0.03, M(0x7a5a2a, 0.9), -0.585, 1.043, -0.33).rotation.y = 0.4 // čajové vrecúško
  box(scene, 0.026, 0.026, 0.002, M(0xf3e9c8, 0.9), -0.543, 1.032, -0.33) // štítok
  layCable(
    [
      [-0.585, 1.043, -0.33],
      [-0.565, 1.048, -0.33],
      [-0.543, 1.046, -0.33],
    ],
    cableMats.white,
    scene,
    0.0007
  )
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 10, 24, Math.PI), M(0x6b4a2f, 0.4))
  h.position.set(-0.548, 1.005, -0.33)
  h.rotation.z = -Math.PI / 2
  h.scale.set(1, 1.1, 1)
  h.castShadow = true
  scene.add(h)
  // white cup with black strokes
  const cupT = ctex(256, 128, (c, w, h) => {
    c.fillStyle = '#f6f6f4'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = '#111'
    for (let i = 0; i < 14; i++) {
      c.lineWidth = 2 + Math.random() * 7
      c.beginPath()
      const x = i * 19 + Math.random() * 8
      c.moveTo(x, 5)
      c.bezierCurveTo(x + 14, 40, x - 14, 80, x + 4, 125)
      c.stroke()
    }
  })
  vessel(0.65, -0.33, 0.9595, 0.04, 0.064, 0.075, cupT)
  const h2 = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 8, 20, Math.PI), M(0xf6f6f4, 0.3))
  h2.position.set(0.695, 0.9595 + 0.038, -0.33)
  h2.rotation.z = -Math.PI / 2
  h2.castShadow = true
  scene.add(h2)
  const sp = box(scene, 0.004, 0.003, 0.11, M(0xd0d0d0, 0.15, 0.9), 0.68, 0.99, -0.33)
  sp.rotation.set(0, 0.4, 0.5)
  cyl(scene, 0.05, 0.012, M(0xfafafa, 0.25), 0.65, 0.9535, -0.33, 0.082)
  const n = 24,
    gp = new Float32Array(n * 3)
  steam = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(gp, 3)),
    new THREE.PointsMaterial({
      size: 0.05,
      map: softDot(),
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      color: 0xffffff,
    })
  )
  steam.position.set(0.65, 1.05, -0.33)
  scene.add(steam)
  steam2 = new THREE.Points(steam.geometry, steam.material)
  steam2.position.set(-0.6, 1.08, -0.33)
  scene.add(steam2)
  // pen
  const pen = cyl(scene, 0.006, 0.15, M(0xc01818, 0.4), -0.52, DESK_TOP + 0.082, 0.14)
  pen.rotation.z = Math.PI / 2
  pen.rotation.y = 0.35
  box(scene, 0.04, 0.002, 0.004, M(0xcccccc, 0.2, 0.9), -0.48, 0.784, 0.13).rotation.y = 0.35
  // Magic Mouse – hladké telo + spodok
  const mouse = new THREE.Group()
  mouse.position.set(1.1, DESK_TOP + 0.012, 0.38)
  scene.add(mouse)
  const mBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 28, 16),
    new THREE.MeshStandardMaterial({ color: 0xf4f4f6, roughness: 0.22, metalness: 0.05 })
  )
  mBody.scale.set(0.72, 0.26, 1.45)
  mBody.castShadow = mBody.receiveShadow = true
  mouse.add(mBody)
  const mBottom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.03, 0.004, 20),
    M(0xe8e8ea, 0.45)
  )
  mBottom.position.y = -0.006
  mouse.add(mBottom)
  // jemná deliaca linka (L/R)
  box(mouse, 0.0015, 0.001, 0.06, M(0xd0d0d4, 0.4), 0, 0.01, 0)
}
function vessel(x, z, y0, ro, rt, h, tex, liq = 0x3b2314) {
  const V2 = (a) => a.map((p) => new THREE.Vector2(p[0], p[1]))
  const o = V2([
      [0, 0],
      [ro * 0.8, 0],
      [ro * 0.93, h * 0.04],
      [ro, h * 0.2],
      [ro, h * 0.55],
      [rt, h],
    ]),
    i = V2([
      [rt - 0.004, h],
      [ro - 0.004, h * 0.55],
      [ro - 0.004, h * 0.2],
      [ro * 0.8, h * 0.1],
      [0, h * 0.1],
    ])
  const g = new THREE.Group()
  g.position.set(x, y0, z)
  scene.add(g)
  const mo = new THREE.Mesh(
    new THREE.LatheGeometry(o, 48),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22, side: THREE.DoubleSide })
  )
  const mi = new THREE.Mesh(
    new THREE.LatheGeometry(i, 48),
    new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.3, side: THREE.DoubleSide })
  )
  mo.castShadow = mo.receiveShadow = mi.receiveShadow = true
  g.add(mo, mi)
  const cof = new THREE.Mesh(new THREE.CircleGeometry(ro * 0.98, 32), M(liq, 0.1))
  cof.rotation.x = -Math.PI / 2
  cof.position.y = h * 0.85
  g.add(cof)
  return g
}
function softDot() {
  return ctex(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, '#fff')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 64, 64)
  })
}

/* ───────── Vietor do miestnosti (otvorené okno) ───────── */
let roomWind,
  roomWindPack,
  paperBaseZ = 0.06,
  roomWindGust = 0
function spawnRoomWindParticle(i, p, v, near = false) {
  const z = -0.25 + Math.random() * 1.9
  p[i * 3] = near ? -2.45 - Math.random() * 0.12 : -2.35 + Math.random() * 3.2
  p[i * 3 + 1] = 0.85 + Math.random() * 1.45
  p[i * 3 + 2] = z
  const speed = 0.55 + Math.random() * 0.85
  v[i * 3] = speed * (0.55 + 0.45 * Math.random())
  v[i * 3 + 1] = (Math.random() - 0.45) * 0.12
  v[i * 3 + 2] = (Math.random() - 0.5) * 0.22 + (z > 0.7 ? 0.04 : -0.02)
}
function buildRoomWind() {
  const N = 420,
    pos = new Float32Array(N * 3),
    vel = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) spawnRoomWindParticle(i, pos, vel, true)
  roomWindPack = { pos, vel, N }
  roomWind = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({
      size: 0.028,
      map: softDot(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
      color: 0xfff6e8,
      blending: THREE.AdditiveBlending,
    })
  )
  roomWind.frustumCulled = false
  roomWind.renderOrder = 2
  scene.add(roomWind)
  if (paperMesh) paperBaseZ = paperMesh.rotation.z
}
function updateRoomWind(dt, t) {
  if (!roomWind || !roomWindPack) return
  // vietor len pri otvorenom okne (prepínač / S.openT)
  const open = Math.max(0, Math.min(1, S.open))
  const wantWind = S.openT > 0.5 && open > 0.12
  if (!wantWind) {
    roomWindGust = 0
    roomWind.visible = false
    roomWind.material.opacity = 0
    roomWind.geometry.setDrawRange(0, 0)
    if (paperMesh && zoom !== 'paper') {
      paperMesh.rotation.z = paperBaseZ
      paperMesh.position.y = 0.011
    }
    if (steam) {
      steam.position.x = 0.65
      if (steam2) steam2.position.x = -0.6
    }
    return
  }
  const gustTarget =
    open * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.7) + 0.25 * Math.sin(t * 1.9 + 1.2)))
  roomWindGust += (gustTarget - roomWindGust) * (1 - 0.02 ** dt)
  const strength = roomWindGust
  // vzdušné guľky vypnuté — ostáva len pohyb papiera / pary
  roomWind.visible = false
  roomWind.material.opacity = 0
  roomWind.geometry.setDrawRange(0, 0)
  if (strength < 0.05) return
  if (paperMesh && zoom !== 'paper') {
    paperMesh.rotation.z =
      paperBaseZ + Math.sin(t * 6.2) * strength * 0.035 + Math.sin(t * 11) * 0.008 * strength
    paperMesh.position.y = 0.011 + strength * 0.004 * Math.abs(Math.sin(t * 5.5))
  }
  if (steam) {
    const drift = strength * 0.055
    steam.position.x = 0.65 + drift * (0.6 + Math.sin(t * 1.4) * 0.4)
    if (steam2) steam2.position.x = -0.6 + drift * (0.5 + Math.sin(t * 1.1 + 0.8) * 0.35)
  }
  if (noteGroup && open > 0.2) {
    noteGroup.children.forEach((n, i) => {
      if (noteIsTossing?.(n) || n === dragNote) return
      n.rotation.z += (Math.sin(t * 3.1 + i) * 0.002 * open - n.rotation.z * 0.08) * 0.2
    })
  }
}

/* 14-buildwalldecor-cork-board-medals.js */
const medals = []
function buildWallDecor() {
  const cork = ctex(512, 320, (c, w, h) => {
    c.fillStyle = '#b8895a'
    c.fillRect(0, 0, w, h)
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(${90 + Math.random() * 60},60,30,.25)`
      c.fillRect(Math.random() * w, Math.random() * h, 2, 2)
    }
    const cols = ['#e7dfc8', '#c9d8e6', '#f1e3a6', '#d9c3d9', '#cfe1c6']
    for (let i = 0; i < 0; i++) {
      c.save()
      c.translate(40 + i * 52, 50 + (i % 3) * 85)
      c.rotate((Math.random() - 0.5) * 0.3)
      c.fillStyle = cols[i % 5]
      c.fillRect(0, 0, 70, 60)
      c.fillStyle = '#444'
      for (let j = 0; j < 4; j++) c.fillRect(8, 10 + j * 10, 50, 2)
      c.fillStyle = '#c33'
      c.beginPath()
      c.arc(35, 4, 4, 0, 7)
      c.fill()
      c.restore()
    }
    c.fillStyle = '#223'
    c.fillRect(380, 10, 110, 36)
    txt(c, 'SPORT', 398, 35, '#ddd', 'bold 22px sans-serif')
  })
  box(scene, 0.82, 0.52, 0.03, M(0x4a2f1c, 0.7), -0.35, 1.98, -0.58)
  const b = new THREE.Mesh(
    new THREE.PlaneGeometry(0.74, 0.44),
    new THREE.MeshStandardMaterial({ map: cork, roughness: 1 })
  )
  b.position.set(-0.35, 1.98, -0.56)
  scene.add(b)
  noteBoard = b
  noteGroup = new THREE.Group()
  scene.add(noteGroup)
  loadBoardLinks()
  LINKS.forEach((L, i) => spawnNote(L, i))
  // medals on a hook
  const hook = new THREE.Group()
  hook.position.set(1.55, 2.15, -0.57)
  scene.add(hook)
  cyl(hook, 0.012, 0.03, M(0x333333, 0.4, 0.7), 0, 0, 0).rotation.x = Math.PI / 2
  ;[
    [0xd4af37, 0, 0.55, 0xcc2233],
    [0xcd7f32, 0.07, 0.45, 0xffffff],
    [0x3a3a3a, -0.06, 0.5, 0x2a4ba0],
    [0xc0c0c0, 0.13, 0.4, 0xb6ff2a],
    [0x8a6a30, -0.12, 0.42, 0xb6ff2a],
  ].forEach(([col, dx, len, rib], i) => {
    const g = new THREE.Group()
    g.position.set(dx * 0.6, 0, i * 0.002)
    hook.add(g)
    box(g, 0.03, len, 0.004, M(rib, 0.7), 0, -len / 2, 0)
    cyl(g, 0.045, 0.008, M(col, 0.3, 0.9), 0, -len - 0.04, 0).rotation.x = Math.PI / 2
    medals.push(g)
    g.userData.medalPhase = i * 1.7
    g.userData.medalLen = len
  })
}
function updateMedalsWind(t) {
  const open = Math.max(0, Math.min(1, S.open))
  const want = S.openT > 0.5 && open > 0.15
  // vietor od okna (ľavá stena) → silnejšie kývanie do strán
  const gust =
    want
      ? open *
        (0.55 +
          0.45 * (0.5 + 0.5 * Math.sin(t * 0.85) + 0.3 * Math.sin(t * 2.1 + 0.4)))
      : 0.08
  const ampZ = want ? 0.055 + gust * 0.22 : 0.025
  const ampX = want ? 0.02 + gust * 0.08 : 0.008
  const speed = want ? 2.4 + gust * 2.8 : 1.3
  medals.forEach((m, i) => {
    const ph = m.userData.medalPhase ?? i
    const lenF = (m.userData.medalLen || 0.45) / 0.5
    // prevládajúci smer od okna (+X) + nárazy
    const blow = want ? 0.04 * open * gust : 0
    m.rotation.z =
      blow +
      Math.sin(t * speed + ph) * ampZ * lenF +
      Math.sin(t * speed * 1.7 + ph * 1.3) * ampZ * 0.35
    m.rotation.x =
      Math.sin(t * (speed * 0.7) + ph * 0.8) * ampX * lenF +
      (want ? Math.sin(t * 3.2 + ph) * 0.02 * gust : 0)
  })
}

/* 15-buildtechcorner-router-power-strip-chargers-cabl.js */
const leds = []
function buildTechCorner() {
  const blk = M(0x111113, 0.5)
  box(scene, 0.22, 0.04, 0.14, blk, 1.6, 0.785, -0.35)
  for (const x of [-0.08, 0.08]) {
    const a = box(scene, 0.012, 0.24, 0.012, blk, 1.6 + x, 0.92, -0.4)
    a.rotation.z = x > 0 ? -0.1 : 0.1
  }
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(
      new THREE.SphereGeometry(0.004, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x2288ff })
    )
    l.position.set(1.54 + i * 0.025, 0.79, -0.28)
    scene.add(l)
    leds.push(l)
  }
  box(scene, 0.34, 0.035, 0.07, M(0xeeeeee, 0.5), 1.7, 0.04, -0.2)
  for (const x of [1.6, 1.72]) box(scene, 0.06, 0.05, 0.05, M(0xf8f8f8, 0.4), x, 0.095, -0.2)
}

/* 16-kable-kotvy-na-portoch-rady-po-stole-a-riseri.js */
function buildCables() {
  const root = new THREE.Group()
  scene.add(root)
  const deskZ = -0.41
  const stripY = 0.078

  // MacBook porty (svet: stred [0, DESK_TOP, 0.45], šírka ±0.19)
  // halfW mierne von, aby zástrčky nepretínali šasi
  const MB = { x: 0, z: 0.45, halfW: 0.205, y: DESK_TOP + 0.01 }
  const mbLeft = (dz) => [-MB.halfW, MB.y, MB.z + dz]
  const mbRight = (dz) => [MB.halfW, MB.y, MB.z + dz]
  // prístup pozdĺž boku (bez CatmullRom pretnutia cez klávesnicu)
  const approachLeft = (dz) => [
    [-0.34, DESK_TOP + 0.004, MB.z + dz - 0.06],
    [-0.28, DESK_TOP + 0.006, MB.z + dz - 0.02],
    [-0.24, DESK_TOP + 0.008, MB.z + dz],
    mbLeft(dz),
  ]

  // USB-C video: AOC → riser → po stole → ĽAVÝ bok MacBooku
  const usb = layCable(
    [
      [0.1, RISER_TOP - 0.008, -0.36],
      [0.16, RISER_TOP - 0.004, -0.35],
      [0.26, RISER_TOP - 0.018, -0.34],
      [0.34, DESK_TOP + 0.004, -0.35],
      onDesk(0.2, -0.18),
      onDesk(-0.05, 0.0),
      onDesk(-0.22, 0.2),
      ...approachLeft(-0.05),
    ],
    cableMats.braid,
    root,
    0.0032,
    { sag: 0.7, tension: 0.2, protectEnds: 3 }
  )
  usbPlug(root, usb.end0, false, null, usb.tan0)
  {
    const g = usbPlug(root, usb.end1, true, null, null)
    orientAlong(g, new THREE.Vector3(MB.x, MB.y, MB.z - 0.05), usb.end1)
  }
  ferrite(root, usb.curve.getPoint(0.22), null, usb.curve.getTangent(0.22))
  cableClip(root, -0.05, 0.0, 0.15)
  cableTie(root, usb.curve.getPoint(0.5), usb.curve.getTangent(0.5))

  // Kábel myši: z PRAVÉHO boku laptopu cez podložku
  layCable(
    [
      mbRight(0.04),
      [0.26, DESK_TOP + 0.006, 0.48],
      [0.32, DESK_TOP + 0.005, 0.4],
      onDesk(0.5, 0.28),
      onDesk(0.78, 0.22),
      onDesk(1.0, 0.32),
      [1.1, DESK_TOP + 0.011, 0.38],
    ],
    cableMats.black,
    root,
    0.0022,
    { sag: 0.6, tension: 0.2, protectEnds: 2 }
  )
  cableClip(root, 0.78, 0.22, -0.2)

  // Napájanie AOC: IEC zo stripu → zadný okraj → DC do risera
  cableCoil(root, 1.58, 0.05, -0.28, 2.2, 0.04, 0.0032, cableMats.pvc)
  const aocPwr = layCable(
    [
      [1.66, stripY, -0.36],
      [1.52, 0.1, -0.42],
      [1.2, 0.12, -0.44],
      onDesk(0.9, deskZ - 0.01),
      onDesk(0.55, deskZ),
      onDesk(0.22, deskZ + 0.01),
      onDesk(0.08, deskZ + 0.03),
      [0.05, DESK_TOP + 0.14, -0.36],
      [0.055, RISER_TOP - 0.05, -0.35],
      [0.06, RISER_TOP - 0.02, -0.338],
    ],
    cableMats.pvc,
    root,
    0.004,
    { sag: 1.05 }
  )
  iecPlug(root, aocPwr.end0, aocPwr.tan0)
  dcJack(root, aocPwr.end1, null, aocPwr.tan1)
  ferrite(root, aocPwr.curve.getPoint(0.78), null, aocPwr.curve.getTangent(0.78))
  cableClip(root, 0.55, deskZ, 0.05)
  cableTie(root, aocPwr.curve.getPoint(0.4), aocPwr.curve.getTangent(0.4))

  // HDMI / DP: Dell → zadný okraj → AOC
  const hdmi = layCable(
    [
      [-1.05, 0.9, -0.2],
      [-1.02, 0.86, -0.26],
      [-0.92, DESK_TOP + 0.006, -0.34],
      onDesk(-0.62, deskZ + 0.05),
      onDesk(-0.28, deskZ + 0.02),
      onDesk(0.0, deskZ),
      [0.04, RISER_TOP - 0.04, -0.348],
      [0.08, RISER_TOP - 0.018, -0.34],
    ],
    cableMats.black,
    root,
    0.003,
    { sag: 1 }
  )
  hdmiPlug(root, hdmi.end0, hdmi.tan0)
  hdmiPlug(root, hdmi.end1, hdmi.tan1)
  ferrite(root, hdmi.curve.getPoint(0.35), null, hdmi.curve.getTangent(0.35))
  cableClip(root, -0.4, deskZ + 0.03, -0.08)

  // Napájanie Dell
  const dellPwr = layCable(
    [
      [1.7, stripY, -0.3],
      [1.58, DESK_TOP + 0.004, -0.36],
      onDesk(1.15, deskZ),
      onDesk(0.35, deskZ - 0.01),
      onDesk(-0.35, deskZ + 0.02),
      onDesk(-0.85, -0.26),
      [-0.98, 0.78, -0.2],
      [-1.02, 0.86, -0.18],
    ],
    cableMats.pvc,
    root,
    0.0034,
    { sag: 1.15 }
  )
  iecPlug(root, dellPwr.end0, dellPwr.tan0)
  dcJack(root, dellPwr.end1, null, dellPwr.tan1)
  ferrite(root, dellPwr.curve.getPoint(0.7), null, dellPwr.curve.getTangent(0.7))

  // MagSafe: strip → zadok stola → ĽAVÝ bok MacBooku (predný port)
  const magsafe = layCable(
    [
      [1.72, stripY, -0.26],
      [1.64, DESK_TOP + 0.004, -0.3],
      onDesk(1.15, -0.28),
      onDesk(0.4, -0.2),
      onDesk(-0.1, 0.05),
      onDesk(-0.25, 0.25),
      ...approachLeft(0.06),
    ],
    cableMats.braid,
    root,
    0.003,
    { sag: 0.65, tension: 0.2, protectEnds: 3 }
  )
  iecPlug(root, magsafe.end0, magsafe.tan0)
  {
    const g = magsafePlug(root, magsafe.end1, null)
    orientAlong(g, new THREE.Vector3(MB.x, MB.y, MB.z + 0.06), magsafe.end1)
  }
  cableClip(root, 0.4, -0.2, 0.25)
  cableTie(root, magsafe.curve.getPoint(0.4), magsafe.curve.getTangent(0.4))

  // Ethernet: router → zadný okraj → ĽAVÝ bok (zadnejší port)
  const eth = layCable(
    [
      [1.55, 0.8, -0.28],
      [1.5, DESK_TOP + 0.006, -0.34],
      onDesk(1.0, deskZ + 0.04),
      onDesk(0.3, deskZ + 0.04),
      onDesk(-0.15, -0.1),
      onDesk(-0.28, 0.15),
      ...approachLeft(-0.09),
    ],
    cableMats.teal,
    root,
    0.0028,
    { sag: 0.6, tension: 0.2, protectEnds: 3 }
  )
  rj45Plug(root, eth.end0, eth.tan0)
  {
    const g = rj45Plug(root, eth.end1, null)
    orientAlong(g, new THREE.Vector3(MB.x, MB.y, MB.z - 0.09), eth.end1)
  }
  cableClip(root, 0.3, deskZ + 0.04, 0.12)

  // Lampový kábel: lampa → zadok stola → strip
  layCable(
    [
      [1.35, DESK_TOP + 0.02, -0.15],
      onDesk(1.45, -0.22),
      onDesk(1.55, -0.32),
      [1.62, 0.2, -0.34],
      [1.68, stripY + 0.02, -0.28],
    ],
    cableMats.black,
    root,
    0.0024,
    { sag: 0.9 }
  )
  cableClip(root, 1.45, -0.22, -0.3)

  // Audio jack: ĽAVÝ bok MacBooku → reproduktor
  const jack = layCable(
    [
      mbLeft(0.01),
      [-0.25, DESK_TOP + 0.007, 0.42],
      [-0.32, DESK_TOP + 0.005, 0.3],
      onDesk(-0.55, 0.1),
      onDesk(-0.95, -0.08),
      [-1.15, DESK_TOP + 0.09, -0.15],
    ],
    cableMats.black,
    root,
    0.002,
    { sag: 0.7, tension: 0.2, protectEnds: 2 }
  )
  const jackG = new THREE.Group()
  orientByTangent(jackG, jack.end1, jack.tan1, true)
  const jackTip = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.0022, 0.018, 10), chromePlug())
  jackTip.rotation.z = Math.PI / 2
  const jackBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0028, 0.01, 10), cableMats.black)
  jackBoot.rotation.z = Math.PI / 2
  jackBoot.position.x = 0.012
  jackG.add(jackTip, jackBoot)
  root.add(jackG)

  // zväzok za stolom (káblová viazačka + krátky zväzok)
  cableTie(root, new THREE.Vector3(0.9, DESK_TOP + 0.01, deskZ), new THREE.Vector3(1, 0, 0))
  cableTie(root, new THREE.Vector3(0.2, DESK_TOP + 0.01, deskZ), new THREE.Vector3(1, 0, 0))
}

/* 17-buildclock-nastenne-hodiny-ukazuju-skutocny-cas.js */
let lastSec = -1
function buildClock() {
  const g = new THREE.Group()
  g.position.set(0.85, 1.95, -0.58)
  scene.add(g)
  cyl(g, 0.165, 0.03, M(0x2a1a10, 0.5), 0, 0, 0).rotation.x = Math.PI / 2
  const dial = ctex(256, 256, (c, w, h) => {
    c.fillStyle = '#f6f0e2'
    c.fillRect(0, 0, w, h)
    c.translate(128, 128)
    c.strokeStyle = '#2a1a10'
    c.fillStyle = '#2a1a10'
    for (let i = 0; i < 60; i++) {
      c.rotate(Math.PI / 30)
      c.lineWidth = i % 5 ? 1 : 3
      c.beginPath()
      c.moveTo(0, -118)
      c.lineTo(0, i % 5 ? -110 : -100)
      c.stroke()
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.font = 'bold 26px Georgia,serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * Math.PI * 2
      c.fillText(n, 128 + Math.sin(a) * 80, 128 - Math.cos(a) * 80)
    }
  })
  const f = new THREE.Mesh(
    new THREE.CircleGeometry(0.148, 48),
    new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6 })
  )
  f.position.z = 0.016
  g.add(f)
  const hand = (w, l, col, z) => {
    const p = new THREE.Group()
    p.position.z = z
    g.add(p)
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, l, 0.003),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 })
    )
    b.position.y = l / 2 - 0.01
    p.add(b)
    return p
  }
  clockH = hand(0.012, 0.075, 0x2a1a10, 0.019)
  clockM = hand(0.008, 0.11, 0x2a1a10, 0.021)
  clockS = hand(0.003, 0.125, 0xcc2222, 0.023)
}
function updateClock() {
  const n = (Date.now() / 1000) | 0
  if (n === lastSec) return
  lastSec = n
  const d = new Date(),
    sec = d.getSeconds(),
    min = d.getMinutes() + sec / 60,
    hr = (d.getHours() % 12) + min / 60,
    T = Math.PI * 2
  clockS.rotation.z = (-sec / 60) * T
  clockM.rotation.z = (-min / 60) * T
  clockH.rotation.z = (-hr / 12) * T
  sfxTick(sec % 2 === 0)
}

/* 18-buildlights-ceiling-pendant-desk-lamp-light-dark.js */
function buildLights() {
  cyl(scene, 0.01, 0.55, M(0x222222), 0.6, 2.73, 1.6)
  cyl(scene, 0.28, 0.18, M(0xf0e6d2, 0.5), 0.6, 2.45, 1.6, 0.08).castShadow = false
  bulbM = new THREE.MeshStandardMaterial({
    color: 0xfff2d6,
    emissive: 0xffe2a8,
    emissiveIntensity: 2,
  })
  const bl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), bulbM)
  bl.position.set(0.6, 2.38, 1.6)
  scene.add(bl)
  ceilL = new THREE.PointLight(0xffe2b8, 5, 10)
  ceilL.position.set(0.6, 2.35, 1.6)
  scene.add(ceilL)
  ceilHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  ceilHit.position.set(0.6, 2.5, 1.6)
  scene.add(ceilHit)
  lampG = new THREE.Group()
  lampG.position.set(1.38, 0.765, 0)
  scene.add(lampG)
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.75, 0.25),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  hit.position.set(-0.13, 0.37, 0)
  lampG.add(hit)
  const lm = M(0x1a1a1a, 0.4, 0.6)
  cyl(lampG, 0.06, 0.015, lm, 0, 0.0075, 0)
  box(lampG, 0.012, 0.35, 0.012, lm, 0, 0.175, 0)
  box(lampG, 0.012, 0.334, 0.012, lm, -0.13, 0.455, 0).rotation.z = 0.89
  cyl(lampG, 0.07, 0.09, M(0xd8d2c4, 0.4, 0.3), -0.26, 0.56, 0, 0.025)
  deskBulb = new THREE.MeshStandardMaterial({
    color: 0xfff0d0,
    emissive: 0xffb85a,
    emissiveIntensity: 0,
    roughness: 0.35,
  })
  const db = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 16), deskBulb)
  db.position.set(-0.26, 0.52, 0)
  lampG.add(db)
  deskFill = new THREE.PointLight(0xffd080, 0, 6, 1.8)
  deskFill.position.copy(db.position)
  lampG.add(deskFill)
  deskL = new THREE.SpotLight(0xffe8b0, 0, 7.5, 1.05, 0.52, 1.6)
  deskL.position.set(1.14, 1.28, 0)
  deskL.target.position.set(0.92, 0.76, 0.22)
  deskL.castShadow = true
  deskL.shadow.mapSize.set(1024, 1024)
  deskL.shadow.bias = -0.0002
  scene.add(deskL, deskL.target)
}

/* 19-nested-scene-aperture-and-air.js */
const rt = new THREE.WebGLRenderTarget(1024, 576)
const ns = new THREE.Scene()
ns.background = new THREE.Color(0x000000)
ns.fog = new THREE.FogExp2(0xffb070, 0.03)
const nc = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 50)
nc.position.set(3.2, 2.4, 3.6)
nc.lookAt(0, 0.9, 0)
const nsun = new THREE.DirectionalLight(0xffffff, 3)
nsun.castShadow = true
nsun.shadow.mapSize.set(1024, 1024)
Object.assign(nsun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 })
nsun.target.position.set(0, 0.8, 0)
ns.add(nsun, nsun.target)
const namb = new THREE.HemisphereLight(0xffe2bf, 0x8a5a3c, 0.3)
ns.add(namb)
const nlamp = new THREE.PointLight(0xffc070, 0, 3)
nlamp.position.set(0.5, 1.1, -0.9)
ns.add(nlamp)
let slats = [],
  dust,
  dustV,
  nscreen,
  nsky
function buildNested() {
  const w = M(0xc27a3c, 0.9)
  box(ns, 5, 0.05, 5, M(0xb06f40, 0.5, 0.05), 0, -0.025, 0)
  box(ns, 5, 2.4, 0.05, w, 0, 1.2, -2.02)
  const X = -2.05 // left wall with window opening
  box(ns, 0.1, 0.5, 5, w, X, 0.25, 0)
  box(ns, 0.1, 0.3, 5, w, X, 2.25, 0)
  box(ns, 0.1, 1.6, 1.5, w, X, 1.3, -1.75)
  box(ns, 0.1, 1.6, 1.5, w, X, 1.3, 1.75)
  const fr = M(0x5a3318, 0.6)
  box(ns, 0.12, 1.6, 0.05, fr, X, 1.3, 0)
  box(ns, 0.12, 0.04, 2, fr, X, 0.5, 0)
  box(ns, 0.12, 0.04, 2, fr, X, 2.1, 0)
  for (let i = 0; i < 14; i++) {
    const s = box(ns, 0.1, 0.008, 1.95, M(0xe8d0a8, 0.5), X + 0.06, 0.55 + i * 0.115, 0)
    slats.push(s)
  } // venetian blinds
  nsky = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
  nsky.rotation.y = Math.PI / 2
  nsky.position.set(-6, 1.3, 0)
  ns.add(nsky)
  // desk (red-orange wood), legs, monitor, keyboard, mug, lamp, plant, chair, shelf
  box(
    ns,
    1.5,
    0.05,
    0.75,
    new THREE.MeshStandardMaterial({ map: wood('#b8532a', '#6a2a10'), roughness: 0.5 }),
    0.6,
    0.75,
    -1.0
  )
  for (const x of [-0.1, 1.3])
    for (const z of [-1.3, -0.7]) box(ns, 0.03, 0.73, 0.03, M(0x1a1a1a, 0.5, 0.5), x, 0.37, z)
  box(ns, 0.5, 0.32, 0.02, M(0x111111, 0.4), 0.7, 1.05, -1.3).rotation.y = 0.25
  nscreen = box(
    ns,
    0.46,
    0.28,
    0.01,
    new THREE.MeshBasicMaterial({
      map: ctex(128, 80, (c, w, h) => {
        c.fillStyle = '#e8f0ff'
        c.fillRect(0, 0, w, h)
        c.fillStyle = '#555'
        for (let i = 0; i < 8; i++) c.fillRect(8, 8 + i * 8, 50 + Math.random() * 60, 3)
      }),
    }),
    0.69,
    1.05,
    -1.28
  )
  nscreen.rotation.y = 0.25
  cyl(ns, 0.01, 0.28, M(0x111111), 0.7, 0.91, -1.3)
  box(ns, 0.5, 0.015, 0.17, M(0x111111, 0.6), 0.55, 0.78, -0.85)
  cyl(ns, 0.04, 0.08, M(0xf5f5f5, 0.3), 0.15, 0.82, -0.85)
  cyl(ns, 0.1, 0.04, M(0x222222, 0.4), 1.0, 0.8, -0.9)
  const arm = cyl(ns, 0.007, 0.3, M(0x222222), 1.0, 0.95, -0.9)
  arm.rotation.z = 0.4
  cyl(ns, 0.07, 0.12, M(0x2a2a2a, 0.6), -0.3, 0.83, -1.1)
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 5), M(0x111611, 0.4))
    l.position.set(-0.3, 1.05, -1.1)
    l.rotation.set((Math.random() - 0.5) * 0.8, i, (Math.random() - 0.5) * 0.9)
    l.translateY(0.12)
    l.castShadow = true
    ns.add(l)
  }
  box(ns, 0.5, 0.06, 0.5, M(0x7a1c14, 0.7), 0.3, 0.48, -0.25)
  box(ns, 0.5, 0.5, 0.06, M(0x7a1c14, 0.7), 0.3, 0.78, -0.5)
  cyl(ns, 0.025, 0.45, M(0x222222), 0.3, 0.22, -0.25)
  box(ns, 0.9, 0.05, 0.3, M(0xa05a30, 0.6), -1.2, 1.4, -1.85)
  // dust particles
  const N = 500,
    pos = new Float32Array(N * 3)
  dustV = new Float32Array(N * 3)
  for (let i = 0; i < N * 3; i += 3) {
    pos[i] = -2 + Math.random() * 4
    pos[i + 1] = 0.2 + Math.random() * 2
    pos[i + 2] = -2 + Math.random() * 4
    dustV[i] = (Math.random() - 0.3) * 0.01
    dustV[i + 1] = (Math.random() - 0.5) * 0.006
    dustV[i + 2] = (Math.random() - 0.5) * 0.01
  }
  dust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({
      size: 0.04,
      map: softDot(),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      color: 0xffe0b0,
    })
  )
  ns.add(dust)
}

/* 20-hud-canvas-drawn-overlaid-on-the-nested-view.js */
const hc = document.createElement('canvas')
hc.width = 1280
hc.height = 720
const hg = hc.getContext('2d')
const hudTex = new THREE.CanvasTexture(hc)
hudTex.colorSpace = THREE.SRGBColorSpace
const SL = [
  ['OPENING', 'open'],
  ['AIR DENSITY', 'air'],
  ['BLADE', 'blade'],
]
const slX = (i) => 80 + i * 230
function updateHUD() {
  const g = hg
  g.clearRect(0, 0, 1280, 720)
  const cream = '#f6e6c8',
    serif = 'Georgia,"Times New Roman",serif',
    mono = 'ui-monospace,Menlo,monospace'
  g.fillStyle = cream
  g.font = `bold 84px ${serif}`
  g.fillText('Aperture', 40, 120)
  g.fillText('and', 40, 200)
  g.fillText('air', 40, 280)
  g.font = `italic 20px ${serif}`
  g.fillStyle = 'rgba(246,230,200,.75)'
  g.fillText('One opening, men the beam and the cast.', 40, 330)
  g.textAlign = 'right'
  P.forEach((p, i) => {
    g.font = `italic 28px ${serif}`
    g.fillStyle = i === S.i ? '#fff' : 'rgba(246,230,200,.65)'
    g.fillText(p.n + (i === S.i ? ' •' : ''), 1240, 60 + i * 38)
  })
  const el = Math.round(Math.atan2(S.sp.y, Math.hypot(S.sp.x, S.sp.z)) * 57.3),
    tr = S.open * (0.25 + 0.75 * Math.cos(S.blade * 1.4)),
    ex = (S.si * tr).toFixed(2)
  g.font = `15px ${mono}`
  g.fillStyle = 'rgba(20,10,0,.45)'
  g.fillRect(1060, 380, 190, 120)
  g.fillStyle = cream
  ;[
    ['COUPLED', ''],
    ['Sun', `${el}°`],
    ['Exposure', ex],
    ['Sky / sun', (S.sky.r / (0.1 + S.sc.r)).toFixed(2)],
    ['Screen', (1.2 - tr * 0.5).toFixed(2)],
    ['Lamp', nlamp.intensity.toFixed(1)],
  ].forEach((r, i) => {
    g.textAlign = 'left'
    g.fillText(r[0], 1072, 402 + i * 19)
    g.textAlign = 'right'
    g.fillText(r[1], 1238, 402 + i * 19)
  })
  g.textAlign = 'left'
  g.font = `13px ${mono}`
  SL.forEach(([l, k], i) => {
    const x = slX(i)
    g.fillStyle = cream
    g.fillText(l, x, 672)
    g.fillStyle = 'rgba(246,230,200,.4)'
    g.fillRect(x, 684, 170, 2)
    g.fillStyle = '#fff'
    g.fillRect(x + S[k] * 170 - 3, 678, 6, 14)
  })
  g.fillStyle = cream
  g.fillText(S.drift ? 'DRIFT' : 'FREEZE', slX(3), 672)
  g.fillText(S.study ? 'STUDY' : 'AIR', slX(4), 672)
  g.strokeStyle = cream
  g.lineWidth = 2
  ;[
    [16, 16, 1, 1],
    [1264, 16, -1, 1],
    [16, 704, 1, -1],
    [1264, 704, -1, -1],
  ].forEach(([x, y, a, b]) => {
    g.beginPath()
    g.moveTo(x, y + 30 * b)
    g.lineTo(x, y)
    g.lineTo(x + 30 * a, y)
    g.stroke()
  })
  hudTex.needsUpdate = true
}

/* 21-settimeofday-smoothly-lerped-each-frame.js */
const TV = new THREE.Vector3(),
  TC = new THREE.Color(),
  TC2 = new THREE.Color()
function setTimeOfDay(i, q, skipSave, fromAuto = false) {
  const day = Math.min(P.length - 1, Math.max(0, i | 0))
  const ch = day !== S.i
  S.i = day
  document.querySelectorAll('#days button').forEach((b, j) => b.classList.toggle('on', j === day))
  if (ch && !fromAuto) {
    autoDay = false
    if ($('bAuto')) setSw('bAuto', false)
  }
  if (ch) drawWinSky(day)
  if (A.ctx) {
    applyMix()
    if (ch && !q) sfxChime()
  }
  syncClimateUi()
  if (!skipSave) savePrefs()
}
function applyTime(dt) {
  const p = P[S.i],
    k = 1 - 0.02 ** dt
  if (drag < 0) S.open += (S.openT - S.open) * k
  S.ceil += (S.ceilT - S.ceil) * k
  S.lamp += (S.lampT - S.lamp) * k
  S.sp.lerp(TV.set(...p.sp), k)
  S.sc.lerp(TC.set(p.sc), k)
  S.sky.lerp(TC2.set(p.sky), k)
  S.si += (p.si - S.si) * k
  S.amb += (p.amb - S.amb) * k
  S.flash *= 0.9
  if (S.i === 5 && Math.random() < 0.004) {
    S.flash = 1
    sfxThunder()
  }
  const tr = S.open * (0.25 + 0.75 * Math.cos(S.blade * 1.4))
  const lit = Math.min(1, S.ceil * 0.7 + S.lamp * 0.55)
  // outer
  sun.position.copy(sun.target.position).add(TV.set(S.sp.x, S.sp.y * 0.6, S.sp.z))
  sun.color.copy(S.sc)
  sun.intensity = S.si * 0.9 * (0.5 + 0.5 * S.open) + S.flash * 3
  amb.intensity = S.amb * 1.4 + 0.1 + S.flash * 0.8 + lit * 0.28
  renderer.toneMappingExposure = 1.12 + lit * 0.2
  const sk = skyM || (skyM = scene.getObjectByName('sky'))
  if (sk.material.map) {
    sk.material.color.set(1, 1, 1).multiplyScalar(1 + S.flash * 0.5)
    if (S.i === 5) sk.material.color.multiplyScalar(0.88)
  } else {
    sk.material.color.copy(S.sky).multiplyScalar(1 + S.flash)
    if (S.i === 5) sk.material.color.multiplyScalar(0.72)
    if (S.i === 6) sk.material.color.lerp(new THREE.Color(0x0a1535), 0.35)
  }
  lampGlow.intensity = (1 - Math.min(1, S.si / 3)) * 0.8
  // nested
  nsun.position.copy(nsun.target.position).add(S.sp)
  nsun.color.copy(S.sc)
  nsun.intensity = S.si * (0.5 + 0.5 * S.open) + S.flash * 3
  namb.intensity = S.amb * 1.8 + 0.15
  nsky.material.color.copy(S.sky)
  ns.fog.color.copy(S.sky).multiplyScalar(0.9)
  ns.fog.density = 0.01 + S.air * 0.03
  nlamp.intensity = Math.max(0, 1.2 - S.si * 0.35 * tr * 2)
  slats.forEach((s) => (s.rotation.z = S.blade * 1.3))
  sashL.rotation.y = S.open * 1.4
  sashR.rotation.y = -S.open * 1.4
  // strop a lampa sú nezávislé
  ceilL.intensity = S.ceil * 7
  deskL.intensity = S.lamp * 6.5
  deskFill.intensity = S.lamp * 4.2
  bulbM.emissiveIntensity = S.ceil * 2.2
  deskBulb.emissiveIntensity = S.lamp * 12
  scene.background = new THREE.Color(0x252019).multiplyScalar(0.72 + lit * 0.28)
  hudDirty = true
  if (A.ctx && Math.abs(S.open - (A._lastOpen ?? -1)) > 0.01) {
    A._lastOpen = S.open
    applyMix()
  }
}

/* 22-zvuky-vsetko-generovane-v-kode-web-audio.js */
const A = { ctx: null, on: true }
const MIX = [
  [0.15, 0, 0.85, 0],
  [0.1, 0, 1, 0],
  [0.12, 0, 0.55, 0],
  [0.2, 0, 0.4, 0],
  [0.15, 0, 0.2, 0.45],
  [0.45, 1, 0.05, 0],
  [0.08, 0, 0.15, 0.2],
] // vietor, dážď, (nepoužité), cvrčky
function audioInit() {
  if (A.ctx || !A.on) return
  const c = (A.ctx = new (window.AudioContext || window.webkitAudioContext)())
  A.master = c.createGain()
  A.master.gain.value = 0.6
  A.master.connect(c.destination)
  A.og = c.createGain()
  A.og.gain.value = 0.28 + 0.72 * S.open
  A.og.connect(A.master)
  A.lp = c.createBiquadFilter()
  A.lp.type = 'lowpass'
  A.lp.frequency.value = 420 + S.open * 6200
  A.lp.connect(A.og)
  const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
    d = nb.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  A.nb = nb
  const layer = (type, f, q, dest) => {
    const s = c.createBufferSource()
    s.buffer = nb
    s.loop = true
    const fl = c.createBiquadFilter()
    fl.type = type
    fl.frequency.value = f
    fl.Q.value = q
    const g = c.createGain()
    g.gain.value = 0
    s.connect(fl)
    fl.connect(g)
    g.connect(dest || A.lp)
    s.start()
    return g
  }
  A.wind = layer('lowpass', 500, 0.5)
  A.rain = layer('bandpass', 2800, 0.5)
  const sr = c.sampleRate,
    pink = c.createBuffer(1, sr * 4, sr),
    pd = pink.getChannelData(0)
  let b0 = 0,
    b1 = 0,
    b2 = 0
  for (let i = 0; i < pd.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    pd[i] = (b0 + b1 + b2) * 0.12
  }
  const rs = c.createBufferSource()
  rs.buffer = pink
  rs.loop = true
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 750
  bp.Q.value = 0.55
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 90
  A.rainRoar = c.createGain()
  A.rainRoar.gain.value = 0
  rs.connect(bp)
  bp.connect(hp)
  hp.connect(A.rainRoar)
  A.rainRoar.connect(A.og)
  rs.start()
  const lfo = c.createOscillator(),
    lg = c.createGain()
  lfo.frequency.value = 0.15
  lg.gain.value = 0.04
  lfo.connect(lg)
  lg.connect(A.wind.gain)
  lfo.start()
  const co = c.createOscillator(),
    cm = c.createGain(),
    cl = c.createOscillator(),
    clg = c.createGain()
  A.cr = c.createGain()
  A.cr.gain.value = 0
  cm.gain.value = 0
  co.frequency.value = 4300
  cl.type = 'square'
  cl.frequency.value = 18
  clg.gain.value = 0.5
  cl.connect(clg)
  clg.connect(cm.gain)
  co.connect(cm)
  cm.connect(A.cr)
  A.cr.connect(A.lp)
  co.start()
  cl.start()
  applyMix()
}
function windowIsOpen() {
  return S.openT > 0.5 && S.open > 0.25
}
function outdoorDoor() {
  // vonkajší zvuk len keď je okno naozaj otvorené
  return windowIsOpen() ? Math.max(0, Math.min(1, S.open)) : 0
}
function applyMix() {
  if (!A.ctx) return
  const m = MIX[S.i],
    t = A.ctx.currentTime
  const door = outdoorDoor()
  const openWin = windowIsOpen()
  // vietor do miestnosti: pri zatvorenom okne ticho
  const windIn = m[0] * door * door * (0.42 + 0.28 * door)
  A.wind.gain.setTargetAtTime(windIn, t, 0.2)
  A.og.gain.setTargetAtTime(openWin ? 0.35 + 0.65 * door : 0.02, t, 0.15)
  A.lp.frequency.setTargetAtTime(420 + door * 6200, t, 0.15)
  const rain = m[1] * door * (S.i === 5 ? 1.15 : 1)
  A.rain.gain.setTargetAtTime(rain * 0.22, t, 0.4)
  A.rainRoar.gain.setTargetAtTime(rain * 0.42, t, 0.6)
  // cvrčky – len cez otvorené okno
  A.cr.gain.setTargetAtTime(openWin ? m[3] * 0.028 * door : 0, t, 0.35)
}
function rainDrip() {
  if (!A.ctx || !A.on || S.i !== 5 || S.open < 0.2) return
  const c = A.ctx,
    t = c.currentTime,
    o = c.createOscillator(),
    g = c.createGain(),
    f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 1800 + Math.random() * 2500
  f.Q.value = 8
  o.type = 'sine'
  o.frequency.setValueAtTime(900 + Math.random() * 600, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.025, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
  o.connect(f)
  f.connect(g)
  g.connect(A.og)
  o.start(t)
  o.stop(t + 0.08)
}
setInterval(() => {
  if (A.ctx && A.on && S.i === 5 && Math.random() < 0.55) rainDrip()
}, 120)
function burst(type, f, dur, vol, dest) {
  const c = A.ctx,
    t = c.currentTime,
    s = c.createBufferSource(),
    fl = c.createBiquadFilter(),
    g = c.createGain()
  s.buffer = A.nb
  fl.type = type
  fl.frequency.value = f
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  s.connect(fl)
  fl.connect(g)
  g.connect(dest || A.master)
  s.start(t, Math.random())
  s.stop(t + dur)
}
function sfxWindow(open) {
  if (!A.ctx || !A.on) return
  const c = A.ctx,
    t = c.currentTime,
    o = c.createOscillator(),
    g = c.createGain(),
    f = c.createBiquadFilter()
  o.type = 'sawtooth'
  f.type = 'bandpass'
  f.frequency.value = 700
  f.Q.value = 6
  o.frequency.setValueAtTime(open ? 150 : 230, t)
  o.frequency.linearRampToValueAtTime(open ? 240 : 140, t + 0.7)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.06, t + 0.1)
  g.gain.linearRampToValueAtTime(0, t + 0.75)
  o.connect(f)
  f.connect(g)
  g.connect(A.master)
  o.start(t)
  o.stop(t + 0.8)
  if (open) burst('highpass', 2500, 0.04, 0.3)
  else
    setTimeout(() => {
      if (A.ctx) {
        burst('lowpass', 200, 0.18, 0.5)
        burst('highpass', 2500, 0.04, 0.3)
      }
    }, 700)
}
function sfxChime() {
  if (!A.ctx || !A.on) return
  const c = A.ctx,
    t = c.currentTime
  ;(S.i >= 4 ? [392, 330, 262] : [523, 659, 784]).forEach((f, i) => {
    const o = c.createOscillator(),
      g = c.createGain(),
      s = t + i * 0.16
    o.frequency.value = f
    g.gain.setValueAtTime(0, s)
    g.gain.linearRampToValueAtTime(0.08, s + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, s + 1.2)
    o.connect(g)
    g.connect(A.master)
    o.start(s)
    o.stop(s + 1.3)
  })
}
function sfxClick() {
  if (!A.ctx || !A.on) return
  burst('bandpass', 1800, 0.05, 0.5)
  setTimeout(() => {
    if (A.ctx) burst('lowpass', 150, 0.1, 0.6)
  }, 40)
}
function sfxTick(tock = false) {
  if (!A.ctx || !A.on) return
  const c = A.ctx,
    t = c.currentTime,
    o = c.createOscillator(),
    g = c.createGain(),
    f = c.createBiquadFilter()
  o.type = 'triangle'
  f.type = 'bandpass'
  f.frequency.value = tock ? 980 : 1280
  f.Q.value = 14
  o.frequency.setValueAtTime(tock ? 620 : 780, t)
  o.frequency.exponentialRampToValueAtTime(tock ? 280 : 360, t + 0.045)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(tock ? 0.028 : 0.034, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.07)
  o.connect(f)
  f.connect(g)
  g.connect(A.master)
  o.start(t)
  o.stop(t + 0.09)
  // krátky mechanický „cvak“
  burst('highpass', tock ? 2400 : 3200, 0.025, 0.12)
}
function sfxThunder() {
  if (!A.ctx || !A.on) return
  setTimeout(
    () => {
      if (A.ctx) burst('lowpass', 140, 2.2, 1.2, A.og)
    },
    400 + Math.random() * 600
  )
}
function setSound(on) {
  A.on = on
  if (on) {
    audioInit()
    if (A.ctx) {
      A.ctx.resume()
      A.master.gain.setTargetAtTime(0.6, A.ctx.currentTime, 0.1)
      applyMix()
    }
  } else if (A.ctx) A.master.gain.setTargetAtTime(0, A.ctx.currentTime, 0.1)
  savePrefs()
}
const wake = () => {
  if (A.on) {
    audioInit()
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume()
  }
}
addEventListener('pointerdown', wake, true)
addEventListener('keydown', wake, true)

/* 23-interaction.js */
let zoom = null,
  returning = 0,
  hudDirty = true,
  drag = -1,
  pano = false,
  panoAnchor = null,
  topView = false,
  autoPan = false,
  panoFov = 65,
  topFov = 52,
  yaw = 0,
  pitch = -0.05,
  autoDay = false,
  noteFlash = null,
  noteFlashT = 0
const ray = new THREE.Raycaster(),
  ptr = new THREE.Vector2()
const TOP_POS = V(0.6, 4.35, 2.1),
  TOP_TGT = V(0.6, 0.02, 2.1)
const ZOOMS = {
  screen: [V(0.07, 1.3, 0.75), V(0.07, 1.3, -0.35)],
  board: [V(-0.35, 1.98, 0.35), V(-0.35, 1.98, -0.56)],
  dell: [V(-0.78, 1.1, 0.5), V(-1.05, 1.1, -0.15)],
  window: [V(-1.62, 1.58, 0.72), V(-2.58, 1.58, 0.7)],
  trash: [V(-0.92, 0.38, 0.62), V(-1.1, 0.11, 0.44)],
  paper: [PAPER_Z, PAPER_T],
}
const P360 = V(0.6, 1.5, 2.4)
// Odkazy na nástenke – uprav podľa seba ("|" = nový riadok na lístku)
const NOTE_COLS = [
  '#e7dfc8',
  '#c9d8e6',
  '#f1e3a6',
  '#d9c3d9',
  '#cfe1c6',
  '#f8e4d4',
  '#e8dcc8',
  '#dfe8f0',
]
const BOARD_LS = 'deskstudy-board-v1'
const DEFAULT_LINKS = [
  { t: 'GitHub|Spst-Knižnica', u: REPO, c: '#e7dfc8' },
  { t: 'GitHub|profil', u: 'https://github.com/peterdinis511', c: '#c9d8e6' },
  { t: 'YouTube', u: 'https://www.youtube.com', c: '#f1e3a6' },
  { t: 'Claude', u: 'https://claude.ai', c: '#d9c3d9' },
  { t: 'three.js|docs', u: 'https://threejs.org/docs/', c: '#cfe1c6' },
  { t: 'three.js|príklady', u: 'https://threejs.org/examples/', c: '#e7dfc8' },
  { t: 'MDN|Web Docs', u: 'https://developer.mozilla.org', c: '#c9d8e6' },
  { t: 'Stack|Overflow', u: 'https://stackoverflow.com', c: '#f1e3a6' },
  { t: 'Desk study|127.0.0.1', u: location.href, c: '#f8e4d4' },
]
const LINKS = [...DEFAULT_LINKS]
function saveBoardNotes() {
  try {
    localStorage.setItem(BOARD_LS, JSON.stringify(LINKS))
  } catch {}
}
function loadBoardLinks() {
  try {
    const r = localStorage.getItem(BOARD_LS)
    if (!r) return
    const a = JSON.parse(r)
    if (!Array.isArray(a) || !a.length) return
    LINKS.length = 0
    a.forEach((L) => {
      if (!L?.t || !L.u) return
      const o = { t: L.t, u: L.u, c: L.c || NOTE_COLS[LINKS.length % NOTE_COLS.length] }
      if (typeof L.px === 'number') {
        o.px = L.px
        o.py = L.py
        o.pz = L.pz
      }
      LINKS.push(o)
    })
  } catch {}
}
function noteLayout(i) {
  const col = i % 4,
    row = Math.floor(i / 4)
  return { x: -0.35 - 0.27 + col * 0.18, y: 1.98 + 0.08 - row * 0.15, z: -0.545 }
}
function notePos(L, i) {
  const p = noteLayout(i)
  return { x: L?.px ?? p.x, y: L?.py ?? p.y, z: L?.pz ?? p.z }
}
function spawnNote(L, i) {
  const t = ctex(256, 200, (c, w, h) => {
    c.fillStyle = L.c
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#c22'
    c.beginPath()
    c.arc(w / 2, 16, 9, 0, 7)
    c.fill()
    c.fillStyle = '#222'
    c.font = 'bold 26px sans-serif'
    L.t.split('|').forEach((s, j) => c.fillText(s.slice(0, 18), 16, 70 + j * 34))
  })
  const n = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.117),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })
  )
  const p = notePos(L, i)
  n.position.set(p.x, p.y, p.z)
  n.rotation.z = (Math.random() - 0.5) * 0.12
  n.userData = { url: L.u, title: L.t, slot: i }
  n.castShadow = true
  noteGroup.add(n)
  return n
}
function persistNotePosition(mesh) {
  const i = mesh?.userData?.slot
  if (i == null || i < 0 || i >= LINKS.length) return
  const p = mesh.position
  LINKS[i].px = p.x
  LINKS[i].py = p.y
  LINKS[i].pz = p.z
  saveBoardNotes()
}
const _boardN = new THREE.Vector3(),
  _boardP = new THREE.Vector3(),
  _boardI = new THREE.Vector3()
function boardHit(e) {
  if (!noteBoard) return null
  noteBoard.updateWorldMatrix(true, false)
  _boardN.set(0, 0, 1).transformDirection(noteBoard.matrixWorld).normalize()
  _boardP.setFromMatrixPosition(noteBoard.matrixWorld)
  const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(_boardN, _boardP)
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  ray.setFromCamera(ptr, camera)
  return ray.intersectPlane(pl, _boardI) ? _boardI : null
}
function disposeNote(mesh) {
  if (!mesh) return
  if (mesh.parent) mesh.parent.remove(mesh)
  mesh.geometry?.dispose()
  mesh.material?.map?.dispose()
  mesh.material?.dispose()
}
function relayoutBoardNotes() {
  noteGroup.children.forEach((n, i) => {
    n.userData.slot = i
    const p = notePos(LINKS[i], i)
    n.position.set(p.x, p.y, p.z)
    n.scale.set(1, 1, 1)
  })
}
function isNoteOffBoard(mesh) {
  const p = mesh.position
  return p.x < -0.72 || p.x > 0 || p.y < 1.72 || p.y > 2.2
}
const HINT_DEFAULT =
  'E = sadnúť · Papier: klik / P = písať · nástenka: Shift+klik / Delete'
const HINT_BOARD =
  'Nástenka: ťahaj lístky po korku · dvojklik = hod do koša · Shift+klik = zmazať · Esc = späť'
const HINT_TRASH = 'Kôš: pohľad na neporiadok · klik na pedál alebo Esc = späť'
const HINT_PAPER =
  'Papier zhora: čitateľný text · klikni pero = atrament · P / klik na list = písať · Esc = späť'
function syncHint() {
  const h = $('hint')
  if (!h) return
  h.textContent =
    zoom === 'board'
      ? HINT_BOARD
      : zoom === 'trash'
        ? HINT_TRASH
        : zoom === 'paper'
          ? HINT_PAPER
          : HINT_DEFAULT
}
function tossBoardNote(mesh, { quiet = false, skipMess = false } = {}) {
  let i = mesh?.userData?.slot
  if (i == null || i < 0) i = noteGroup.children.indexOf(mesh)
  if (i < 0 || i >= LINKS.length) return
  if (selectedBoardNote === mesh) selectedBoardNote = null
  const L = LINKS[i]
  if (!skipMess) pushTrashMess({ t: L.t, c: L.c })
  else if (!quiet) pulseTrashOpen(2.2)
  LINKS.splice(i, 1)
  disposeNote(mesh)
  relayoutBoardNotes()
  saveBoardNotes()
  burst('lowpass', 220, 0.22, 0.35)
}
const noteTossAnims = []
function noteIsTossing(mesh) {
  return noteTossAnims.some((a) => a.mesh === mesh)
}
function animateNoteToTrash(mesh) {
  if (!mesh || !trashG || noteIsTossing(mesh)) return
  mesh.updateWorldMatrix(true, false)
  const start = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld)
  if (mesh.parent) mesh.parent.remove(mesh)
  scene.add(mesh)
  mesh.position.copy(start)
  const end = trashMouthWorld(new THREE.Vector3())
  _trashMid.lerpVectors(start, end, 0.42).y += 0.48
  if (camera) {
    _trashMid.x += 0.12
    _trashMid.z += 0.08
  }
  noteTossAnims.push({
    mesh,
    start,
    end,
    mid: _trashMid.clone(),
    t: 0,
    dur: 1.05,
    spin: (Math.random() - 0.5) * 14,
  })
  setTrashOpen(true, true)
  trashAutoT = 2.8
  if (selectedBoardNote === mesh) selectedBoardNote = null
  burst('highpass', 900, 0.08, 0.35)
}
function updateNoteTossAnims(dt) {
  for (let i = noteTossAnims.length - 1; i >= 0; i--) {
    const a = noteTossAnims[i]
    a.t += dt / a.dur
    const u = Math.min(1, a.t),
      e = 1 - (1 - u) ** 2.6
    _trashA.lerpVectors(a.start, a.mid, e)
    _trashB.lerpVectors(a.mid, a.end, e)
    a.mesh.position.lerpVectors(_trashA, _trashB, e)
    a.mesh.rotation.z = a.spin * u * (1 - u) * 2.8
    a.mesh.rotation.x = Math.sin(u * Math.PI) * 0.9
    a.mesh.rotation.y = u * 1.4
    const sc = Math.max(0.08, 1 - u * 0.82)
    a.mesh.scale.setScalar(sc)
    if (u >= 1) {
      const si = a.mesh?.userData?.slot
      const meta =
        si >= 0 && si < LINKS.length
          ? { t: LINKS[si].t, c: LINKS[si].c }
          : { t: a.mesh.userData?.title, c: NOTE_COLS[0] }
      pushTrashMess(meta)
      tossBoardNote(a.mesh, { quiet: true, skipMess: true })
      noteTossAnims.splice(i, 1)
    }
  }
}
let dragNote = null,
  dragNoteMoved = false,
  _dragNoteSlot = 0,
  dragNoteHome = new THREE.Vector3(),
  trashWp = new THREE.Vector3(),
  noteWp = new THREE.Vector3(),
  selectedBoardNote = null
let lastNoteTap = 0,
  lastNoteTapMesh = null,
  noteOpenTimer = null
const NOTE_DBL_MS = 420
const _lastPaperTap = 0
const _PAPER_DBL_MS = 460
function beginBoardDrag(noteMesh) {
  dragNote = noteMesh
  selectedBoardNote = noteMesh
  dragNoteMoved = false
  _dragNoteSlot = noteGroup.children.indexOf(dragNote)
  dragNoteHome.copy(dragNote.position)
  dragNote.scale.set(1, 1, 1)
}
function addBoardNote(L, { focusBoard = false } = {}) {
  if (noteGroup.children.length >= 12) {
    alert('Nástenka je plná (max. 12).')
    return null
  }
  LINKS.push(L)
  const i = noteGroup.children.length
  const n = spawnNote(L, i)
  saveBoardNotes()
  sfxClick()
  noteFlash = n
  noteFlashT = 1.4
  if (focusBoard) {
    zoom = 'board'
    returning = 0
    pano = false
    controls.enabled = false
    syncHint()
  }
  return n
}
function noteTitleFromLines(l1, l2) {
  const a = (l1 || '').trim(),
    b = (l2 || '').trim()
  if (!a && !b) return null
  return b ? `${a}|${b}` : a
}
function openNoteDialog({ l1 = '', l2 = '', url = '' } = {}) {
  $('noteL1').value = l1
  $('noteL2').value = l2
  $('noteUrl').value = url || location.href
  $('noteDlg').classList.add('open')
  setTimeout(() => $('noteL1').focus(), 40)
}
function closeNoteDialog() {
  $('noteDlg').classList.remove('open')
}
function saveNoteFromDialog(focusBoard) {
  const t = noteTitleFromLines($('noteL1').value, $('noteL2').value)
  if (!t) {
    $('noteL1').focus()
    return
  }
  let u = $('noteUrl').value.trim()
  if (!u) u = location.href
  if (!/^https?:\/\//i.test(u) && !/^mailto:/i.test(u)) u = `https://${u}`
  addBoardNote({ t, u, c: NOTE_COLS[noteGroup.children.length % NOTE_COLS.length] }, { focusBoard })
  closeNoteDialog()
}
function pick(e, obj) {
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  ray.setFromCamera(ptr, camera)
  return ray.intersectObject(obj, true)[0]
}
function pickTrash(e) {
  if (!trashG) return null
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  ray.setFromCamera(ptr, camera)
  return ray.intersectObject(trashG, true)[0]
}
function hudHit(e) {
  if (ghBig.visible || extPlane?.visible || !hudPlane.visible) return null
  const h = pick(e, hudPlane)
  return h ? { x: h.uv.x * 1280, y: (1 - h.uv.y) * 720 } : null
}
function hudAct(x, y, start) {
  if (start && x > 1000 && y < 330) {
    const i = Math.round((y - 50) / 38)
    if (i >= 0 && i < P.length) setTimeOfDay(i)
    return
  }
  if (y > 655) {
    if (start) {
      if (x > slX(3) && x < slX(3) + 100) {
        S.drift = !S.drift
        return
      }
      if (x > slX(4) && x < slX(4) + 100) {
        S.study = !S.study
        return
      }
    }
    SL.forEach(([l, k], i) => {
      if (start ? x > slX(i) - 6 && x < slX(i) + 176 : drag === i) {
        drag = i
        S[k] = Math.min(1, Math.max(0, (x - slX(i)) / 170))
        if (k === 'open') {
          S.openT = S[k]
          setSw('bWin', S.openT > 0.5)
          if (S.openT <= 0.5) S.open = 0
          if (A.ctx) applyMix()
        }
        hudDirty = true
      }
    })
  }
}
const cv = renderer.domElement
function seatBlocksLook(e) {
  if (!sitting) return false
  return !!(
    (paperG && pick(e, paperG)) ||
    pickTrash(e) ||
    (laptopG && pick(e, laptopG)) ||
    (paperG && pick(e, paperG))
  )
}
cv.addEventListener('pointerdown', (e) => {
  if (pano && !sitting) return
  const out = () => {
    zoom = null
    returning = 90
    syncHint()
  }
  if (zoom === 'screen') {
    const h = hudHit(e)
    if (h) hudAct(h.x, h.y, true)
    else if (!tabClick(e)) out()
  } else if (zoom === 'board') {
    const n = pick(e, noteGroup)
    if (n && !noteIsTossing(n.object)) beginBoardDrag(n.object)
    else if (pick(e, noteBoard) && e.shiftKey)
      openNoteDialog({ l1: 'Nová', l2: 'poznámka', url: location.href })
    else {
      selectedBoardNote = null
      out()
    }
  } else if (zoom === 'dell') {
    if (pick(e, dellG)) window.open(REPO, '_blank')
    else out()
  } else if (zoom === 'paper') {
    const pen = pickPen(e)
    if (pen) setActivePen(pen.userData.penId)
    else if (pickPaper(e)) {
      openPaperDialog()
      sfxClick()
    } else out()
  } else {
    const penHit = pickPen(e)
    if (penHit) {
      setActivePen(penHit.userData.penId)
      openPaperRead()
    } else if (pickPaper(e) || (paperG && pick(e, paperG))) openPaperRead()
    else if (chairG && pick(e, chairG)) {
      setSitting(!sitting)
    } else if (pick(e, bigScreen)) {
      if (!PWR.aoc) {
        togglePwr('aoc')
      } else {
        zoom = 'screen'
        returning = 0
      }
    } else if (windowHit && pick(e, windowHit)) {
      zoom = 'window'
      returning = 0
    } else {
      const n = pick(e, noteGroup)
      if (n && !noteIsTossing(n.object)) {
        zoom = 'board'
        returning = 0
        syncHint()
        beginBoardDrag(n.object)
      } else if (pick(e, noteBoard)) {
        zoom = 'board'
        returning = 0
        syncHint()
      } else if (pick(e, dellG)) {
        if (!PWR.dell) {
          togglePwr('dell')
        } else {
          zoom = 'dell'
          returning = 0
        }
      } else if (laptopG && pick(e, laptopG)) {
        togglePwr('mac')
      }
    }
  }
  if (sitting && !zoom && !seatBlocksLook(e)) {
    try {
      cv.setPointerCapture(e.pointerId)
    } catch {}
  }
})
cv.addEventListener('pointermove', (e) => {
  if ((pano || sitting) && e.buttons) {
    const sens = sitting ? 0.0048 : 0.004
    yaw += e.movementX * sens
    pitch = Math.max(-0.95, Math.min(1.1, pitch - e.movementY * sens))
  }
  if (zoom === 'screen' && drag >= 0 && e.buttons) {
    const h = hudHit(e)
    if (h) hudAct(h.x, 700, false)
  }
  if (zoom === 'screen' && !e.buttons) {
    const onTab = !!pick(e, sbPlane),
      onExt = extPlane?.visible && pick(e, extPlane),
      onHud = hudPlane.visible && pick(e, hudPlane)
    cv.style.cursor = onTab || onExt || onHud ? 'pointer' : 'default'
  } else if (zoom === 'board') {
    if (dragNote && e.buttons) {
      const p = boardHit(e)
      if (p) {
        dragNote.position.copy(p)
        dragNote.position.z = -0.541
        dragNoteMoved = true
        dragNote.rotation.z *= 0.92
      }
      cv.style.cursor = 'grabbing'
    } else cv.style.cursor = pick(e, noteGroup) || pick(e, trashHit) ? 'pointer' : 'grab'
  } else if (zoom === 'dell') cv.style.cursor = pick(e, dellG) ? 'pointer' : 'default'
  else if (!zoom && !pano && windowHit && pick(e, windowHit)) cv.style.cursor = 'pointer'
  else if (sitting && !zoom) cv.style.cursor = e.buttons ? 'grabbing' : 'grab'
  else if (zoom === 'paper') cv.style.cursor = pickPen(e) || pickPaper(e) ? 'pointer' : 'default'
  else if (!e.buttons) {
    const onPaper = paperG && pick(e, paperG)
    const onChair = chairG && pick(e, chairG)
    const onTrash = !!pickTrash(e)
    cv.style.cursor =
      onChair || onPaper || onTrash || pick(e, lampG) || pick(e, switchBox) || pick(e, ceilHit)
        ? 'pointer'
        : 'default'
  }
})
cv.addEventListener('pointerup', (e) => {
  if (dragNote) {
    const mesh = dragNote
    const overTrash =
      pick(e, trashHit) ||
      (trashG &&
        (trashG.getWorldPosition(trashWp),
        dragNote.getWorldPosition(noteWp),
        noteWp.distanceTo(trashWp) < 0.4))
    const offBoard = dragNoteMoved && isNoteOffBoard(dragNote)
    if ((e.shiftKey && !dragNoteMoved) || (dragNoteMoved && (overTrash || offBoard))) {
      if (dragNoteMoved && (overTrash || offBoard)) animateNoteToTrash(mesh)
      else tossBoardNote(mesh)
      selectedBoardNote = null
    } else if (!dragNoteMoved) {
      const now = performance.now()
      if (e.shiftKey) {
        tossBoardNote(mesh)
        selectedBoardNote = null
      } else if (now - lastNoteTap < NOTE_DBL_MS && lastNoteTapMesh === mesh) {
        clearTimeout(noteOpenTimer)
        noteOpenTimer = null
        lastNoteTap = 0
        lastNoteTapMesh = null
        animateNoteToTrash(mesh)
        selectedBoardNote = null
      } else {
        lastNoteTap = now
        lastNoteTapMesh = mesh
        selectedBoardNote = mesh
        clearTimeout(noteOpenTimer)
        const url = mesh.userData.url
        noteOpenTimer = setTimeout(() => {
          if (lastNoteTapMesh === mesh) window.open(url, '_blank', 'noopener,noreferrer')
          noteOpenTimer = null
          lastNoteTapMesh = null
        }, NOTE_DBL_MS)
      }
    } else {
      persistNotePosition(dragNote)
      dragNote.rotation.z += (Math.random() - 0.5) * 0.04
      selectedBoardNote = dragNote
    }
    dragNote = null
    dragNoteMoved = false
  }
  drag = -1
  try {
    cv.releasePointerCapture(e.pointerId)
  } catch {}
})
let pdx = 0,
  pdy = 0
cv.addEventListener(
  'pointerdown',
  (e) => {
    pdx = e.clientX
    pdy = e.clientY
  },
  true
)
cv.addEventListener('click', (e) => {
  if (Math.hypot(e.clientX - pdx, e.clientY - pdy) >= 6) return
  if (pick(e, lampG)) toggleLamp()
  else if (pick(e, switchBox) || pick(e, ceilHit)) toggleCeil()
  else if (!pano && pickTrash(e)) toggleTrash()
})
cv.addEventListener(
  'wheel',
  (e) => {
    if (pano) panoFov = Math.max(30, Math.min(90, panoFov + e.deltaY * 0.04))
    else if (sitting) seatFov = Math.max(34, Math.min(62, seatFov + e.deltaY * 0.04))
    else if (zoom && e.deltaY > 0) {
      zoom = null
      returning = 90
      syncHint()
    }
  },
  { passive: true }
)
addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '7') setTimeOfDay(+e.key - 1)
  if (e.key === 'Escape') {
    if ($('noteDlg').classList.contains('open')) {
      closeNoteDialog()
      return
    }
    if ($('paperDlg').classList.contains('open')) {
      closePaperDialog()
      return
    }
    if (pano) setPano(false)
    else if (topView) setTopView(false)
    else if (sitting) setSitting(false)
    else if (zoom) {
      zoom = null
      returning = 90
      syncHint()
    }
  }
  if (
    (e.key === 'Delete' || e.key === 'Backspace') &&
    zoom === 'board' &&
    selectedBoardNote &&
    !$('noteDlg').classList.contains('open') &&
    !$('paperDlg').classList.contains('open')
  ) {
    e.preventDefault()
    tossBoardNote(selectedBoardNote)
    selectedBoardNote = null
  }
  if (e.key === 't' || e.key === 'T') {
    if (!topView && sitting) setSitting(false, true)
    setTopView(!topView)
  }
  if (e.key === 'e' || e.key === 'E') setSitting(!sitting)
  if (
    (e.key === 'p' || e.key === 'P') &&
    !$('paperDlg').classList.contains('open') &&
    !$('noteDlg').classList.contains('open')
  ) {
    if (zoom !== 'paper') openPaperRead()
    openPaperDialog()
  }
  if ((e.key === 'v' || e.key === 'V') && sitting) setPano(!pano)
})
function setFov(v) {
  if (Math.abs(v - camera.fov) < 0.002) return
  camera.fov = v
  camera.updateProjectionMatrix()
}
function setTab(i, openExt = true) {
  if (i < 0 || i >= BROWSER_TABS.length) return
  if (!PWR.aoc) return
  const tab = BROWSER_TABS[i],
    was = activeTab
  activeTab = i
  refreshAocContent()
  if (tab.ext) {
    extPlane.material.map = extTabTex(tab.label, tab.url)
    extPlane.material.needsUpdate = true
    if (openExt && i !== was) window.open(tab.url, '_blank', 'noopener,noreferrer')
  }
  tabHL.position.y = 0.43 + 0.175 - (100 + 34 * i - 4) * (0.35 / 640)
  paintSidebar(i)
  sfxClick()
  hudDirty = true
}
function tabClick(e) {
  const t = pick(e, sbPlane)
  if (t) {
    const i = Math.floor(((1 - t.uv.y) * 640 - 82) / 34)
    if (i >= 0 && i < BROWSER_TABS.length) {
      setTab(i)
      return true
    }
  }
  if (extPlane?.visible && pick(e, extPlane)) {
    window.open(BROWSER_TABS[activeTab].url, '_blank', 'noopener,noreferrer')
    return true
  }
  if (ghBig.visible && pick(e, ghBig)) {
    window.open(REPO, '_blank', 'noopener,noreferrer')
    return true
  }
  return false
}
function toggleCeil() {
  S.ceilT = S.ceilT > 0.5 ? 0 : 1
  if ($('bCeil')) setSw('bCeil', S.ceilT > 0.5)
  sfxClick()
  savePrefs()
}
function toggleLamp() {
  S.lampT = S.lampT > 0.5 ? 0 : 1
  if ($('bLamp')) setSw('bLamp', S.lampT > 0.5)
  sfxClick()
  savePrefs()
}
addEventListener('keydown', (e) => {
  if (e.key === 'l' || e.key === 'L') toggleLamp()
  if (e.key === 'c' || e.key === 'C') toggleCeil()
  if (e.key === 'r' || e.key === 'R') resetView()
})
function typingUi() {
  return (
    $('noteDlg')?.classList.contains('open') ||
    $('paperDlg')?.classList.contains('open') ||
    /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')
  )
}
function syncViewUi() {
  $('bOrb').classList.toggle('on', !pano && !topView && !sitting)
  $('bPano').classList.toggle('on', pano)
  $('bTop').classList.toggle('on', topView)
  if ($('bSit')) setSw('bSit', sitting)
}
function setPano(v) {
  if (topView) {
    topView = false
    if (ceilMesh) ceilMesh.visible = true
  }
  if (!v) {
    pano = false
    panoAnchor = null
    topView = false
    zoom = null
    returning = 90
    syncViewUi()
    return
  }
  pano = true
  topView = false
  zoom = null
  if (sitting) {
    panoAnchor = 'seat'
    panoFov = SEAT_FOV + 6
    const dx = SEAT_TGT.x - SEAT_POS.x,
      dz = SEAT_TGT.z - SEAT_POS.z
    yaw = Math.atan2(dx, dz)
    pitch = Math.asin(Math.min(1, Math.max(-1, (SEAT_TGT.y - SEAT_POS.y) / Math.hypot(dx, dz))))
    returning = 0
  } else {
    panoAnchor = null
    yaw = Math.atan2(-0.6, -2.4)
    panoFov = 65
    returning = 90
  }
  syncViewUi()
}
function setTopView(v) {
  if (v && sitting) setSitting(false, true)
  topView = v
  pano = false
  zoom = null
  if (ceilMesh) ceilMesh.visible = !v
  returning = v ? 150 : 120
  syncViewUi()
}
function resetView() {
  setPano(false)
  setTopView(false)
  setSitting(false)
  zoom = null
  returning = 120
  syncViewUi()
  syncHint()
}
const $ = (id) => document.getElementById(id)
const SK = ['Svitanie', 'Ráno', 'Poludnie', 'Popoludnie', 'Západ', 'Búrka', 'Mesiac']
const setSw = (id, on) => {
  $(id).classList.toggle('on', on)
  $(id).setAttribute('aria-pressed', on)
}
P.forEach((p, i) => {
  const b = document.createElement('button')
  b.textContent = SK[i]
  b.onclick = () => setTimeOfDay(i)
  $('days').appendChild(b)
})
$('bWin').onclick = () => {
  S.openT = S.openT > 0.5 ? 0 : 1
  setSw('bWin', S.openT > 0.5)
  if (S.openT <= 0.5) S.open = 0
  sfxWindow(S.openT > 0.5)
  if (A.ctx) applyMix()
  savePrefs()
}
$('bPano').onclick = () => setPano(pano && panoAnchor === 'seat' ? false : !pano)
$('bOrb').onclick = () => {
    if (sitting) setSitting(false, true)
  setTopView(false)
  setPano(false)
  returning = 120
  syncViewUi()
}
$('bTop').onclick = () => setTopView(true)
$('bReset').onclick = resetView
$('bBack').onclick = resetView
$('bSit').onclick = () => setSitting(!sitting)
$('bRad').onclick = () => setRadiator(!radiatorOn)
$('bTrash').onclick = () => toggleTrash()
$('bPwrAoc').onclick = () => togglePwr('aoc')
$('bPwrDell').onclick = () => togglePwr('dell')
$('bPwrMac').onclick = () => togglePwr('mac')
$('paperCancel').onclick = closePaperDialog
$('paperSave').onclick = savePaper
$('paperDlg').addEventListener('click', (e) => {
  if (e.target === $('paperDlg')) closePaperDialog()
})
$('penRow')?.addEventListener('click', (e) => {
  const b = e.target.closest('.penPick')
  if (!b) return
  setActivePen(b.dataset.pen, { save: false, redraw: false })
})
$('paperText')?.addEventListener('input', () => {
  const ta = $('paperText')
  if (ta) {
    ta.style.color = paperInk()
    ta.style.caretColor = paperInk()
  }
})
$('bCeil').onclick = () => toggleCeil()
$('bLamp').onclick = () => toggleLamp()
$('bSnd').onclick = () => {
  setSound(!A.on)
  setSw('bSnd', A.on)
}
$('bAuto').onclick = () => {
  autoDay = !autoDay
  setSw('bAuto', autoDay)
  savePrefs()
}
$('bFold').onclick = () => {
  $('ui').classList.toggle('fold')
  $('bFold').textContent = $('ui').classList.contains('fold') ? '+' : '–'
  savePrefs()
}
$('bNote').onclick = () => openNoteDialog({ l1: 'Moja', l2: 'poznámka', url: location.href })
$('bPaper').onclick = () => openPaperRead()
$('noteCancel').onclick = closeNoteDialog
$('noteSave').onclick = () => saveNoteFromDialog(true)
$('noteDlg').addEventListener('click', (e) => {
  if (e.target === $('noteDlg')) closeNoteDialog()
})
$('noteDlg').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveNoteFromDialog(true)
  }
})
setInterval(() => {
  if (autoDay) setTimeOfDay((S.i + 1) % P.length, true, false, true)
}, 7000)
function onResize() {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
}
addEventListener('resize', onResize)

/* 24-build-loop.js */
try {
  buildRoom()
  buildDesk()
  buildChair()
  buildRoomExtras()
  buildTrashBin()
  buildPaper()
  refreshPaper()
  buildScreens(rt.texture, hudTex)
  buildLaptop()
  buildMugs()
  buildRoomWind()
  buildWallDecor()
  buildTechCorner()
  buildCables()
  buildLights()
  buildClock()
  buildRain()
  buildNested()
  applyPrefs(loadPrefs())
  applyTime(0)
  renderer.render(scene, camera)
} catch (err) {
  console.error(err)
  const h = $('hint')
  if (h) h.textContent = `Chyba pri stavbe scény: ${err.message}`
}
const clock = new THREE.Clock()
let fr = 0,
  lastBB = '',
  lastSig = '',
  osDirty = true,
  nsDirty = true
renderer.setAnimationLoop(() => {
  try {
    const dt = Math.min(clock.getDelta(), 0.05),
      t = clock.elapsedTime
    fr++
    applyTime(dt)
    updateClimate(dt)
    const kz = 1 - 0.002 ** dt
    if (pano) {
      controls.enabled = false
      const panoPos = panoAnchor === 'seat' && sitting ? SEAT_POS : P360
      camera.position.lerp(panoPos, kz)
      if (autoPan && !panoAnchor) yaw += dt * 0.35
      setFov(camera.fov + (panoFov - camera.fov) * kz)
      camera.lookAt(
        camera.position.x + Math.sin(yaw) * Math.cos(pitch),
        camera.position.y + Math.sin(pitch),
        camera.position.z + Math.cos(yaw) * Math.cos(pitch)
      )
    } else if (topView) {
      controls.enabled = false
      setFov(camera.fov + (topFov - camera.fov) * kz)
      camera.position.lerp(TOP_POS, kz)
      controls.target.lerp(TOP_TGT, kz)
      camera.up.set(0, 1, 0)
      camera.lookAt(controls.target)
    } else if (sitting) {
      controls.enabled = false
      const fovT = pano ? panoFov : seatFov
      setFov(camera.fov + (fovT - camera.fov) * kz)
      camera.position.lerp(SEAT_POS, kz)
      seatLookAt()
    } else if (zoom) {
      controls.enabled = false
      const fovTgt = zoom === 'trash' ? 40 : zoom === 'paper' ? 32 : 35
      setFov(camera.fov + (fovTgt - camera.fov) * kz)
      const Z = ZOOMS[zoom]
      camera.position.lerp(Z[0], kz)
      controls.target.lerp(Z[1], kz)
      camera.up.set(0, 1, 0)
      camera.lookAt(controls.target)
      if (zoom === 'trash') setTrashOpen(true, true)
      if (paperReadL) paperReadL.visible = zoom === 'paper'
    } else {
      if (paperReadL) paperReadL.visible = false
      if (returning > 0) {
        returning -= dt * 60
        camera.position.lerp(HOME, kz)
        controls.target.lerp(HOMET, kz)
        setFov(camera.fov + (35 - camera.fov) * kz)
        if (camera.position.distanceTo(HOME) < 0.004) returning = 0
      }
      controls.enabled = true
      controls.update()
    }
    updateClock()
    updateWindowWeather(dt)
    updateRoomWind(dt, t)
    const bb = zoom || pano || topView || sitting ? 'block' : 'none'
    if (bb !== lastBB) {
      $('bBack').style.display = bb
      lastBB = bb
    }
    updateMedalsWind(t)
    leds.forEach((l, i) => (l.visible = Math.sin(t * 9 + i * 2.1) > -0.3))
    applyMacLid(dt)
    updateTrashLid(dt)
    updateTrashMess(dt, t)
    updateNoteTossAnims(dt)
    if (!PWR.mac) cursor.visible = false
    else cursor.visible = Math.floor(t * 2) % 2 === 0
    if (noteFlashT > 0 && noteFlash) {
      noteFlashT -= dt
      const s = 1 + 0.06 * Math.sin(t * 14)
      noteFlash.scale.set(s, s, 1)
      if (noteFlashT <= 0) {
        noteFlash.scale.set(1, 1, 1)
        noteFlash = null
      }
    }
    if (steam) {
      const w = Math.max(0, S.open),
        sp = steam.geometry.attributes.position
      for (let i = 0; i < 24; i++) {
        const a = (t * (0.15 + w * 0.25) + i / 24) % 1
        sp.setXYZ(
          i,
          Math.sin(a * 9 + i) * 0.012 + w * 0.028 * a * (0.5 + Math.sin(t * 2 + i) * 0.5),
          a * 0.2,
          Math.cos(a * 7 + i) * 0.012 + w * 0.01 * Math.sin(t + i)
        )
      }
      sp.needsUpdate = true
    }
    if (S.drift && hudPlane.visible) {
      const p = dust.geometry.attributes.position,
        a = p.array,
        v = 1 + S.open * 2
      for (let i = 0; i < a.length; i += 3) {
        a[i] += dustV[i] * v
        a[i + 1] += dustV[i + 1] * v
        a[i + 2] += dustV[i + 2] * v
        if (a[i] > 2 || a[i] < -2) dustV[i] *= -1
        if (a[i + 1] > 2.3 || a[i + 1] < 0.1) dustV[i + 1] *= -1
        if (a[i + 2] > 2 || a[i + 2] < -2) dustV[i + 2] *= -1
      }
      p.needsUpdate = true
    }
    dust.geometry.setDrawRange(0, Math.floor(500 * S.air))
    if (hudPlane.visible && (hudDirty || fr % 30 === 0)) {
      updateHUD()
      hudDirty = false
    }
    // nested view: slow orbit in "air" mode, fixed in "study" mode
    const a = S.study ? 0 : Math.sin(t * 0.25) * 0.12
    nc.position.set(
      3.2 * Math.cos(a) + 3.6 * Math.sin(a),
      2.4,
      3.6 * Math.cos(a) - 3.2 * Math.sin(a)
    )
    nc.lookAt(0, 0.9, 0)
    const sig = [S.sp.x, S.sp.y, S.sp.z, S.si, S.ceil, S.lamp, S.open, S.blade, S.flash]
        .map((v) => v.toFixed(3))
        .join(),
      sd = sig !== lastSig
    lastSig = sig
    if (sd) {
      osDirty = nsDirty = true
      if (A.ctx) applyMix()
    }
    if (hudPlane.visible && fr % 2 === 0) {
      renderer.shadowMap.needsUpdate = nsDirty
      nsDirty = false
      renderer.setRenderTarget(rt)
      renderer.render(ns, nc)
      renderer.setRenderTarget(null)
    }
    renderer.shadowMap.needsUpdate = osDirty
    osDirty = false
    renderer.render(scene, camera)
  } catch (err) {
    console.error(err)
    const h = $('hint')
    if (h) h.textContent = `Chyba v animácii: ${err.message}`
  }
})
