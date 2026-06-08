import { AnimatePresence, motion } from 'framer-motion'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { useTravelStore } from '../../../store/travelStore'
import styles from './HeroOverlay.module.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.35 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1] } },
}

export default function HeroOverlay() {
  const isLoaded    = useEarthStore(s => s.isLoaded)
  const appStage    = useEarthStore(s => s.appStage)
  const setAppStage = useEarthStore(s => s.setAppStage)
  const setSceneBg  = useEarthStore(s => s.setSceneBg)
  const isLoggedIn  = useAuthStore(s => s.isLoggedIn)
  const user        = useAuthStore(s => s.user)
  const startTravel = useTravelStore(s => s.startTravel)

  function handleBegin(e) {
    e?.stopPropagation()
    if (isLoggedIn) {
      setAppStage('explore')
      setSceneBg('glass')
      startTravel('Earth')
    } else {
      setAppStage('genesis')
    }
  }

  if (!isLoaded) return null

  return (
    <AnimatePresence>
      {appStage === 'landing' && (
        <motion.div
          className={styles.wrap}
          variants={container}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, x: -72, transition: { duration: 0.48, ease: [0.4, 0, 1, 1] } }}
          onClick={handleBegin}
          role="region"
          aria-label="Landing — enter the digital universe"
        >
          <motion.p className={styles.eyebrow} variants={item}>
            ZEROSOILS · DIGITAL UNIVERSE · v0.1
          </motion.p>

          <motion.h1 className={styles.headline} variants={item}>
            {isLoggedIn
              ? <>Welcome back,<br /><span className={styles.hdiAccent}>{user?.hdi || user?.name}</span></>
              : <>You are entering<br />the Digital Universe</>
            }
          </motion.h1>

          <motion.p className={styles.sub} variants={item}>
            {isLoggedIn
              ? 'Your sovereign identity travels with you across every world.'
              : 'Every human deserves a permanent digital identity. One step away.'
            }
          </motion.p>

          <motion.div className={styles.ctas} variants={item}>
            <button className={styles.btnPrimary} onClick={handleBegin}>
              {isLoggedIn ? 'Enter Solar System →' : 'Create Your Identity →'}
            </button>
          </motion.div>

          {!isLoggedIn && (
            <motion.p className={styles.signinRow} variants={item}>
              Already have one?{' '}
              <button
                className={styles.signinLink}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  useAuthStore.getState().openLoginModal()
                }}
              >
                Sign in
              </button>
            </motion.p>
          )}

          <motion.p className={styles.tapHint} variants={item} aria-hidden="true">
            tap anywhere to begin
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
