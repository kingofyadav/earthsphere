import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Menu, X, Globe, Sun, Moon } from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { useTravelStore } from '../../../store/travelStore'
import { PLANETS, MOON, SUN_DATA } from '../../SolarSystem/planetData'
import styles from './Header.module.css'

// Flat nav order: Sun → all planets → Moon injected after Earth
const NAV_ITEMS = [
  { ...SUN_DATA, isSun: true },
  ...PLANETS.flatMap(p =>
    p.name === 'Earth' ? [p, { ...MOON, isMoon: true }] : [p]
  ),
]

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

export default function Header() {
  const resolvedTheme    = useEarthStore((s) => s.resolvedTheme)
  const themeMode        = useEarthStore((s) => s.themeMode)
  const setThemeMode     = useEarthStore((s) => s.setThemeMode)
  const sceneBg          = useEarthStore((s) => s.sceneBg)
  const setSceneBg       = useEarthStore((s) => s.setSceneBg)
  const currentPage      = useEarthStore((s) => s.currentPage)
  const setCurrentPage   = useEarthStore((s) => s.setCurrentPage)
  const startTravel      = useTravelStore((s) => s.startTravel)
  const targetPlanetName = useTravelStore((s) => s.targetPlanetName)

  const isLoggedIn     = useAuthStore((s) => s.isLoggedIn)
  const logout         = useAuthStore((s) => s.logout)
  const openLoginModal = useAuthStore((s) => s.openLoginModal)
  const recordVisit    = useAuthStore((s) => s.recordVisit)

  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  const isDark = resolvedTheme !== 'day'

  function toggleGlass() {
    setSceneBg(sceneBg === 'glass' ? 'off' : 'glass')
  }

  function handleHdiNav() {
    if (!isLoggedIn) { openLoginModal(); return }
    setCurrentPage(currentPage === 'hdi' ? null : 'hdi')
  }

  function handleAuthClick() {
    if (isLoggedIn) { logout(); setCurrentPage(null); return }
    openLoginModal()
  }

  function handleNavItem(item) {
    setCurrentPage(null)
    if (item.isMoon) {
      startTravel('Earth')
      if (isLoggedIn) { recordVisit('Moon'); setCurrentPage('Moon') } else { openLoginModal() }
      return
    }
    if (item.isSun) {
      startTravel('Sun')
      if (isLoggedIn) { recordVisit('Sun'); setCurrentPage('Sun') } else { openLoginModal() }
      return
    }
    startTravel(item.name)
    if (isLoggedIn) {
      recordVisit(item.name)
      setCurrentPage(item.name === 'Earth' ? 'earth-hero' : item.name)
    } else {
      openLoginModal()
    }
  }

  function isItemActive(item) {
    if (item.isMoon)  return currentPage === 'Moon'
    if (item.isSun)   return currentPage === 'Sun'
    if (item.isEarth) return currentPage === 'earth-hero'
    return currentPage === item.name || targetPlanetName === item.name
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>

          {/* ── Brand ── */}
          <a className={styles.brand} href="/" aria-label="Digital World home" onClick={closeMenu}>
            <img
              src={isDark ? '/logo/night-logo.png' : '/logo/day-logo.png'}
              alt="logo"
              className={styles.logo}
              width="36"
              height="36"
            />
            <div className={styles.brandText}>
              <span className={styles.brandName}>Digital World</span>
              <span className={styles.brandTagline}>zerosoils</span>
            </div>
          </a>

          {/* ── Nav ── */}
          <nav className={styles.pageNav} aria-label="Main navigation">

            {/* App pages */}
            <div className={styles.appNav}>
              <button
                className={styles.appNavBtn}
                data-active={currentPage === 'hdi'}
                onClick={handleHdiNav}
                aria-current={currentPage === 'hdi' ? 'page' : undefined}
              >
                HDI
              </button>

              <button
                className={styles.appNavBtn}
                data-active={currentPage === 'world'}
                onClick={() => setCurrentPage(currentPage === 'world' ? null : 'world')}
                aria-current={currentPage === 'world' ? 'page' : undefined}
              >
                <Globe size={11} aria-hidden="true" />
                World
              </button>
            </div>

            <div className={styles.navDivider} aria-hidden="true" />

            {/* Universe — scrollable */}
            <div className={styles.universeWrap}>
              <div className={styles.universeNav}>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.name}
                    className={`${styles.navLink} ${item.isMoon ? styles.navMoon : ''}`}
                    data-active={isItemActive(item)}
                    onClick={() => handleNavItem(item)}
                  >
                    <span
                      className={styles.navLinkDot}
                      style={{ background: item.color }}
                      aria-hidden="true"
                    />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

          </nav>

          {/* ── Unified control tray (desktop) ── */}
          <div className={styles.tray}>
            <button
              className={styles.zapBtn}
              onClick={() => useEarthStore.getState().toggleDevMode()}
              aria-label="Toggle dev mode"
              title="Ctrl+Shift+D"
            >
              <Zap size={12} />
            </button>

            <div className={styles.sep} />

            <button
              className={styles.bgBtn}
              data-bg={sceneBg}
              onClick={toggleGlass}
              aria-label={`Scene overlay: ${BG_LABELS[sceneBg === 'glass' ? 'glass' : 'off']}`}
              title={`Background: ${BG_LABELS[sceneBg === 'glass' ? 'glass' : 'off']}`}
            >
              {BG_ICONS[sceneBg === 'glass' ? 'glass' : 'off']}
              <span>{BG_LABELS[sceneBg === 'glass' ? 'glass' : 'off']}</span>
            </button>

            <div className={styles.sep} />

            {/* ── Theme: Auto / Day / Night ── */}
            <div className={styles.themeGroup}>
              <button
                className={`${styles.themeBtn} ${themeMode === 'auto' ? styles.themeBtnActive : ''}`}
                data-mode="auto"
                onClick={() => setThemeMode('auto')}
                aria-label="Auto theme" aria-pressed={themeMode === 'auto'}
              >
                <span className={styles.themeBtnAuto}>A</span>
                <span>Auto</span>
              </button>
              <button
                className={`${styles.themeBtn} ${themeMode === 'day' ? styles.themeBtnActive : ''}`}
                data-mode="day"
                onClick={() => setThemeMode('day')}
                aria-label="Day theme" aria-pressed={themeMode === 'day'}
              >
                <Sun size={11} aria-hidden="true" />
                <span>Day</span>
              </button>
              <button
                className={`${styles.themeBtn} ${themeMode === 'night' ? styles.themeBtnActive : ''}`}
                data-mode="night"
                onClick={() => setThemeMode('night')}
                aria-label="Night theme" aria-pressed={themeMode === 'night'}
              >
                <Moon size={11} aria-hidden="true" />
                <span>Night</span>
              </button>
            </div>

            <div className={styles.sep} />

            <button className={styles.authBtn} onClick={handleAuthClick}>
              {isLoggedIn ? 'Logout' : 'Login'}
            </button>
          </div>

          {/* ── Hamburger (mobile only) ── */}
          <button
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className={styles.drawerBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
            />
            <motion.div
              className={styles.drawer}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* App pages */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>Pages</span>
                <div className={styles.drawerPills}>
                  <button
                    className={`${styles.drawerPill} ${currentPage === 'hdi' ? styles.drawerPillActive : ''}`}
                    onClick={() => { handleHdiNav(); closeMenu() }}
                  >
                    HDI
                  </button>
                  <button
                    className={`${styles.drawerPill} ${currentPage === 'world' ? styles.drawerPillActive : ''}`}
                    onClick={() => { setCurrentPage(currentPage === 'world' ? null : 'world'); closeMenu() }}
                  >
                    <Globe size={12} aria-hidden="true" /> World
                  </button>
                </div>
              </div>

              {/* Universe */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>Universe</span>
                <div className={styles.drawerPills}>
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.name}
                      className={`${styles.drawerPill} ${isItemActive(item) ? styles.drawerPillActive : ''}`}
                      style={item.isMoon ? { paddingLeft: '1.6rem', fontSize: '0.78rem' } : {}}
                      onClick={() => { handleNavItem(item); closeMenu() }}
                    >
                      <span className={styles.drawerPlanetDot} style={{ background: item.color }} />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scene */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>Scene</span>
                <div className={styles.drawerPills}>
                  <button
                    className={`${styles.drawerPill} ${sceneBg === 'glass' ? styles.drawerPillActive : ''}`}
                    onClick={() => { toggleGlass(); closeMenu() }}
                    aria-pressed={sceneBg === 'glass'}
                  >
                    {BG_ICONS[sceneBg === 'glass' ? 'glass' : 'off']}
                    <span style={{ marginLeft: '0.3rem' }}>{BG_LABELS[sceneBg === 'glass' ? 'glass' : 'off']}</span>
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>Theme</span>
                <div className={styles.drawerThemePills}>
                  {[
                    { id: 'auto',  label: 'Auto',  Icon: null },
                    { id: 'day',   label: 'Day',   Icon: Sun  },
                    { id: 'night', label: 'Night', Icon: Moon },
                  ].map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      className={`${styles.drawerPill} ${styles.drawerThemePill} ${themeMode === id ? styles.drawerPillActive : ''}`}
                      onClick={() => { setThemeMode(id); closeMenu() }}
                      aria-pressed={themeMode === id}
                    >
                      {Icon ? <Icon size={13} /> : <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>A</span>}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom: dev + auth */}
              <div className={`${styles.drawerSection} ${styles.drawerBottom}`}>
                <button
                  className={styles.drawerPill}
                  onClick={() => { useEarthStore.getState().toggleDevMode(); closeMenu() }}
                >
                  <Zap size={13} />
                  Dev Mode
                </button>
                <button
                  className={`${styles.drawerPill} ${styles.drawerAuthPill}`}
                  onClick={() => { handleAuthClick(); closeMenu() }}
                >
                  {isLoggedIn ? 'Logout' : 'Login'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
