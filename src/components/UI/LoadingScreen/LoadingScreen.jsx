import { motion, AnimatePresence } from 'framer-motion'
import { useEarthStore } from '../../../store/earthStore'
import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  const isLoaded = useEarthStore((s) => s.isLoaded)
  const appStage = useEarthStore((s) => s.appStage)

  // The landing is served static (boot splash + hero) — the loader is only for
  // the transition into the live scene, when textures are actually fetching.
  return (
    <AnimatePresence>
      {!isLoaded && appStage !== 'landing' && (
        <motion.div
          className={styles.screen}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          aria-label="Loading EarthSphere"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className={styles.outerRing}>
            <div className={styles.innerRing} />
          </div>
          <div className={styles.pulse} />
          <p className={styles.text}>INITIALIZING DEEP SPACE VOYAGER</p>
          <p className={styles.sub}>Synchronizing Orbital Vectors...</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
