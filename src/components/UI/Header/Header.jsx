import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Globe, Sun, Moon, Volume2, VolumeX } from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { initAudio, playSfx } from '../../../lib/audio'
import { PAGE } from '../../../lib/pages'
import styles from './Header.module.css'

const SYNC_LABEL = { synced: 'Synced', syncing: 'Syncing…', offline: 'Offline' }

const BG_LABELS = { off: 'Clear', glass: 'Glass' }
const BG_ICONS  = {
  off: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 2"/>
    </svg>
  ),
  glass: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.25"/>
    </svg>
  ),
}

const THEME_MODES = [
  { id: 'auto',  label: 'Auto',  Icon: null },
  { id: 'day',   label: 'Day',   Icon: Sun  },
  { id: 'night', label: 'Night', Icon: Moon },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad2 = (n) => String(n).padStart(2, '0')

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className={styles.clock} aria-label="Current time">
      <span className={styles.clockTime}>
        {pad2(now.getHours())}:{pad2(now.getMinutes())}
        <span className={styles.clockSec}>:{pad2(now.getSeconds())}</span>
      </span>
      <span className={styles.clockDate}>
        {DAYS[now.getDay()]} · {pad2(now.getDate())} {MONTHS[now.getMonth()]}
      </span>
    </div>
  )
}

