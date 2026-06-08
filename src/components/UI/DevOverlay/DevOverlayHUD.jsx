import { motion, AnimatePresence } from 'framer-motion'
import { useEarthStore } from '../../../store/earthStore'
import styles from './DevOverlay.module.css'

export default function DevOverlayHUD() {
  const isDevMode = useEarthStore((s) => s.isDevMode)
  const fps       = useEarthStore((s) => s.fps)

  const fpsColor = fps === 0 ? 'green' : fps >= 50 ? 'green' : fps >= 30 ? 'amber' : 'red'
  const fpsLabel = fps === 0 ? '--' : fps

  return (
    <AnimatePresence>
      {isDevMode && (
        <motion.div
          className={styles.badge}
          role="status"
          aria-label={`Developer mode active — ${fps === 0 ? 'measuring' : fps + ' fps'}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.dot} />
          <span className={styles.label}>DEV</span>
          <span className={styles.divider} />
          <span className={styles.fps} data-color={fpsColor}>{fpsLabel}</span>
          <span className={styles.fpsUnit}>fps</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
