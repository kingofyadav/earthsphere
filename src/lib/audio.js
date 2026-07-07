// Synthesized Web Audio engine — no asset files.
// Ambient space drone + one-shot SFX. Must be unlocked by a user gesture
// (browsers block AudioContext until then); call initAudio() from a click.

let ctx = null
let masterGain = null
let ambientNodes = null
let muted = true
let unlocked = false

const MASTER_VOL = 0.5

function ensureContext() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  masterGain = ctx.createGain()
  masterGain.gain.value = muted ? 0 : MASTER_VOL
  masterGain.connect(ctx.destination)
  return ctx
}

// Call from a user gesture. Safe to call repeatedly.
export function initAudio() {
  const c = ensureContext()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  unlocked = true
  if (!muted) startAmbient()
}

export function setMuted(next) {
  muted = next
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(masterGain.gain.value, now)
  masterGain.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, now + 0.4)
  if (muted) stopAmbient()
  else if (unlocked) startAmbient()
}

export function isMuted() {
  return muted
}

// ── Ambient: two detuned drones + slow filtered noise bed ──
function startAmbient() {
  if (!ctx || ambientNodes) return
  const bed = ctx.createGain()
  bed.gain.value = 0
  bed.connect(masterGain)
  bed.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 3)

  const oscA = ctx.createOscillator()
  oscA.type = 'sine'
  oscA.frequency.value = 55
  const oscB = ctx.createOscillator()
  oscB.type = 'sine'
  oscB.frequency.value = 55 * 1.5 + 0.6 // detuned fifth for a soft beat
  const droneGain = ctx.createGain()
  droneGain.gain.value = 0.5

  // slow LFO shimmer on the drone
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.07
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.18
  lfo.connect(lfoGain).connect(droneGain.gain)

  oscA.connect(droneGain)
  oscB.connect(droneGain)
  droneGain.connect(bed)

  // filtered noise "wind"
  const noise = ctx.createBufferSource()
  noise.buffer = makeNoiseBuffer(4)
  noise.loop = true
  const nf = ctx.createBiquadFilter()
  nf.type = 'lowpass'
  nf.frequency.value = 320
  const ng = ctx.createGain()
  ng.gain.value = 0.05
  noise.connect(nf).connect(ng).connect(bed)

  oscA.start(); oscB.start(); lfo.start(); noise.start()
  ambientNodes = { bed, oscA, oscB, lfo, noise }
}

function stopAmbient() {
  if (!ctx || !ambientNodes) return
  const { bed, oscA, oscB, lfo, noise } = ambientNodes
  const now = ctx.currentTime
  bed.gain.cancelScheduledValues(now)
  bed.gain.setValueAtTime(bed.gain.value, now)
  bed.gain.linearRampToValueAtTime(0, now + 1.2)
  const stopAt = now + 1.3
  ;[oscA, oscB, lfo, noise].forEach(n => { try { n.stop(stopAt) } catch { /* already stopped */ } })
  ambientNodes = null
}

function makeNoiseBuffer(seconds) {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

// ── One-shot SFX ──
export function playSfx(name) {
  if (muted || !ctx || ctx.state !== 'running') return
  const fn = SFX[name]
  if (fn) fn(ctx, masterGain)
}

function tone(c, out, { type = 'sine', from, to = from, dur = 0.2, gain = 0.3, delay = 0, curve = 'exp' }) {
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(from, t0)
  if (to !== from) {
    if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur)
    else osc.frequency.linearRampToValueAtTime(to, t0 + dur)
  }
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(out)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

const SFX = {
  // rising whoosh into light-speed
  whoosh(c, out) {
    const src = c.createBufferSource()
    src.buffer = makeNoiseBuffer(1.2)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(180, c.currentTime)
    bp.frequency.exponentialRampToValueAtTime(2600, c.currentTime + 1.0)
    bp.Q.value = 0.8
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.32, c.currentTime + 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.1)
    src.connect(bp).connect(g).connect(out)
    src.start()
    src.stop(c.currentTime + 1.2)
    tone(c, out, { type: 'sawtooth', from: 110, to: 900, dur: 0.9, gain: 0.12 })
  },
  // arrival — bright two-note chime
  arrive(c, out) {
    tone(c, out, { type: 'sine', from: 660, dur: 0.5, gain: 0.22 })
    tone(c, out, { type: 'sine', from: 990, dur: 0.6, gain: 0.18, delay: 0.09 })
    tone(c, out, { type: 'triangle', from: 1320, dur: 0.4, gain: 0.10, delay: 0.16 })
  },
  click(c, out) {
    tone(c, out, { type: 'square', from: 420, to: 560, dur: 0.08, gain: 0.16 })
  },
  hover(c, out) {
    tone(c, out, { type: 'sine', from: 880, dur: 0.05, gain: 0.06 })
  },
  // identity / sun gateway open
  gateway(c, out) {
    tone(c, out, { type: 'sine', from: 330, to: 660, dur: 0.5, gain: 0.2, curve: 'exp' })
    tone(c, out, { type: 'triangle', from: 495, to: 990, dur: 0.6, gain: 0.12, delay: 0.05 })
  },
}
