import { AnimatePresence, motion } from 'framer-motion'
import { useEarthStore } from '../../../store/earthStore'
import styles from './HeroStats.module.css'

const STATS = [
  { value: '8',    label: 'Planets'     },
  { value: '4',    label: 'View Modes'  },
  { value: 'AU',   label: 'Orbit Scale' },
  { value: 'NASA', label: 'Textures'    },
]

export default function HeroStats() {
  const isLoaded = useEarthStore((s) => s.isLoaded)
  const appStage = useEarthStore((s) => s.appStage)

  if (!isLoaded) return null

  return (
    <AnimatePresence>
      {appStage === 'landing' && (
        <motion.div
          className={styles.row}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10, transition: { duration: 0.3, ease: 'easeIn' } }}
          transition={{ delay: 1.0, duration: 0.6, ease: 'easeOut' }}
          aria-label="Solar system facts"
        >
          {STATS.map(({ value, label }, i) => (
            <div key={label} className={styles.stat}>
              <span className={styles.value}>{value}</span>
              <span className={styles.label}>{label}</span>
              {i < STATS.length - 1 && <span className={styles.sep} aria-hidden="true" />}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
