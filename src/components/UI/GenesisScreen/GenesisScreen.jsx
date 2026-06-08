import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { User, Phone, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuthStore, generateHDI } from '../../../store/authStore'
import { useEarthStore } from '../../../store/earthStore'
import styles from './GenesisScreen.module.css'

const slide = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -20, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
}

function Field({ id, label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

export default function GenesisScreen() {
  const appStage    = useEarthStore(s => s.appStage)
  const setAppStage = useEarthStore(s => s.setAppStage)
  const setSceneBg  = useEarthStore(s => s.setSceneBg)
  const login       = useAuthStore(s => s.login)

  const [step,     setStep]     = useState('identity')
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [mintedHdi, setMintedHdi] = useState('')

  const liveHdi = useMemo(() => {
    const parts = name.trim().toLowerCase().split(/\s+/)
    const first = (parts[0] || '').replace(/[^a-z]/g, '').slice(0, 6)
    if (!first) return '@____.__.____'
    const lastI = parts[1]
      ? '.' + ((parts[1][0] || '').replace(/[^a-z]/g, '') || '_')
      : '.__'
    const digits = phone.replace(/\D/g, '')
    const last4  = digits.length >= 4 ? digits.slice(-4) : digits.padEnd(4, '_').slice(0, 4)
    return `@${first}${lastI}.${last4}`
  }, [name, phone])

  const hdiReady = !liveHdi.includes('_')

  function goBack() {
    if (step === 'secure') { setStep('identity'); setError('') }
    else { setAppStage('landing'); resetForm() }
  }

  function resetForm() {
    setStep('identity'); setName(''); setPhone(''); setEmail('')
    setPassword(''); setConfirm(''); setError(''); setShowPw(false)
  }

  function handleIdentityNext(e) {
    e.preventDefault()
    if (!name.trim())                          { setError('Enter your full name.'); return }
    if (phone.replace(/\D/g, '').length < 4)  { setError('Enter a valid phone number.'); return }
    setError(''); setStep('secure')
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!email || !password)     { setError('Fill in all fields.'); return }
    if (password !== confirm)    { setError('Passwords do not match.'); return }
    if (password.length < 6)     { setError('Password must be at least 6 characters.'); return }
    setError('')
    const hdi = generateHDI(name, phone, email)
    setMintedHdi(hdi)
    setStep('minting')
    await new Promise(r => setTimeout(r, 1800))
    login({ name, phone, email, hdi, createdAt: Date.now() })
    setStep('complete')
  }

  function handleEnter() {
    setAppStage('explore')
    setSceneBg('glass')
    setTimeout(resetForm, 500)
  }

  if (appStage !== 'genesis') return null

  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.center}>

        {/* Top bar */}
        <div className={styles.topBar}>
          {step !== 'minting' && step !== 'complete' && (
            <button className={styles.backBtn} onClick={goBack}>
              <ArrowLeft size={13} />
              {step === 'secure' ? 'Back' : 'Cancel'}
            </button>
          )}
          <p className={styles.eyebrow}>HUMAN DIGITAL IDENTITY PROTOCOL · v0.1</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Who are you? ── */}
          {step === 'identity' && (
            <motion.div key="identity" className={styles.card} {...slide}>
              <div className={styles.cardHead}>
                <div className={styles.stepOrb} aria-hidden="true">◎</div>
                <h2 className={styles.cardTitle}>Who are you?</h2>
                <p className={styles.cardSub}>Your name and phone create a unique identity handle — permanent, yours forever.</p>
              </div>

              {/* Live HDI preview */}
              <div className={`${styles.hdiPreview} ${hdiReady ? styles.hdiPreviewReady : ''}`}>
                <p className={styles.hdiPreviewLabel}>YOUR IDENTITY HANDLE</p>
                <span className={`${styles.hdiVal} ${hdiReady ? styles.hdiValReady : styles.hdiValPending}`}>
                  {liveHdi}
                </span>
                {hdiReady && <p className={styles.hdiTag}>Unique · Permanent · Sovereign</p>}
              </div>

              <form className={styles.form} onSubmit={handleIdentityNext} noValidate>
                <Field id="g-name" label="Full Name">
                  <div className={styles.inputWrap}>
                    <User size={15} className={styles.inputIcon} />
                    <input id="g-name" className={styles.input} type="text"
                      placeholder="Amit Kumar" autoComplete="name"
                      value={name} onChange={e => setName(e.target.value)} autoFocus />
                  </div>
                </Field>
                <Field id="g-phone" label="Phone Number">
                  <div className={styles.inputWrap}>
                    <Phone size={15} className={styles.inputIcon} />
                    <input id="g-phone" className={styles.input} type="tel"
                      placeholder="+91 98765 43210" autoComplete="tel"
                      value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </Field>
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.submit}
                  disabled={!name.trim() || phone.replace(/\D/g, '').length < 4}>
                  Continue →
                </button>
              </form>

              <p className={styles.footNote}>
                Already have an identity?{' '}
                <button className={styles.footLink} type="button" onClick={() => {
                  resetForm()
                  setAppStage('landing')
                  useAuthStore.getState().openLoginModal()
                }}>
                  Sign in
                </button>
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: Secure it ── */}
          {step === 'secure' && (
            <motion.div key="secure" className={styles.card} {...slide}>
              <div className={styles.cardHead}>
                <div className={styles.stepOrb} aria-hidden="true">⬡</div>
                <h2 className={styles.cardTitle}>Secure your identity</h2>
                <p className={styles.cardSub}>
                  Email and password protect access to{' '}
                  <span className={styles.hdiInline}>{liveHdi}</span>
                </p>
              </div>

              <form className={styles.form} onSubmit={handleCreate} noValidate>
                <Field id="g-email" label="Email">
                  <div className={styles.inputWrap}>
                    <Mail size={15} className={styles.inputIcon} />
                    <input id="g-email" className={styles.input} type="email"
                      placeholder="you@example.com" autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)} autoFocus />
                  </div>
                </Field>
                <Field id="g-pass" label="Password">
                  <div className={styles.inputWrap}>
                    <Lock size={15} className={styles.inputIcon} />
                    <input id="g-pass" className={styles.input}
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••" autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" className={styles.eyeBtn}
                      onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <Field id="g-confirm" label="Confirm Password">
                  <div className={styles.inputWrap}>
                    <Lock size={15} className={styles.inputIcon} />
                    <input id="g-confirm" className={styles.input}
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••" autoComplete="new-password"
                      value={confirm} onChange={e => setConfirm(e.target.value)} />
                  </div>
                </Field>
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.submit}>Create My Identity →</button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 3: Minting ── */}
          {step === 'minting' && (
            <motion.div key="minting" className={styles.mintWrap}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}>
              <div className={styles.mintOrb} aria-hidden="true" />
              <p className={styles.mintLabel}>MINTING IDENTITY</p>
              <p className={styles.mintHdi}>{mintedHdi}</p>
              <p className={styles.mintNote}>Recording to the immutable chain…</p>
            </motion.div>
          )}

          {/* ── STEP 4: Complete ── */}
          {step === 'complete' && (
            <motion.div key="complete" className={styles.doneWrap}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}>
              <p className={styles.doneEyebrow}>✦ IDENTITY CREATED</p>
              <div className={styles.doneHdiCard}>
                <span className={styles.doneHdi}>{mintedHdi}</span>
                <p className={styles.doneHdiSub}>Unique · Permanent · Sovereign</p>
              </div>
              <div className={styles.doneStats}>
                {[
                  { k: 'Genesis Block', v: '0x' + Math.abs(mintedHdi.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)).toString(16).padStart(8, '0').slice(0, 8) },
                  { k: 'Protocol',      v: 'HDI v0.1-alpha' },
                  { k: 'Status',        v: 'ACTIVE' },
                ].map(({ k, v }) => (
                  <div key={k} className={styles.doneStat}>
                    <span className={styles.doneStatKey}>{k}</span>
                    <span className={styles.doneStatVal}>{v}</span>
                  </div>
                ))}
              </div>
              <p className={styles.doneMsg}>
                You now exist in the Digital Universe.<br />
                Your identity travels with you everywhere.
              </p>
              <button className={styles.enterBtn} onClick={handleEnter}>
                Enter Solar System →
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
