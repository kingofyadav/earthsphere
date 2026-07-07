import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import FocusTrap from 'focus-trap-react'
import { useAuthStore } from '../../../store/authStore'
import { useEarthStore } from '../../../store/earthStore'
import styles from './AuthModal.module.css'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
)

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/>
  </svg>
)

export default function AuthModal() {
  const isLoginOpen       = useAuthStore(s => s.isLoginOpen)
  const loginWithPassword = useAuthStore(s => s.loginWithPassword)
  const closeLoginModal   = useAuthStore(s => s.closeLoginModal)
  const resolvedTheme     = useEarthStore(s => s.resolvedTheme)
  const appStage          = useEarthStore(s => s.appStage)
  const setAppStage       = useEarthStore(s => s.setAppStage)
  const setSceneBg        = useEarthStore(s => s.setSceneBg)
  const setCurrentPage    = useEarthStore(s => s.setCurrentPage)

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [socialMsg, setSocialMsg] = useState('')

  const isDark = resolvedTheme !== 'day'

  function closeAndReset() {
    closeLoginModal()
    setTimeout(() => {
      setEmail(''); setPassword(''); setError(''); setShowPw(false); setSocialMsg('')
    }, 300)
  }

  function afterLogin() {
    if (appStage === 'landing' || appStage === 'genesis') {
      setAppStage('explore')
      setSceneBg('glass')
    }
    setCurrentPage(null)
    closeAndReset()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setError(''); setLoading(true)
    const result = await loginWithPassword(email, password)
    setLoading(false)
    if (!result.ok) { setError(result.error || 'Sign in failed.'); return }
    afterLogin()
  }

  function handleSocial() {
    setSocialMsg('Social login coming soon')
    setTimeout(() => setSocialMsg(''), 2200)
  }

  function goToGenesis() {
    closeLoginModal()
    setTimeout(() => setAppStage('genesis'), 250)
  }

  return (
    <AnimatePresence>
      {isLoginOpen && (
        <motion.div
          key="auth-modal"
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={e => { if (e.target === e.currentTarget) closeAndReset() }}
        >
          <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true }}>
            <motion.div
              className={styles.card}
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{ opacity: 0,    y: 16, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              role="dialog" aria-modal="true" aria-label="Sign in"
            >
              <button className={styles.closeBtn} onClick={closeAndReset} aria-label="Close">
                <X size={14} />
              </button>

              <div className={styles.brand}>
                <img src={isDark ? '/logo/night-logo.png' : '/logo/day-logo.png'}
                  alt="logo" className={styles.brandLogo} width="34" height="34" />
                <div className={styles.brandText}>
                  <span className={styles.brandName}>Digital World</span>
                  <span className={styles.brandTagline}>zerosoils</span>
                </div>
              </div>

              <div className={styles.formWrap}>
                <div className={styles.social}>
                  <button type="button" className={styles.socialBtn} onClick={handleSocial}>
                    <GoogleIcon /><span>Google</span>
                  </button>
                  <button type="button" className={styles.socialBtn} onClick={handleSocial}>
                    <GithubIcon /><span>GitHub</span>
                  </button>
                </div>

                <AnimatePresence>
                  {socialMsg && (
                    <motion.p className={styles.socialNote}
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}>
                      {socialMsg}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className={styles.divider}>
                  <span className={styles.dividerLine} />
                  <span className={styles.dividerText}>or email</span>
                  <span className={styles.dividerLine} />
                </div>

                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="si-email">Email</label>
                    <div className={styles.inputWrap}>
                      <Mail size={15} className={styles.inputIcon} />
                      <input id="si-email" className={styles.input} type="email"
                        placeholder="you@example.com" autoComplete="email" autoFocus
                        value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="si-pass">Password</label>
                    <div className={styles.inputWrap}>
                      <Lock size={15} className={styles.inputIcon} />
                      <input id="si-pass" className={styles.input}
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••" autoComplete="current-password"
                        value={password} onChange={e => setPassword(e.target.value)} />
                      <button type="button" className={styles.eyeBtn}
                        onClick={() => setShowPw(v => !v)} tabIndex={-1}
                        aria-label={showPw ? 'Hide password' : 'Show password'}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p className={styles.error}
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}>
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button className={styles.submit} type="submit" disabled={loading}>
                    {loading
                      ? <span className={styles.spinner} aria-hidden="true" />
                      : 'Sign In'
                    }
                  </button>
                </form>

                <p className={styles.footer}>
                  New to the universe?{' '}
                  <button className={styles.footerLink} type="button" onClick={goToGenesis}>
                    Create your identity →
                  </button>
                </p>
              </div>
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