export default function Header() {
  const resolvedTheme    = useEarthStore((s) => s.resolvedTheme)
  const themeMode        = useEarthStore((s) => s.themeMode)
  const setThemeMode     = useEarthStore((s) => s.setThemeMode)
  const sceneBg          = useEarthStore((s) => s.sceneBg)
  const setSceneBg       = useEarthStore((s) => s.setSceneBg)
  const currentPage      = useEarthStore((s) => s.currentPage)
  const setCurrentPage   = useEarthStore((s) => s.setCurrentPage)
  const audioMuted       = useEarthStore((s) => s.audioMuted)
  const toggleAudio      = useEarthStore((s) => s.toggleAudio)
  const syncStatus       = useEarthStore((s) => s.syncStatus)

  const isLoggedIn     = useAuthStore((s) => s.isLoggedIn)
  const logout         = useAuthStore((s) => s.logout)
  const openLoginModal = useAuthStore((s) => s.openLoginModal)

  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  const isDark  = resolvedTheme !== 'day'
  const bgKey   = sceneBg === 'glass' ? 'glass' : 'off'

  function toggleGlass() {
    setSceneBg(sceneBg === 'glass' ? 'off' : 'glass')
  }

  function handleAudioToggle() {
    initAudio()                 // unlock AudioContext on this user gesture
    toggleAudio()
    if (audioMuted) playSfx('click')  // was muted → now on; confirm audibly
  }

  function handleHdiNav() {
    if (!isLoggedIn) { openLoginModal(); return }
    setCurrentPage(currentPage === PAGE.HDI ? null : PAGE.HDI)
  }

  function handleAuthClick() {
    if (isLoggedIn) { logout(); setCurrentPage(null); return }
    openLoginModal()
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>

        {/* ── Brand: logo opens HDI, name opens World ── */}
        <div className={styles.brand}>
          <button
            className={styles.logoBtn}
            data-active={currentPage === PAGE.HDI}
            onClick={() => { handleHdiNav(); closeMenu() }}
            aria-label="Open HDI profile"
            title="HDI Profile"
          >
            <img
              src={isDark ? '/logo/night-logo.png' : '/logo/day-logo.png'}
              alt=""
              className={styles.logo}
              width="46"
              height="46"
            />
          </button>
          <button
            className={styles.brandBtn}
            data-active={currentPage === PAGE.WORLD}
            onClick={() => { setCurrentPage(currentPage === PAGE.WORLD ? null : PAGE.WORLD); closeMenu() }}
            aria-label="Open World community"
            title="World · Community"
          >
            <span className={styles.brandName}>Digital World</span>
            <span className={styles.brandTagline}>community</span>
          </button>
        </div>

        {/* ── Center: live clock ── */}
        <Clock />

        {/* ── Actions (desktop) ── */}
        <div className={styles.actions}>
          {isLoggedIn && (
            <span
              className={styles.syncPill}
              data-status={syncStatus}
              title={`Auto-sync: ${SYNC_LABEL[syncStatus]}`}
            >
              <span className={styles.syncDot} aria-hidden="true" />
              {SYNC_LABEL[syncStatus]}
            </span>
          )}

          <button
            className={styles.iconBtn}
            data-on={!audioMuted}
            onClick={handleAudioToggle}
            aria-label={audioMuted ? 'Unmute audio' : 'Mute audio'}
            aria-pressed={!audioMuted}
            title={audioMuted ? 'Sound off' : 'Sound on'}
          >
            {audioMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          <button
            className={styles.iconBtn}
            onClick={() => useEarthStore.getState().toggleDevMode()}
            aria-label="Toggle dev mode"
            title="Ctrl+Shift+D"
          >
            <Zap size={12} />
          </button>

          <button
            className={styles.iconBtn}
            data-on={sceneBg === 'glass'}
            onClick={toggleGlass}
            aria-label={`Scene overlay: ${BG_LABELS[bgKey]}`}
            title={`Background: ${BG_LABELS[bgKey]}`}
          >
            {BG_ICONS[bgKey]}
          </button>

          <div className={styles.themeGroup} role="group" aria-label="Theme">
            {THEME_MODES.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={styles.themeBtn}
                data-active={themeMode === id}
                onClick={() => setThemeMode(id)}
                aria-label={`${label} theme`}
                aria-pressed={themeMode === id}
                title={`${label} theme`}
              >
                {Icon ? <Icon size={11} aria-hidden="true" /> : <span className={styles.themeAuto}>A</span>}
              </button>
            ))}
          </div>

          <button className={styles.authBtn} onClick={handleAuthClick}>
            {isLoggedIn ? 'Logout' : 'Login'}
          </button>
        </div>

        {/* ── Hamburger (mobile) ── */}
        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>

      </div>

      {/* ── Mobile dropdown panel ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className={styles.menuBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
            />
            <motion.div
              className={styles.menuPanel}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.menuSection}>
                <span className={styles.menuLabel}>Pages</span>
                <div className={styles.menuPills}>
                  <button
                    className={styles.menuPill}
                    data-active={currentPage === PAGE.HDI}
                    onClick={() => { handleHdiNav(); closeMenu() }}
                  >
                    HDI
                  </button>
                  <button
                    className={styles.menuPill}
                    data-active={currentPage === PAGE.WORLD}
                    onClick={() => { setCurrentPage(currentPage === PAGE.WORLD ? null : PAGE.WORLD); closeMenu() }}
                  >
                    <Globe size={12} aria-hidden="true" /> World
                  </button>
                </div>
              </div>

              <div className={styles.menuSection}>
                <span className={styles.menuLabel}>Scene</span>
                <div className={styles.menuPills}>
                  <button
                    className={styles.menuPill}
                    data-active={sceneBg === 'glass'}
                    onClick={() => { toggleGlass(); closeMenu() }}
                    aria-pressed={sceneBg === 'glass'}
                  >
                    {BG_ICONS[bgKey]}
                    <span>{BG_LABELS[bgKey]}</span>
                  </button>
                  <button
                    className={styles.menuPill}
                    data-active={!audioMuted}
                    onClick={() => { handleAudioToggle(); closeMenu() }}
                    aria-pressed={!audioMuted}
                  >
                    {audioMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    <span>{audioMuted ? 'Sound Off' : 'Sound On'}</span>
                  </button>
                </div>
              </div>

              <div className={styles.menuSection}>
                <span className={styles.menuLabel}>Theme</span>
                <div className={styles.menuPills}>
                  {THEME_MODES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      className={styles.menuPill}
                      data-active={themeMode === id}
                      onClick={() => { setThemeMode(id); closeMenu() }}
                      aria-pressed={themeMode === id}
                    >
                      {Icon ? <Icon size={13} aria-hidden="true" /> : <span className={styles.themeAuto}>A</span>}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${styles.menuSection} ${styles.menuBottom}`}>
                <button
                  className={styles.menuPill}
                  onClick={() => { useEarthStore.getState().toggleDevMode(); closeMenu() }}
                >
                  <Zap size={13} aria-hidden="true" />
                  Dev Mode
                </button>
                <button
                  className={styles.menuAuth}
                  onClick={() => { handleAuthClick(); closeMenu() }}
                >
                  {isLoggedIn ? 'Logout' : 'Login'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
