import { useMemo, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Fingerprint, Globe, Mail, Phone, Key, Hash, Shield,
  CheckCircle, Clock, AlertTriangle, Plus, Lock,
  RefreshCw, Users, Home, Heart, Briefcase, Link, Award,
  FileText, Copy, Check, Trash2, Download, Eye,
  ChevronDown, ChevronUp, Rocket, MapPin, Landmark, Flag
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { useEarthStore } from '../../../store/earthStore'
import { useTravelStore } from '../../../store/travelStore'
import { useNationStore } from '../../../store/nationStore'
import styles from './HDIPage.module.css'

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function mockHash(seed, idx) {
  const chars = '0123456789abcdef'
  let h = '0x'; const s = seed || 'hdi'
  for (let i = 0; i < 8; i++) h += chars[((s.charCodeAt(i % s.length) || 65) + idx * 7 + i * 13) % 16]
  return h + '…'
}
function relTime(msAgo) {
  if (msAgo < 0)       return 'queued'
  if (msAgo < 60000)   return `${Math.floor(msAgo / 1000)}s ago`
  if (msAgo < 3600000) return `${Math.floor(msAgo / 60000)}m ago`
  return `${Math.floor(msAgo / 3600000)}h ago`
}
function trustLabel(score) {
  if (score < 200) return 'Unverified'
  if (score < 400) return 'Emerging'
  if (score < 600) return 'Established'
  if (score < 800) return 'Trusted'
  return 'Sovereign'
}
function computeTrustScore(verif = {}, rels = [], assets = {}, rec = {}) {
  let s = 100
  if (verif.email)       s += 100
  if (verif.phone)       s += 150
  if (verif.govId)       s += 150
  if (verif.employer)    s += 100
  if (verif.university)  s += 100
  if (verif.socialTrust) s += 100
  s += Math.min((rels.length) * 10, 50)
  s += Math.min(Object.values(assets).reduce((t, a) => t + (a?.length || 0), 0) * 10, 50)
  s += Object.values(rec).filter(Boolean).length * 25
  return Math.min(s, 1000)
}

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */
function Toggle({ on, onChange, disabled = false }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.toggleOn : ''} ${disabled ? styles.toggleDisabled : ''}`}
      onClick={disabled ? undefined : onChange}
      role="switch" aria-checked={on} disabled={disabled}
    >
      <span className={styles.toggleThumb} />
    </button>
  )
}

function PhaseBar({ num, title, status, type = 'empty' }) {
  const cls = type === 'complete' ? styles.phaseBadgeGreen
            : type === 'partial'  ? styles.phaseBadgeAmber
            : styles.phaseBadgeGrey
  return (
    <div className={styles.phaseBar}>
      <span className={styles.phaseBarLine} />
      <span className={styles.phaseNum}>PHASE {String(num).padStart(2,'0')}</span>
      <span className={styles.phaseTitle}>{title}</span>
      <span className={styles.phaseBarLine} />
      {status && <span className={`${styles.phaseBadge} ${cls}`}>{status}</span>}
    </div>
  )
}

function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />
}

function PhaseGate({ phaseId, onStart }) {
  const meta = PHASE_UNLOCKS[phaseId]
  if (!meta) return null
  return (
    <motion.section className={`${styles.panel} ${styles.phaseGatePanel}`} variants={fade} initial="hidden" animate="show" transition={tr(0.1)}>
      <div className={styles.phaseGateIcon}><Lock size={14} /></div>
      <div>
        <p className={styles.phaseGateTitle}>Visit {meta.planet} to unlock {meta.title}</p>
        <p className={styles.phaseGateText}>Return to the solar system and travel there with your HDI. This phase opens after arrival.</p>
      </div>
      <button className={styles.phaseGateBtn} onClick={() => onStart(meta.planet)} type="button">
        <Rocket size={13} />
        Start
      </button>
    </motion.section>
  )
}

function genEvents(user, verif = {}, perms = {}) {
  const seed = user?.hdi || 'hdi'
  const base = (user?.createdAt || Date.now()) - 1000 * 60 * 7
  const active = Object.keys(perms).filter(k => perms[k]).join(', ') || '—'
  const evs = [{ type: 'CREATE_HDI', ts: base, hash: mockHash(seed, 0), detail: user?.hdi || '—' }]
  if (verif.email)       evs.push({ type: 'VERIFY_EMAIL',       ts: base + 60000,  hash: mockHash(seed, 1), detail: user?.email })
  if (verif.phone)       evs.push({ type: 'VERIFY_PHONE',       ts: base + 120000, hash: mockHash(seed, 2), detail: '****' + (user?.phone?.replace(/\D/g,'').slice(-4) || '0000') })
  if (verif.govId)       evs.push({ type: 'VERIFY_GOV_ID',      ts: base + 180000, hash: mockHash(seed, 4), detail: 'Government ID' })
  if (verif.employer)    evs.push({ type: 'VERIFY_EMPLOYER',    ts: base + 240000, hash: mockHash(seed, 5), detail: 'Employer' })
  if (verif.university)  evs.push({ type: 'VERIFY_UNIVERSITY',  ts: base + 300000, hash: mockHash(seed, 6), detail: 'University' })
  if (verif.socialTrust) evs.push({ type: 'VERIFY_SOCIAL_TRUST',ts: base + 360000, hash: mockHash(seed, 7), detail: 'Social Trust' })
  evs.push({ type: 'SET_PERMISSIONS', ts: base + 420000, hash: mockHash(seed, 3), detail: active })
  return evs
}

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PERM_META = [
  { id: 'CAN_VIEW',     label: 'View Identity',     trust: 0,   note: 'Always available' },
  { id: 'CAN_VERIFY',   label: 'Verify Claims',     trust: 0,   note: 'Always available' },
  { id: 'CAN_SHARE',    label: 'Share Data',        trust: 300, note: 'Requires trust 300+' },
  { id: 'CAN_TRANSFER', label: 'Transfer Assets',   trust: 500, note: 'Requires trust 500+' },
  { id: 'CAN_RECOVER',  label: 'Initiate Recovery', trust: 0,   note: 'Requires 1+ recovery method', needsRecovery: true },
  { id: 'CAN_CLAIM',    label: 'Make Claims',       trust: 700, note: 'Requires trust 700+' },
]

const VERIF_META = [
  { key: 'email',       label: 'Email',         Icon: Mail,      auto: true  },
  { key: 'phone',       label: 'Phone',         Icon: Phone,     auto: true  },
  { key: 'govId',       label: 'Government ID', Icon: Shield,    auto: false },
  { key: 'employer',    label: 'Employer',      Icon: Briefcase, auto: false },
  { key: 'university',  label: 'University',    Icon: Award,     auto: false },
  { key: 'socialTrust', label: 'Social Trust',  Icon: Users,     auto: false },
]

const REL_TYPES = [
  { type: 'family',       label: 'Family',       Icon: Home      },
  { type: 'friends',      label: 'Friends',      Icon: Heart     },
  { type: 'professional', label: 'Professional', Icon: Briefcase },
  { type: 'clients',      label: 'Clients',      Icon: Users     },
]

const ASSET_TYPES = [
  { type: 'wallets',     label: 'Wallets',     Icon: Link,     field: 'address', placeholder: '0x1a2b3c…' },
  { type: 'domains',     label: 'Domains',     Icon: Globe,    field: 'name',    placeholder: 'yourdomain.com' },
  { type: 'credentials', label: 'Credentials', Icon: Award,    field: 'name',    placeholder: 'AWS Certified…' },
  { type: 'documents',   label: 'Documents',   Icon: FileText, field: 'title',   placeholder: 'Aadhaar, PAN…' },
]

const DISC_META = [
  { key: 'name',       label: 'Display Name',      alwaysOn: true },
  { key: 'email',      label: 'Email Address',     alwaysOn: false },
  { key: 'phone',      label: 'Phone Number',      alwaysOn: false },
  { key: 'employer',   label: 'Employer Info',     alwaysOn: false },
  { key: 'university', label: 'University',        alwaysOn: false },
]

const TRUST_MARKS  = [20, 40, 60, 80]
const TRUST_LABELS = ['Unverified', 'Emerging', 'Established', 'Trusted', 'Sovereign']
const NAV = [
  { id: 'p1', label: 'Identity'    },
  { id: 'p2', label: 'Verify'      },
  { id: 'p3', label: 'Permissions' },
  { id: 'p4', label: 'Recovery'    },
  { id: 'p5', label: 'Connections' },
  { id: 'p6', label: 'Assets'      },
  { id: 'p7', label: 'Sovereign'   },
]

const PHASE_UNLOCKS = {
  p2: { planet: 'Mercury', title: 'Signal Relay' },
  p3: { planet: 'Venus', title: 'Consent Layer' },
  p4: { planet: 'Mars', title: 'Recovery Vault' },
  p5: { planet: 'Jupiter', title: 'Trust Graph' },
  p6: { planet: 'Saturn', title: 'Asset Rings' },
  p7: { planet: 'Uranus', title: 'Privacy Tilt' },
}

const slideIn = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit:    { opacity: 0, height: 0 },
  transition: { duration: 0.22, ease: 'easeInOut' },
}
const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
const tr   = (d) => ({ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: d })

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function HDIPage() {
  const currentPage        = useEarthStore(s => s.currentPage)
  const setCurrentPage     = useEarthStore(s => s.setCurrentPage)
  const setCurrentNationId = useEarthStore(s => s.setCurrentNationId)
  const setAppStage        = useEarthStore(s => s.setAppStage)
  const setSceneBg         = useEarthStore(s => s.setSceneBg)
  const startTravel        = useTravelStore(s => s.startTravel)
  const isLoggedIn         = useAuthStore(s => s.isLoggedIn)
  const user               = useAuthStore(s => s.user)
  const nations            = useNationStore(s => s.nations)
  const verifications  = useAuthStore(s => s.verifications)
  const permissions    = useAuthStore(s => s.permissions)
  const recovery       = useAuthStore(s => s.recovery)
  const relationships  = useAuthStore(s => s.relationships)
  const assets         = useAuthStore(s => s.assets)
  const disclosure     = useAuthStore(s => s.disclosure)
  const orbitHistory   = useAuthStore(s => s.orbitHistory)

  const syncVerifications  = useAuthStore(s => s.syncVerifications)
  const addVerification    = useAuthStore(s => s.addVerification)
  const togglePermission   = useAuthStore(s => s.togglePermission)
  const setRecovery        = useAuthStore(s => s.setRecovery)
  const clearRecovery      = useAuthStore(s => s.clearRecovery)
  const addRelationship    = useAuthStore(s => s.addRelationship)
  const removeRelationship = useAuthStore(s => s.removeRelationship)
  const addAsset           = useAuthStore(s => s.addAsset)
  const removeAsset        = useAuthStore(s => s.removeAsset)
  const toggleDisclosure   = useAuthStore(s => s.toggleDisclosure)
  const recordVisit        = useAuthStore(s => s.recordVisit)

  /* sync on mount for pre-existing sessions */
  useEffect(() => { if (isLoggedIn) syncVerifications() }, [isLoggedIn])

  /* redirect if user logs out while HDI page is open */
  useEffect(() => { if (!isLoggedIn && currentPage === 'hdi') setCurrentPage(null) }, [isLoggedIn, currentPage])

  /* ── local UI state ── */
  const [copied,         setCopied]         = useState(false)
  const [loading,        setLoading]        = useState(null)
  const [permMsg,        setPermMsg]        = useState(null)
  const [activeVerify,   setActiveVerify]   = useState(null)
  const [activeRecovery, setActiveRecovery] = useState(null)
  const [activeRelType,  setActiveRelType]  = useState(null)
  const [activeAssetType,setActiveAssetType]= useState(null)
  const [eventNow,       setEventNow]       = useState(0)

  useEffect(() => {
    const tick = () => setEventNow(Date.now())
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  /* form data */
  const [vForm, setVForm] = useState({ idType: 'Passport', idNumber: '', company: '', empId: '', university: '', year: '' })
  const [rForm, setRForm] = useState({ guardianName: '', guardianContact: '', timelockDays: '90', multisigRequired: '2', s1: '', s2: '', s3: '' })
  const [relForm, setRelForm] = useState({ name: '', hdi: '', notes: '' })
  const [assetForm, setAssetForm] = useState({ value: '', label: '', issuer: '', date: '', docType: 'Legal' })

  /* ── derived ── */
  const myNations = useMemo(() => {
    if (!user?.hdi) return []
    return nations.filter(n => n.status === 'active' && n.citizen_hids.includes(user.hdi))
  }, [nations, user?.hdi])

  const trustScore    = useMemo(() => computeTrustScore(verifications, relationships, assets, recovery), [verifications, relationships, assets, recovery])
  const verifiedCount = useMemo(() => Object.values(verifications).filter(Boolean).length, [verifications])
  const recCount      = useMemo(() => Object.values(recovery).filter(Boolean).length, [recovery])
  const totalAssets   = useMemo(() => Object.values(assets).reduce((s, a) => s + (a?.length || 0), 0), [assets])
  const familyConns   = useMemo(() => relationships.filter(r => r.type === 'family'), [relationships])
  const canSocTrust   = relationships.length >= 3
  const visitedPlanets = useMemo(() => new Set(orbitHistory.map(v => v.planet)), [orbitHistory])
  const unlocked = useMemo(() => ({
    p1: true,
    p2: visitedPlanets.has('Mercury') || verifiedCount > 2,
    p3: visitedPlanets.has('Venus') || Object.values(permissions).filter(Boolean).length > 2,
    p4: visitedPlanets.has('Mars') || recCount > 0,
    p5: visitedPlanets.has('Jupiter') || relationships.length > 0,
    p6: visitedPlanets.has('Saturn') || totalAssets > 0,
    p7: visitedPlanets.has('Uranus') || visitedPlanets.has('Neptune'),
  }), [visitedPlanets, verifiedCount, permissions, recCount, relationships.length, totalAssets])

  const initials = useMemo(() => {
    if (!user?.name) return '?'
    const p = user.name.trim().split(/\s+/)
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase()
  }, [user])

  const displayHdi = user?.hdi || `@${(user?.name || 'user').split(' ')[0].toLowerCase()}`
  const mockKey    = useMemo(() => mockHash(displayHdi, 99) + mockHash(displayHdi, 42), [displayHdi])
  const events     = useMemo(() => genEvents(user, verifications, permissions), [user, verifications, permissions])

  /* ── handlers ── */
  function copyHdi() {
    navigator.clipboard?.writeText(displayHdi).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  function scrollTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  function startPhaseTravel(planet) {
    setAppStage('explore')
    setSceneBg('off')
    recordVisit(planet)
    setCurrentPage(null)
    startTravel(planet)
  }

  function openRelType(type) {
    setActiveRelType((active) => {
      const next = active === type ? null : type
      if (next !== active) setRelForm({ name: '', hdi: '', notes: '' })
      return next
    })
  }

  function openAssetType(type) {
    setActiveAssetType((active) => {
      const next = active === type ? null : type
      if (next !== active) setAssetForm({ value: '', label: '', issuer: '', date: '', docType: 'Legal' })
      return next
    })
  }

  async function handleVerify(key) {
    setLoading(`verify_${key}`)
    await new Promise(r => setTimeout(r, 1500))
    addVerification(key)
    setLoading(null); setActiveVerify(null)
    setVForm({ idType: 'Passport', idNumber: '', company: '', empId: '', university: '', year: '' })
  }

  function handlePermToggle(meta) {
    if (meta.trust > trustScore) {
      setPermMsg(`${meta.note} — current score: ${trustScore}`); setTimeout(() => setPermMsg(null), 2800); return
    }
    if (meta.needsRecovery && !recCount) {
      setPermMsg('Requires at least one recovery method configured.'); setTimeout(() => setPermMsg(null), 2800); return
    }
    togglePermission(meta.id)
  }

  async function handleRecoverySave(type) {
    setLoading(`rec_${type}`)
    await new Promise(r => setTimeout(r, 1000))
    let data
    if (type === 'guardian') data = { name: rForm.guardianName.trim(), contact: rForm.guardianContact.trim() }
    if (type === 'family')   data = true
    if (type === 'timelock') data = { days: parseInt(rForm.timelockDays) }
    if (type === 'multisig') data = { required: parseInt(rForm.multisigRequired), signers: [rForm.s1, rForm.s2, rForm.s3].filter(Boolean) }
    setRecovery(type, data)
    setLoading(null); setActiveRecovery(null)
    setRForm({ guardianName: '', guardianContact: '', timelockDays: '90', multisigRequired: '2', s1: '', s2: '', s3: '' })
  }

  function handleAddRelationship(type) {
    if (!relForm.name.trim()) return
    let hdi = relForm.hdi.trim()
    if (hdi && !hdi.startsWith('@')) hdi = '@' + hdi
    addRelationship({ type, name: relForm.name.trim(), hdi, notes: relForm.notes.trim() })
    setRelForm({ name: '', hdi: '', notes: '' })
  }

  function handleAddAsset(type, field) {
    if (!assetForm.value.trim()) return
    const data = { [field]: assetForm.value.trim(), label: assetForm.label.trim(), issuer: assetForm.issuer.trim(), date: assetForm.date, docType: assetForm.docType }
    addAsset(type, data)
    setAssetForm({ value: '', label: '', issuer: '', date: '', docType: 'Legal' })
  }

  function exportIdentity() {
    const data = {
      hdi: displayHdi, name: user?.name, protocol: 'HDI v0.1-alpha',
      exportedAt: new Date().toISOString(),
      trustScore, trustTier: trustLabel(trustScore),
      verifications: Object.keys(verifications).filter(k => verifications[k]),
      activePermissions: Object.keys(permissions).filter(k => permissions[k]),
      recoveryMethods: recCount, relationships: relationships.length, assets: totalAssets,
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
      download: `${displayHdi}-identity.json`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  /* ── re-used form helpers ── */
  const inp = (val, onChange, placeholder, type = 'text') => (
    <input className={styles.fInput} type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  )

  return (
    <AnimatePresence>
      {currentPage === 'hdi' && isLoggedIn && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 80 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          role="main" aria-label="HDI Profile"
        >
          <button className={styles.backBtn} onClick={() => setCurrentPage(null)} aria-label="Back">
            <X size={13} /><span>Solar System</span>
          </button>

          <div className={styles.inner}>

            {/* ══ HERO ══ */}
            <motion.header className={styles.hero} variants={fade} initial="hidden" animate="show" transition={tr(0.05)}>
              <p className={styles.eyebrow}>ACT 3 · EXPLORATION · HUMAN DIGITAL IDENTITY PROTOCOL v0.1</p>
              <div className={styles.heroRow}>
                <div className={styles.avatar} aria-hidden="true">
                  <span className={styles.avatarText}>{initials}</span>
                </div>
                <h1 className={styles.hdiTag}>{displayHdi}</h1>
                <span className={styles.activeBadge}>
                  <span className={styles.activeDot} aria-hidden="true" />ACTIVE
                </span>
                <button className={`${styles.copyBtn} ${copied ? styles.copyDone : ''}`} onClick={copyHdi}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className={styles.statsBar}>
                {[
                  { v: trustScore,       k: 'Trust Score'      },
                  { v: events.length,    k: 'Events'           },
                  { v: `${verifiedCount}/6`, k: 'Verified Sources' },
                  { v: `${Object.values(permissions).filter(Boolean).length}/6`, k: 'Permissions' },
                ].map(({ v, k }, i, arr) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <div className={styles.stat}>
                      <span className={styles.statVal}>{v}</span>
                      <span className={styles.statKey}>{k}</span>
                    </div>
                    {i < arr.length - 1 && <div className={styles.statDiv} />}
                  </div>
                ))}
              </div>

              <div className={styles.trustBarWrap} title={`${trustScore}/1000 — ${trustLabel(trustScore)}`}>
                <div className={styles.trustBarFill} style={{ width: `${(trustScore / 1000) * 100}%` }} />
                {TRUST_MARKS.map(p => <span key={p} className={styles.trustMark} style={{ left: `${p}%` }} aria-hidden="true" />)}
              </div>
              <div className={styles.trustTierRow} aria-hidden="true">
                {TRUST_LABELS.map(t => <span key={t}>{t}</span>)}
              </div>
              <div className={styles.protocolJourney}>
                {Object.entries(PHASE_UNLOCKS).map(([phaseId, meta]) => (
                  <span key={phaseId} className={unlocked[phaseId] ? styles.journeyOpen : styles.journeyLocked}>
                    {unlocked[phaseId] ? <Check size={10} /> : <Lock size={10} />}
                    {meta.planet}
                  </span>
                ))}
              </div>
            </motion.header>

            {/* ══ STICKY NAV ══ */}
            <nav className={styles.sectionNav}>
              {NAV.map(({ id, label }) => (
                <button
                  key={id}
                  className={styles.sectionNavBtn}
                  data-locked={!unlocked[id]}
                  onClick={() => unlocked[id] && scrollTo(id)}
                  disabled={!unlocked[id]}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* ══════════════════════════════════════
                PHASE 1 — CORE IDENTITY
            ══════════════════════════════════════ */}
            <PhaseBar num={1} title="Core Identity" status="COMPLETE" type="complete" />
            <div className={styles.grid2} id="p1">

              {/* Identity Record */}
              <motion.section className={styles.panel} variants={fade} initial="hidden" animate="show" transition={tr(0.1)} aria-labelledby="rec-title">
                <p className={styles.panelTitle} id="rec-title"><Fingerprint size={12} />IDENTITY RECORD</p>
                <div className={styles.recordRows}>
                  {[
                    { k: 'HDI',      v: user?.hdi || '—',     mono: true },
                    { k: 'Name',     v: user?.name || '—',    mono: false },
                    { k: 'Email',    v: user?.email || '—',   mono: false },
                    { k: 'Pub Key',  v: mockKey,              mono: true,  dim: true },
                    { k: 'Protocol', v: 'HDI v0.1-alpha',     mono: true },
                  ].map(({ k, v, mono, dim }) => (
                    <div key={k} className={styles.recordRow}>
                      <span className={styles.rKey}>{k}</span>
                      <span className={`${styles.rVal} ${mono ? styles.mono : ''} ${dim ? styles.dim : ''}`}>{v}</span>
                    </div>
                  ))}
                  {user?.phone && (
                    <div className={styles.recordRow}>
                      <span className={styles.rKey}>Phone</span>
                      <span className={`${styles.rVal} ${styles.mono}`}>****{user.phone.replace(/\D/g,'').slice(-4)}</span>
                    </div>
                  )}
                  <div className={styles.recordRow}>
                    <span className={styles.rKey}>Status</span>
                    <span className={styles.statusActive}><CheckCircle size={11} />Active</span>
                  </div>
                </div>
              </motion.section>

              {/* Event Chain */}
              <motion.section className={styles.panel} variants={fade} initial="hidden" animate="show" transition={tr(0.15)} aria-labelledby="ev-title">
                <p className={styles.panelTitle} id="ev-title">
                  <Hash size={12} />EVENT CHAIN<span className={styles.tagBlue}>IMMUTABLE</span>
                </p>
                <ol className={styles.timeline}>
                  {events.map((ev, i) => (
                    <li key={ev.hash} className={styles.event}>
                      <span className={styles.eventDot} />
                      {i < events.length - 1 && <span className={styles.eventLine} />}
                      <div className={styles.eventBody}>
                        <span className={styles.eventType}>{ev.type}</span>
                        <span className={`${styles.eventHash} ${styles.mono}`}>{ev.hash}</span>
                        <span className={styles.eventMeta}>
                          <Clock size={9} />{eventNow ? relTime(eventNow - ev.ts) : 'now'}
                          <span className={styles.dot}>·</span>
                          <span className={styles.eventDetail}>{ev.detail}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className={styles.appendNote}><Key size={9} />Append-only · no edits possible</p>
              </motion.section>

            </div>

            {/* ══════════════════════════════════════
                PHASE 2 — VERIFICATION
            ══════════════════════════════════════ */}
            <PhaseBar
              num={2} title="Verification Sources"
              status={unlocked.p2 ? `${verifiedCount}/6 VERIFIED` : 'LOCKED'}
              type={!unlocked.p2 ? 'empty' : verifiedCount === 6 ? 'complete' : verifiedCount > 0 ? 'partial' : 'empty'}
            />
            {unlocked.p2 ? (
            <motion.section className={styles.panel} id="p2" variants={fade} initial="hidden" animate="show" transition={tr(0.1)}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}><Shield size={12} />VERIFICATION SOURCES</p>
                <span className={styles.tagAmber}>PHASE 2</span>
              </div>

              <div className={styles.verifyGrid}>
                {VERIF_META.map(({ key, label, Icon }) => {
                  const done = Boolean(verifications[key])
                  const active = activeVerify === key
                  return (
                    <button
                      key={key}
                      className={`${styles.verifyChip} ${done ? styles.verifyDone : ''} ${active ? styles.verifyActive : ''} ${key === 'socialTrust' && !canSocTrust && !done ? styles.verifyLocked : ''}`}
                      onClick={() => !done && setActiveVerify(active ? null : key)}
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                      {done
                        ? <CheckCircle size={12} className={styles.checkIco} />
                        : <Plus        size={12} className={styles.plusIco}  />
                      }
                    </button>
                  )
                })}
              </div>

              {/* Inline verification forms */}
              <AnimatePresence>
                {activeVerify && !verifications[activeVerify] && (
                  <motion.div key={activeVerify} {...slideIn} style={{ overflow: 'hidden' }}>
                    <div className={styles.verifyForm}>
                      {activeVerify === 'govId' && (
                        <>
                          <div className={styles.fRow}>
                            <div className={styles.fField}>
                              <label className={styles.fLabel}>ID Type</label>
                              <select className={styles.fInput} value={vForm.idType} onChange={e => setVForm(v => ({ ...v, idType: e.target.value }))}>
                                {['Passport','Aadhaar','Driving License','PAN Card','Voter ID'].map(t => <option key={t}>{t}</option>)}
                              </select>
                            </div>
                            <div className={styles.fField}>
                              <label className={styles.fLabel}>ID Number</label>
                              {inp(vForm.idNumber, v => setVForm(f => ({ ...f, idNumber: v })), 'XXXX-XXXX-XXXX')}
                            </div>
                          </div>
                        </>
                      )}
                      {activeVerify === 'employer' && (
                        <div className={styles.fRow}>
                          <div className={styles.fField}>
                            <label className={styles.fLabel}>Company Name</label>
                            {inp(vForm.company, v => setVForm(f => ({ ...f, company: v })), 'Acme Corp')}
                          </div>
                          <div className={styles.fField}>
                            <label className={styles.fLabel}>Employee ID</label>
                            {inp(vForm.empId, v => setVForm(f => ({ ...f, empId: v })), 'EMP-001')}
                          </div>
                        </div>
                      )}
                      {activeVerify === 'university' && (
                        <div className={styles.fRow}>
                          <div className={styles.fField}>
                            <label className={styles.fLabel}>University Name</label>
                            {inp(vForm.university, v => setVForm(f => ({ ...f, university: v })), 'IIT Delhi')}
                          </div>
                          <div className={styles.fField}>
                            <label className={styles.fLabel}>Graduation Year</label>
                            {inp(vForm.year, v => setVForm(f => ({ ...f, year: v })), '2022', 'number')}
                          </div>
                        </div>
                      )}
                      {activeVerify === 'socialTrust' && (
                        !canSocTrust
                          ? <p className={styles.verifyGate}><AlertTriangle size={12} />Requires 3+ verified connections. Current: {relationships.length}/3. Add connections in Phase 5 first.</p>
                          : <p className={styles.verifyNote}>Vouching will be requested from your {relationships.length} connections. This confirms your identity through social consensus.</p>
                      )}

                      <div className={styles.fActions}>
                        <button className={styles.fCancelBtn} onClick={() => setActiveVerify(null)}>Cancel</button>
                        <button
                          className={styles.fSubmitBtn}
                          onClick={() => handleVerify(activeVerify)}
                          disabled={loading === `verify_${activeVerify}` || (activeVerify === 'socialTrust' && !canSocTrust)}
                        >
                          {loading === `verify_${activeVerify}` ? <Spinner /> : 'Verify →'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className={styles.verifyNote}>Each verified source increases your trust score and unlocks new permissions.</p>
            </motion.section>
            ) : <div id="p2"><PhaseGate phaseId="p2" onStart={startPhaseTravel} /></div>}

            {/* ══════════════════════════════════════
                PHASE 3 — PERMISSIONS
            ══════════════════════════════════════ */}
            <PhaseBar
              num={3} title="Permission Engine"
              status={unlocked.p3 ? `${Object.values(permissions).filter(Boolean).length}/6 ACTIVE` : 'LOCKED'}
              type={!unlocked.p3 ? 'empty' : Object.values(permissions).every(Boolean) ? 'complete' : 'partial'}
            />
            {unlocked.p3 ? (
            <motion.section className={styles.panel} id="p3" variants={fade} initial="hidden" animate="show" transition={tr(0.1)}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}><Lock size={12} />PERMISSION ENGINE</p>
                <span className={styles.tagAmber}>PHASE 3</span>
              </div>

              <div className={styles.permList}>
                {PERM_META.map(meta => {
                  const on      = Boolean(permissions[meta.id])
                  const canEnable = meta.trust <= trustScore && (!meta.needsRecovery || recCount > 0)
                  const locked  = !on && !canEnable
                  return (
                    <div key={meta.id} className={`${styles.permRow} ${on ? styles.permActive : ''} ${locked ? styles.permLocked : ''}`}>
                      {on
                        ? <CheckCircle size={12} className={styles.permCheck} />
                        : <Lock        size={12} className={styles.permLockIco} />
                      }
                      <span className={styles.permId}>{meta.id}</span>
                      <span className={styles.permLabel}>{meta.label}</span>
                      {locked && <span className={styles.permGate}>{meta.note}</span>}
                      <Toggle on={on} onChange={() => handlePermToggle(meta)} disabled={locked} />
                    </div>
                  )
                })}
              </div>

              <AnimatePresence>
                {permMsg && (
                  <motion.p className={styles.permMsg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AlertTriangle size={12} />{permMsg}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.section>
            ) : <div id="p3"><PhaseGate phaseId="p3" onStart={startPhaseTravel} /></div>}

            {/* ══════════════════════════════════════
                PHASE 4 — RECOVERY
            ══════════════════════════════════════ */}
            <PhaseBar
              num={4} title="Recovery Protocol"
              status={unlocked.p4 ? (recCount === 0 ? 'NOT CONFIGURED' : `${recCount}/4 CONFIGURED`) : 'LOCKED'}
              type={!unlocked.p4 ? 'empty' : recCount === 0 ? 'empty' : recCount >= 2 ? 'complete' : 'partial'}
            />
            {unlocked.p4 ? (
            <motion.section className={`${styles.panel} ${styles.recoveryPanel}`} id="p4" variants={fade} initial="hidden" animate="show" transition={tr(0.1)}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}><RefreshCw size={12} />RECOVERY PROTOCOL</p>
                <span className={styles.tagAmber}>PHASE 4 — CRITICAL</span>
              </div>

              {recCount === 0 && (
                <div className={styles.recoveryAlert} role="alert">
                  <AlertTriangle size={14} />
                  <span>No recovery method configured. Without one, your identity cannot be restored if access is lost.</span>
                </div>
              )}

              <div className={styles.recoveryGrid}>

                {/* Guardian Recovery */}
                {(() => {
                  const cfg = recovery.guardian
                  const active = activeRecovery === 'guardian'
                  return (
                    <div className={`${styles.recoveryCard} ${cfg ? styles.recoveryConfigured : ''}`}>
                      <div className={styles.recoveryCardHead} onClick={() => setActiveRecovery(active ? null : 'guardian')}>
                        <div>
                          <p className={styles.recLabel}>Guardian Recovery</p>
                          {cfg
                            ? <p className={styles.recConfigured}><CheckCircle size={10} />{cfg.name} · {cfg.contact}</p>
                            : <p className={styles.recDesc}>Assign a trusted person who can restore access.</p>
                          }
                        </div>
                        <div className={styles.recRight}>
                          {cfg ? <span className={styles.recDone}>ACTIVE</span> : <span className={styles.recCta}>SET UP</span>}
                          {active ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {active && (
                          <motion.div {...slideIn} style={{ overflow: 'hidden' }}>
                            <div className={styles.recForm}>
                              <div className={styles.fRow}>
                                <div className={styles.fField}>
                                  <label className={styles.fLabel}>Guardian Name</label>
                                  {inp(rForm.guardianName, v => setRForm(f => ({ ...f, guardianName: v })), 'Full name')}
                                </div>
                                <div className={styles.fField}>
                                  <label className={styles.fLabel}>Contact (email / phone)</label>
                                  {inp(rForm.guardianContact, v => setRForm(f => ({ ...f, guardianContact: v })), 'guardian@email.com')}
                                </div>
                              </div>
                              <div className={styles.fActions}>
                                {cfg && <button className={styles.fClearBtn} onClick={() => { clearRecovery('guardian'); setActiveRecovery(null) }}>Clear</button>}
                                <button className={styles.fCancelBtn} onClick={() => setActiveRecovery(null)}>Cancel</button>
                                <button className={styles.fSubmitBtn} onClick={() => handleRecoverySave('guardian')} disabled={!rForm.guardianName || !rForm.guardianContact || loading === 'rec_guardian'}>
                                  {loading === 'rec_guardian' ? <Spinner /> : 'Save Guardian →'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })()}

                {/* Family Recovery */}
                {(() => {
                  const cfg = recovery.family
                  const active = activeRecovery === 'family'
                  return (
                    <div className={`${styles.recoveryCard} ${cfg ? styles.recoveryConfigured : ''}`}>
                      <div className={styles.recoveryCardHead} onClick={() => setActiveRecovery(active ? null : 'family')}>
                        <div>
                          <p className={styles.recLabel}>Family Recovery</p>
                          {cfg
                            ? <p className={styles.recConfigured}><CheckCircle size={10} />{familyConns.length} family trustees active</p>
                            : <p className={styles.recDesc}>Recover using your family network.</p>
                          }
                        </div>
                        <div className={styles.recRight}>
                          {cfg ? <span className={styles.recDone}>ACTIVE</span> : <span className={styles.recCta}>SET UP</span>}
                          {active ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {active && (
                          <motion.div {...slideIn} style={{ overflow: 'hidden' }}>
                            <div className={styles.recForm}>
                              {familyConns.length === 0
                                ? <p className={styles.verifyGate}><AlertTriangle size={12} />No family connections yet. Add family members in Phase 5 first.</p>
                                : (
                                  <>
                                    <p className={styles.fLabel}>Family trustees ({familyConns.length})</p>
                                    <div className={styles.recFamilyList}>
                                      {familyConns.map(f => (
                                        <div key={f.id} className={styles.recFamilyItem}>
                                          <span>{f.name}</span>
                                          {f.hdi && <span className={styles.recFamilyHdi}>{f.hdi}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )
                              }
                              <div className={styles.fActions}>
                                {cfg && <button className={styles.fClearBtn} onClick={() => { clearRecovery('family'); setActiveRecovery(null) }}>Clear</button>}
                                <button className={styles.fCancelBtn} onClick={() => setActiveRecovery(null)}>Cancel</button>
                                <button className={styles.fSubmitBtn} onClick={() => handleRecoverySave('family')} disabled={familyConns.length === 0 || loading === 'rec_family'}>
                                  {loading === 'rec_family' ? <Spinner /> : 'Enable Family Recovery →'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })()}

                {/* Time-Lock Recovery */}
                {(() => {
                  const cfg = recovery.timelock
                  const active = activeRecovery === 'timelock'
                  return (
                    <div className={`${styles.recoveryCard} ${cfg ? styles.recoveryConfigured : ''}`}>
                      <div className={styles.recoveryCardHead} onClick={() => setActiveRecovery(active ? null : 'timelock')}>
                        <div>
                          <p className={styles.recLabel}>Time-Lock Recovery</p>
                          {cfg
                            ? <p className={styles.recConfigured}><CheckCircle size={10} />{cfg.days}-day lock active</p>
                            : <p className={styles.recDesc}>Auto-recover after a waiting period.</p>
                          }
                        </div>
                        <div className={styles.recRight}>
                          {cfg ? <span className={styles.recDone}>ACTIVE</span> : <span className={styles.recCta}>SET UP</span>}
                          {active ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {active && (
                          <motion.div {...slideIn} style={{ overflow: 'hidden' }}>
                            <div className={styles.recForm}>
                              <p className={styles.fLabel}>Recovery delay period</p>
                              <div className={styles.timelockOptions}>
                                {['30','90','180','365'].map(d => (
                                  <label key={d} className={`${styles.timelockOpt} ${rForm.timelockDays === d ? styles.timelockOptActive : ''}`}>
                                    <input type="radio" name="tl" value={d} checked={rForm.timelockDays === d} onChange={() => setRForm(f => ({ ...f, timelockDays: d }))} />
                                    {d} days
                                  </label>
                                ))}
                              </div>
                              <div className={styles.fActions}>
                                {cfg && <button className={styles.fClearBtn} onClick={() => { clearRecovery('timelock'); setActiveRecovery(null) }}>Clear</button>}
                                <button className={styles.fCancelBtn} onClick={() => setActiveRecovery(null)}>Cancel</button>
                                <button className={styles.fSubmitBtn} onClick={() => handleRecoverySave('timelock')} disabled={loading === 'rec_timelock'}>
                                  {loading === 'rec_timelock' ? <Spinner /> : 'Set Time-Lock →'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })()}

                {/* Multi-Signature */}
                {(() => {
                  const cfg = recovery.multisig
                  const active = activeRecovery === 'multisig'
                  return (
                    <div className={`${styles.recoveryCard} ${cfg ? styles.recoveryConfigured : ''}`}>
                      <div className={styles.recoveryCardHead} onClick={() => setActiveRecovery(active ? null : 'multisig')}>
                        <div>
                          <p className={styles.recLabel}>Multi-Signature</p>
                          {cfg
                            ? <p className={styles.recConfigured}><CheckCircle size={10} />{cfg.required}-of-{cfg.signers?.length || cfg.required} multisig active</p>
                            : <p className={styles.recDesc}>Require multiple key-holders to approve.</p>
                          }
                        </div>
                        <div className={styles.recRight}>
                          {cfg ? <span className={styles.recDone}>ACTIVE</span> : <span className={styles.recCta}>SET UP</span>}
                          {active ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {active && (
                          <motion.div {...slideIn} style={{ overflow: 'hidden' }}>
                            <div className={styles.recForm}>
                              <div className={styles.fRow}>
                                <div className={styles.fField}>
                                  <label className={styles.fLabel}>Required approvals</label>
                                  <select className={styles.fInput} value={rForm.multisigRequired} onChange={e => setRForm(f => ({ ...f, multisigRequired: e.target.value }))}>
                                    {['2','3','5'].map(n => <option key={n}>{n}</option>)}
                                  </select>
                                </div>
                              </div>
                              {[['s1','Signer 1'],['s2','Signer 2'],['s3','Signer 3 (optional)']].map(([k, ph]) => (
                                <div key={k} className={styles.fField}>
                                  <label className={styles.fLabel}>{ph}</label>
                                  {inp(rForm[k], v => setRForm(f => ({ ...f, [k]: v })), 'email or HDI')}
                                </div>
                              ))}
                              <div className={styles.fActions}>
                                {cfg && <button className={styles.fClearBtn} onClick={() => { clearRecovery('multisig'); setActiveRecovery(null) }}>Clear</button>}
                                <button className={styles.fCancelBtn} onClick={() => setActiveRecovery(null)}>Cancel</button>
                                <button className={styles.fSubmitBtn} onClick={() => handleRecoverySave('multisig')} disabled={!rForm.s1 || !rForm.s2 || loading === 'rec_multisig'}>
                                  {loading === 'rec_multisig' ? <Spinner /> : 'Save Multi-Sig →'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })()}

              </div>
            </motion.section>
            ) : <div id="p4"><PhaseGate phaseId="p4" onStart={startPhaseTravel} /></div>}

            {/* ══════════════════════════════════════
                PHASE 5 — RELATIONSHIPS
            ══════════════════════════════════════ */}
            <PhaseBar
              num={5} title="Relationship Graph"
              status={unlocked.p5 ? (relationships.length === 0 ? 'EMPTY' : `${relationships.length} CONNECTIONS`) : 'LOCKED'}
              type={!unlocked.p5 ? 'empty' : relationships.length >= 5 ? 'complete' : relationships.length > 0 ? 'partial' : 'empty'}
            />
            {unlocked.p5 ? (
            <motion.section className={styles.panel} id="p5" variants={fade} initial="hidden" animate="show" transition={tr(0.1)}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}><Users size={12} />RELATIONSHIP GRAPH</p>
                <span className={styles.tagAmber}>PHASE 5</span>
              </div>

              <div className={styles.relTypeGrid}>
                {REL_TYPES.map(({ type, label, Icon }) => {
                  const conns  = relationships.filter(r => r.type === type)
                  const active = activeRelType === type
                  return (
                    <div key={type} className={`${styles.relTypeCard} ${active ? styles.relTypeCardOpen : ''}`}>
                      <button className={styles.relTypeHead} onClick={() => openRelType(type)}>
                        <Icon size={15} className={styles.relTypeIcon} />
                        <span className={styles.relTypeName}>{label}</span>
                        <span className={styles.relTypeCnt}>{conns.length}</span>
                        {active ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      <AnimatePresence>
                        {active && (
                          <motion.div {...slideIn} style={{ overflow: 'hidden' }}>
                            <div className={styles.relForm}>
                              <div className={styles.fRow}>
                                <div className={styles.fField}>
                                  <label className={styles.fLabel}>Full Name *</label>
                                  {inp(relForm.name, v => setRelForm(f => ({ ...f, name: v })), 'Amit Kumar')}
                                </div>
                                <div className={styles.fField}>
                                  <label className={styles.fLabel}>HDI (optional)</label>
                                  {inp(relForm.hdi, v => setRelForm(f => ({ ...f, hdi: v })), '@amit.k.3210')}
                                </div>
                              </div>
                              <div className={styles.fField}>
                                <label className={styles.fLabel}>Notes (optional)</label>
                                {inp(relForm.notes, v => setRelForm(f => ({ ...f, notes: v })), 'Close friend since 2018')}
                              </div>
                              <button className={styles.fSubmitBtn} onClick={() => handleAddRelationship(type)} disabled={!relForm.name.trim()}>
                                <Plus size={13} /> Add to Network
                              </button>
                            </div>

                            {conns.length > 0 && (
                              <div className={styles.relList}>
                                {conns.map(c => (
                                  <div key={c.id} className={styles.relItem}>
                                    <div className={styles.relItemAvatar}>{c.name[0].toUpperCase()}</div>
                                    <div className={styles.relItemInfo}>
                                      <span className={styles.relItemName}>{c.name}</span>
                                      {c.hdi && <span className={styles.relItemHdi}>{c.hdi}</span>}
                                      {c.notes && <span className={styles.relItemNotes}>{c.notes}</span>}
                                    </div>
                                    <button className={styles.relRemoveBtn} onClick={() => removeRelationship(c.id)} aria-label="Remove">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </motion.section>
            ) : <div id="p5"><PhaseGate phaseId="p5" onStart={startPhaseTravel} /></div>}

            {/* ══════════════════════════════════════
                PHASE 6 — DIGITAL ASSETS
            ══════════════════════════════════════ */}
            <PhaseBar
              num={6} title="Digital Asset Ownership"
              status={unlocked.p6 ? (totalAssets === 0 ? 'EMPTY' : `${totalAssets} CONNECTED`) : 'LOCKED'}
              type={!unlocked.p6 ? 'empty' : totalAssets >= 4 ? 'complete' : totalAssets > 0 ? 'partial' : 'empty'}
            />
            {unlocked.p6 ? (
            <motion.section className={styles.panel} id="p6" variants={fade} initial="hidden" animate="show" transition={tr(0.1)}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}><Link size={12} />DIGITAL ASSET OWNERSHIP</p>
                <span className={styles.tagAmber}>PHASE 6</span>
              </div>

              <div className={styles.assetTypeGrid}>
                {ASSET_TYPES.map(({ type, label, Icon, field, placeholder }) => {
                  const items  = assets[type] || []
                  const active = activeAssetType === type
                  return (
                    <div key={type} className={`${styles.assetTypeCard} ${active ? styles.assetTypeCardOpen : ''}`}>
                      <button className={styles.assetTypeHead} onClick={() => openAssetType(type)}>
                        <Icon size={18} className={styles.assetTypeIcon} />
                        <span className={styles.assetTypeName}>{label}</span>
                        <span className={styles.assetTypeCnt}>{items.length}</span>
                        {active ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      <AnimatePresence>
                        {active && (
                          <motion.div {...slideIn} style={{ overflow: 'hidden' }}>
                            <div className={styles.assetForm}>
                              <div className={styles.fField}>
                                <label className={styles.fLabel}>
                                  {type === 'wallets' ? 'Wallet Address' : type === 'domains' ? 'Domain Name' : type === 'credentials' ? 'Credential Name' : 'Document Title'} *
                                </label>
                                {inp(assetForm.value, v => setAssetForm(f => ({ ...f, value: v })), placeholder)}
                              </div>
                              {type === 'wallets' && (
                                <div className={styles.fField}>
                                  <label className={styles.fLabel}>Label (optional)</label>
                                  {inp(assetForm.label, v => setAssetForm(f => ({ ...f, label: v })), 'MetaMask Main')}
                                </div>
                              )}
                              {type === 'credentials' && (
                                <div className={styles.fRow}>
                                  <div className={styles.fField}>
                                    <label className={styles.fLabel}>Issuer</label>
                                    {inp(assetForm.issuer, v => setAssetForm(f => ({ ...f, issuer: v })), 'Amazon Web Services')}
                                  </div>
                                  <div className={styles.fField}>
                                    <label className={styles.fLabel}>Issue Date</label>
                                    {inp(assetForm.date, v => setAssetForm(f => ({ ...f, date: v })), '', 'date')}
                                  </div>
                                </div>
                              )}
                              {type === 'documents' && (
                                <div className={styles.fField}>
                                  <label className={styles.fLabel}>Document Type</label>
                                  <select className={styles.fInput} value={assetForm.docType} onChange={e => setAssetForm(f => ({ ...f, docType: e.target.value }))}>
                                    {['Legal','Medical','Financial','Academic','Government','Other'].map(t => <option key={t}>{t}</option>)}
                                  </select>
                                </div>
                              )}
                              <button className={styles.fSubmitBtn} onClick={() => handleAddAsset(type, field)} disabled={!assetForm.value.trim()}>
                                <Link size={13} /> Connect
                              </button>
                            </div>

                            {items.length > 0 && (
                              <div className={styles.assetList}>
                                {items.map(item => (
                                  <div key={item.id} className={styles.assetItem}>
                                    <div className={styles.assetItemInfo}>
                                      <span className={styles.assetItemVal}>{item[field]}</span>
                                      {item.label && <span className={styles.assetItemSub}>{item.label}</span>}
                                      {item.issuer && <span className={styles.assetItemSub}>{item.issuer}</span>}
                                      {item.docType && <span className={styles.assetItemSub}>{item.docType}</span>}
                                    </div>
                                    <button className={styles.relRemoveBtn} onClick={() => removeAsset(type, item.id)}><Trash2 size={12} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </motion.section>
            ) : <div id="p6"><PhaseGate phaseId="p6" onStart={startPhaseTravel} /></div>}

            {/* ══════════════════════════════════════
                PHASE 7 — SOVEREIGN CONTROL
            ══════════════════════════════════════ */}
            <PhaseBar num={7} title="Sovereign Control" status={unlocked.p7 ? 'ACTIVE' : 'LOCKED'} type={unlocked.p7 ? 'complete' : 'empty'} />

            {unlocked.p7 ? (
            <div className={styles.grid2} id="p7">
              {/* Selective Disclosure */}
              <motion.section className={styles.panel} variants={fade} initial="hidden" animate="show" transition={tr(0.1)}>
                <div className={styles.panelHead}>
                  <p className={styles.panelTitle}><Eye size={12} />SELECTIVE DISCLOSURE</p>
                  <span className={styles.tagBlue}>PHASE 7</span>
                </div>
                <p className={styles.verifyNote}>Control which parts of your identity are publicly visible.</p>
                <div className={styles.discList}>
                  {DISC_META.map(({ key, label, alwaysOn }) => (
                    <div key={key} className={styles.discRow}>
                      <div className={styles.discInfo}>
                        <span className={styles.discLabel}>{label}</span>
                        <span className={styles.discStatus}>{disclosure[key] ? 'Public' : 'Private'}</span>
                      </div>
                      {alwaysOn
                        ? <span className={styles.discAlways}>Always public</span>
                        : <Toggle on={Boolean(disclosure[key])} onChange={() => toggleDisclosure(key)} />
                      }
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Export & Stats */}
              <motion.section className={styles.panel} variants={fade} initial="hidden" animate="show" transition={tr(0.15)}>
                <div className={styles.panelHead}>
                  <p className={styles.panelTitle}><Download size={12} />IDENTITY EXPORT</p>
                  <span className={styles.tagBlue}>PHASE 7</span>
                </div>
                <div className={styles.exportStats}>
                  {[
                    { label: 'Trust Score',       val: trustScore        },
                    { label: 'Trust Tier',         val: trustLabel(trustScore) },
                    { label: 'Verified Sources',   val: `${verifiedCount}/6` },
                    { label: 'Active Permissions', val: `${Object.values(permissions).filter(Boolean).length}/6` },
                    { label: 'Recovery Methods',   val: `${recCount}/4` },
                    { label: 'Connections',        val: relationships.length },
                    { label: 'Linked Assets',      val: totalAssets },
                  ].map(({ label, val }) => (
                    <div key={label} className={styles.exportStatRow}>
                      <span className={styles.exportStatLabel}>{label}</span>
                      <span className={styles.exportStatVal}>{val}</span>
                    </div>
                  ))}
                </div>
                <button className={styles.exportBtn} onClick={exportIdentity}>
                  <Download size={14} />Export Identity JSON
                </button>
              </motion.section>
            </div>
            ) : <div id="p7"><PhaseGate phaseId="p7" onStart={startPhaseTravel} /></div>}

            {/* ══════════════════════════════════════
                NATION PASSPORT
            ══════════════════════════════════════ */}
            <motion.section className={styles.panel} variants={fade} initial="hidden" animate="show" transition={tr(0.18)}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}><Flag size={12} />NATION PASSPORT</p>
                {myNations.length > 0 && <span className={styles.tagAmber}>{myNations.length} NATION{myNations.length > 1 ? 'S' : ''}</span>}
              </div>

              {myNations.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p className={styles.verifyNote}>You have not joined any nations yet.</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className={styles.fSubmitBtn} style={{ flex: 'none', width: 'auto', padding: '0 1rem' }} onClick={() => setCurrentPage('world')}>
                      <Globe size={13} /> Browse Nations
                    </button>
                    <button className={styles.fCancelBtn} onClick={() => { setCurrentPage(null); setAppStage('explore') }}>
                      Claim Territory
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.recordRows}>
                  {myNations.map(n => {
                    const isFounder = n.founder_hid === user?.hdi
                    return (
                      <div key={n.id} className={styles.recordRow} style={{ gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{n.flag}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.rVal} style={{ fontWeight: 600 }}>{n.name}</div>
                          <div className={`${styles.rKey} ${styles.mono}`} style={{ marginTop: '0.1rem' }}>
                            {n.citizen_hids.length} citizens · {n.zones.length} zones · {n.treasury_balance.toLocaleString()} RPC
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                          {isFounder && (
                            <span className={styles.statusActive} style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                              <Flag size={9} />Founder
                            </span>
                          )}
                          <button className={styles.fSubmitBtn} style={{ height: '28px', padding: '0 0.75rem', fontSize: '0.75rem' }}
                            onClick={() => { setCurrentNationId(n.id); setCurrentPage('nation') }}>
                            View
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.section>

            {/* Protocol Constitution */}
            <motion.section className={`${styles.panel} ${styles.principlesPanel}`} variants={fade} initial="hidden" animate="show" transition={tr(0.2)}>
              <p className={styles.panelTitle}><Fingerprint size={12} />HDI PROTOCOL CONSTITUTION</p>
              <ol className={styles.principles}>
                {['Human owns identity','Identity is immutable','History is append-only','Users control permissions','Relationships are programmable','Data sharing is selective','Trust is verifiable','Recovery is decentralized','Protocol over Platform','One human = one HDI'].map((p, i) => (
                  <li key={i} className={styles.principle}>
                    <span className={styles.principleNum}>{String(i + 1).padStart(2, '0')}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </motion.section>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
