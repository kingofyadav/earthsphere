import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, MapPin, Globe, Flag } from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { useTerritoryStore } from '../../../store/territoryStore'
import styles from './ClaimModal.module.css'

const RADII = [25, 50, 100, 200]

const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
}

const card = {
  initial: { opacity: 0, scale: 0.94, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.18 } },
}

function fmt(n) {
  return n.toFixed(4)
}

export default function ClaimModal() {
  const claimTarget    = useEarthStore(s => s.claimTarget)
  const clearTarget    = useEarthStore(s => s.clearClaimTarget)
  const openLogin      = useAuthStore(s => s.openLoginModal)
  const setAppStage    = useEarthStore(s => s.setAppStage)
  const setSceneBg     = useEarthStore(s => s.setSceneBg)
  const isLoggedIn     = useAuthStore(s => s.isLoggedIn)
  const user           = useAuthStore(s => s.user)
  const claimZone      = useTerritoryStore(s => s.claimZone)

  const setNationFounderZoneId = useEarthStore(s => s.setNationFounderZoneId)
  const claimedZoneRef = useRef(null)

  const [name,   setName]   = useState('')
  const [radius, setRadius] = useState(50)
  const [done,   setDone]   = useState(false)
  const [error,  setError]  = useState('')

  function close() {
    clearTarget()
    setName('')
    setRadius(50)
    setDone(false)
    setError('')
  }

  function handleClaim() {
    if (!name.trim()) { setError('Give your territory a name.'); return }
    const zone = claimZone({
      lat:        claimTarget.lat,
      lng:        claimTarget.lng,
      radius,
      name:       name.trim(),
      owner_hid:  user.hdi,
      owner_name: user.name,
    })
    claimedZoneRef.current = zone
    setDone(true)
    setError('')
  }

  function handleCreateIdentity() {
    close()
    setSceneBg('glass')
    setAppStage('genesis')
  }

  const isOpen = Boolean(claimTarget)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className={styles.backdrop} {...backdrop} onClick={close}>
          <motion.div className={styles.card} {...card} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={close} aria-label="Close">
              <X size={14} />
            </button>

            {done ? (
              <div className={styles.success}>
                <div className={styles.successIcon}><Globe size={28} /></div>
                <h2 className={styles.successTitle}>Territory Claimed</h2>
                <p className={styles.successSub}>
                  <strong>{name}</strong> is now yours on the globe.
                </p>
                <button
                  className={styles.btn}
                  onClick={() => {
                    const zoneId = claimedZoneRef.current?.id
                    close()
                    if (zoneId) setNationFounderZoneId(zoneId)
                  }}
                >
                  <Flag size={14} /> Found a Nation
                </button>
                <button className={styles.btnGhost} onClick={close}>Done</button>
              </div>
            ) : (
              <>
                <div className={styles.header}>
                  <MapPin size={16} className={styles.headerIcon} />
                  <span className={styles.headerTitle}>Claim Territory</span>
                </div>

                <div className={styles.coords}>
                  <span>{fmt(claimTarget.lat)}° {claimTarget.lat >= 0 ? 'N' : 'S'}</span>
                  <span className={styles.coordDivider}>·</span>
                  <span>{fmt(Math.abs(claimTarget.lng))}° {claimTarget.lng >= 0 ? 'E' : 'W'}</span>
                </div>

                {!isLoggedIn ? (
                  <div className={styles.guestBlock}>
                    <p className={styles.guestText}>
                      You need a digital identity to claim territory.
                    </p>
                    <button className={styles.btn} onClick={handleCreateIdentity}>
                      Create Identity
                    </button>
                    <button className={styles.btnGhost} onClick={openLogin}>
                      Sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="zone-name">Territory name</label>
                      <input
                        id="zone-name"
                        className={styles.input}
                        placeholder="e.g. New Delhi Republic"
                        value={name}
                        onChange={e => { setName(e.target.value); setError('') }}
                        autoFocus
                        maxLength={48}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Radius</label>
                      <div className={styles.radii}>
                        {RADII.map(r => (
                          <button
                            key={r}
                            className={`${styles.radiusBtn} ${radius === r ? styles.radiusActive : ''}`}
                            onClick={() => setRadius(r)}
                          >
                            {r} km
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button className={styles.btn} onClick={handleClaim}>
                      Claim Territory
                    </button>
                  </>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
