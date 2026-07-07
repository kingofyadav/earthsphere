import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTravelStore } from '../../../store/travelStore'
import styles from './LightSpeed.module.css'

// Radial star streaks while traveling + a white flash on arrival.
// Pure DOM overlay driven by travelStore — never touches the WebGL scene.
const STREAKS = Array.from({ length: 44 }, (_, i) => {
  const angle = (i / 44) * 360 + (i % 3) * 7
  return {
    angle,
    delay: (i % 11) * 0.045,
    dur: 0.5 + (i % 5) * 0.12,
    len: 26 + (i % 6) * 12,
    thick: 1 + (i % 3) * 0.6,
  }
})

export default function LightSpeed() {
  const isTraveling = useTravelStore((s) => s.isTraveling)
  const [flash, setFlash] = useState(false)
  const wasTraveling = useRef(false)

  useEffect(() => {
    // rising edge → started; falling edge → arrived → flash
    if (wasTraveling.current && !isTraveling) {
      setFlash(true)
      const id = setTimeout(() => setFlash(false), 420)
      return () => clearTimeout(id)
    }
    wasTraveling.current = isTraveling
  }, [isTraveling])

  return (
    <>
      <AnimatePresence>
        {isTraveling && (
          <motion.div
            className={styles.warp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.3 }}
            aria-hidden="true"
          >
            <div className={styles.core} />
            {STREAKS.map((s, i) => (
              <span
                key={i}
                className={styles.streak}
                style={{
                  '--angle': `${s.angle}deg`,
                  '--delay': `${s.delay}s`,
                  '--dur': `${s.dur}s`,
                  '--len': `${s.len}vmax`,
                  '--thick': `${s.thick}px`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flash && (
          <motion.div
            className={styles.flash}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  )
}
