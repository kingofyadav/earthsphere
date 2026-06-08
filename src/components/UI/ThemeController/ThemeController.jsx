import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Zap } from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import styles from './ThemeController.module.css'

const MODES = [
  { id: 'auto',  label: 'Auto',  icon: null },
  { id: 'day',   label: 'Day',   icon: Sun },
  { id: 'night', label: 'Night', icon: Moon },
]

export default function ThemeController() {
  const themeMode = useEarthStore((s) => s.themeMode)
  const setThemeMode = useEarthStore((s) => s.setThemeMode)
  const isLoaded = useEarthStore((s) => s.isLoaded)

  return (
    <AnimatePresence>
      {isLoaded && (
        <motion.nav
          className={styles.panel}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
          role="navigation"
          aria-label="Scene theme selector"
        >
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`${styles.btn} ${themeMode === id ? styles.active : ''}`}
              onClick={() => setThemeMode(id)}
              aria-label={`${label} mode`}
              aria-pressed={themeMode === id}
            >
              {Icon && <Icon size={13} aria-hidden="true" />}
              <span>{label}</span>
              {themeMode === id && (
                <motion.span
                  className={styles.indicator}
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}

          <div className={styles.divider} />

          <button
            className={styles.iconBtn}
            onClick={() => useEarthStore.getState().toggleDevMode()}
            aria-label="Toggle Matrix dev mode (Ctrl+Shift+D)"
            title="Ctrl+Shift+D"
          >
            <Zap size={13} aria-hidden="true" />
          </button>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
