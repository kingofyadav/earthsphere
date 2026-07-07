import { motion, AnimatePresence } from 'framer-motion'
import { useEarthStore } from '../../../store/earthStore'
import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  const isLoaded = useEarthStore((s) => s.isLoaded)

  return (
    <AnimatePresence>
      {!isLoaded && (
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
