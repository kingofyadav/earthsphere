import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Flag, FileText, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import FocusTrap from 'focus-trap-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { useTerritoryStore } from '../../../store/territoryStore'
import { useNationStore } from '../../../store/nationStore'
import { PAGE } from '../../../lib/pages'
import styles from './NationFounder.module.css'

const FLAGS = [
  '🌍','🌎','🌏','🏳️','⚑','🚩',
  '🦅','🦁','🐉','⚔️','🛡️','👑',
  '☀️','🌙','⭐','🌊','🔥','❄️',
  '🕊️','⚡','🌺','🌿','🏔️','🌋',
]

const STEPS = ['name', 'flag', 'constitution', 'confirm']

const card = {
  initial: { opacity: 0, scale: 0.94, y: 18 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.2 } },
}
const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
}
const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, x: -24, transition: { duration: 0.18 } },
}

export default function NationFounder() {
  const nationFounderZoneId    = useEarthStore(s => s.nationFounderZoneId)
  const setNationFounderZoneId = useEarthStore(s => s.setNationFounderZoneId)
  const setCurrentNationId     = useEarthStore(s => s.setCurrentNationId)
  const setCurrentPage         = useEarthStore(s => s.setCurrentPage)
  const user                   = useAuthStore(s => s.user)
  const zones                  = useTerritoryStore(s => s.zones)
  const setZoneNation          = useTerritoryStore(s => s.setZoneNation)
  const foundNation            = useNationStore(s => s.foundNation)

  const zone = zones.find(z => z.id === nationFounderZoneId) ?? null

  const [step,         setStep]         = useState(0)
  const [nationName,   setNationName]   = useState('')
  const [flag,         setFlag]         = useState('🌍')
  const [constitution, setConstitution] = useState('')
  const [error,        setError]        = useState('')

  function close() {
    setNationFounderZoneId(null)
    setStep(0); setNationName(''); setFlag('🌍'); setConstitution(''); setError('')
  }

  function next() {
    if (STEPS[step] === 'name' && !nationName.trim()) {
      setError('Your nation needs a name.'); return
    }
    if (STEPS[step] === 'constitution' && !constitution.trim()) {
      setError('Write a short constitution.'); return
    }
    setError('')
    setStep(s => s + 1)
  }

  function back() {
    setError('')
    setStep(s => Math.max(0, s - 1))
  }

  function handleFound() {
    if (!zone || !user) return
    const nation = foundNation({
      name:             nationName.trim(),
      flag,
      capital_zone_id:  zone.id,
      constitution:     constitution.trim(),
      founder_hid:      user.hdi,
    })
    setZoneNation(zone.id, nation.id)
    setCurrentNationId(nation.id)
    close()
    setCurrentPage(PAGE.NATION)
  }

  const isOpen = Boolean(nationFounderZoneId && zone)
  const stepKey = STEPS[step]
  const pct = ((step + 1) / STEPS.length) * 100

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className={styles.backdrop} {...backdrop} onClick={close}>
          <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true }}>
          <motion.div className={styles.card} {...card} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={close} aria-label="Close"><X size={14} /></button>

            {/* Progress */}
            <div className={styles.progress}>
              <div className={styles.progressBar} style={{ width: `${pct}%` }} />
            </div>

            <AnimatePresence mode="wait">
              {stepKey === 'name' && (
                <motion.div key="name" className={styles.stepWrap} {...slide}>
                  <div className={styles.header}>
                    <Flag size={16} className={styles.headerIcon} />
                    <span>Name your nation</span>
                  </div>
                  <p className={styles.sub}>This is what citizens and the world will call it.</p>
                  <input
                    className={styles.input}
                    placeholder="e.g. Republic of New Horizon"
                    value={nationName}
                    onChange={e => { setNationName(e.target.value); setError('') }}
                    autoFocus maxLength={60}
                  />
                  {error && <p className={styles.error}>{error}</p>}
                  <button className={styles.btn} onClick={next}>
                    Continue <ChevronRight size={15} />
                  </button>
                </motion.div>
              )}

              {stepKey === 'flag' && (
                <motion.div key="flag" className={styles.stepWrap} {...slide}>
                  <div className={styles.header}>
                    <span className={styles.flagPreview}>{flag}</span>
                    <span>Choose your flag</span>
                  </div>
                  <div className={styles.flagGrid}>
                    {FLAGS.map(f => (
                      <button
                        key={f}
                        className={`${styles.flagBtn} ${flag === f ? styles.flagActive : ''}`}
                        onClick={() => setFlag(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className={styles.navRow}>
                    <button className={styles.btnGhost} onClick={back}><ChevronLeft size={15} /> Back</button>
                    <button className={styles.btn} onClick={next}>Continue <ChevronRight size={15} /></button>
                  </div>
                </motion.div>
              )}

              {stepKey === 'constitution' && (
                <motion.div key="constitution" className={styles.stepWrap} {...slide}>
                  <div className={styles.header}>
                    <FileText size={16} className={styles.headerIcon} />
                    <span>Write your constitution</span>
                  </div>
                  <p className={styles.sub}>The founding principles of your nation. Keep it short and clear.</p>
                  <textarea
                    className={styles.textarea}
                    placeholder="We the citizens of this nation declare..."
                    value={constitution}
                    onChange={e => { setConstitution(e.target.value); setError('') }}
                    autoFocus maxLength={500} rows={5}
                  />
                  <span className={styles.charCount}>{constitution.length}/500</span>
                  {error && <p className={styles.error}>{error}</p>}
                  <div className={styles.navRow}>
                    <button className={styles.btnGhost} onClick={back}><ChevronLeft size={15} /> Back</button>
                    <button className={styles.btn} onClick={next}>Continue <ChevronRight size={15} /></button>
                  </div>
                </motion.div>
              )}

              {stepKey === 'confirm' && (
                <motion.div key="confirm" className={styles.stepWrap} {...slide}>
                  <div className={styles.header}>
                    <CheckCircle size={16} className={styles.headerIcon} />
                    <span>Confirm & Found</span>
                  </div>
                  <div className={styles.summary}>
                    <div className={styles.summaryFlag}>{flag}</div>
                    <div className={styles.summaryName}>{nationName}</div>
                    <div className={styles.summaryZone}>
                      Capital: {zone.name} · {zone.lat.toFixed(2)}°, {zone.lng.toFixed(2)}°
                    </div>
                    <p className={styles.summaryConstitution}>{constitution}</p>
                  </div>
                  <div className={styles.navRow}>
                    <button className={styles.btnGhost} onClick={back}><ChevronLeft size={15} /> Back</button>
                    <button className={styles.btnFound} onClick={handleFound}>
                      Found Nation
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
