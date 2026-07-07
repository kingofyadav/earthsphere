import { useEffect, useState } from 'react'
import { useTourStore, TOUR_STOPS } from '../../../store/tourStore'
import { useTravelStore } from '../../../store/travelStore'
import { useEarthStore } from '../../../store/earthStore'
import styles from './TourHUD.module.css'

function useClock() {
  const [timeData, setTimeData] = useState({ time: '', date: '' })
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTimeData({
        time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase()
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return timeData
}

export default function TourHUD() {
  const isTouring      = useTourStore((s) => s.isTouring)
  const isPaused       = useTourStore((s) => s.isPaused)
  const stopIndex      = useTourStore((s) => s.stopIndex)
  const dwellProgress  = useTourStore((s) => s.dwellProgress)
  const startTour      = useTourStore((s) => s.startTour)
  const stopTour       = useTourStore((s) => s.stopTour)
  const togglePause    = useTourStore((s) => s.togglePause)
  const requestSkip    = useTourStore((s) => s.requestSkip)
  const requestPrev    = useTourStore((s) => s.requestPrev)
  const isTraveling    = useTravelStore((s) => s.isTraveling)

  const timeScale    = useEarthStore((s) => s.timeScale)
  const setTimeScale = useEarthStore((s) => s.setTimeScale)
  const currentAngle = useEarthStore((s) => s.currentAngle)

  const { time, date } = useClock()
  const current = TOUR_STOPS[stopIndex]
  const total   = TOUR_STOPS.length

  const handleSpeedChange = () => {
    const next = timeScale === 1 ? 5 : timeScale === 5 ? 20 : timeScale === 20 ? 0 : 1
    setTimeScale(next)
  }

  if (!isTouring) {
    return (
      <button className={styles.launchBtn} onClick={startTour} aria-label="Start universe tour">
        <span className={styles.launchIcon}>◎</span>
        <span className={styles.launchText}>UNIVERSE TOUR</span>
      </button>
    )
  }

  return (
    <div className={styles.hud}>
      {/* HUD Scanner Decoration */}
      <div className={styles.scannerLine} />

      {/* Clock + Alignment */}
      <div className={styles.header}>
        <div className={styles.vesselInfo}>
          <div className={styles.clockLabel}>MISSION TIME // {date}</div>
          <div className={styles.clock}>{time}</div>
        </div>
        <div className={styles.orbitalData}>
          <div className={styles.clockLabel}>ORBITAL VECTOR</div>
          <div className={styles.angle}>{Math.round(currentAngle).toString().padStart(3, '0')}°</div>
        </div>
      </div>

      {/* Planet info */}
      <div className={styles.info}>
        <div className={styles.planetName}>{current.name.toUpperCase()}</div>
        <div className={styles.fact}>{current.fact}</div>
      </div>

      {/* Progress Dots */}
      <div className={styles.progressContainer}>
        <div className={styles.dots} role="list" aria-label="Tour progress">
          {TOUR_STOPS.map((s, i) => (
            <div
              key={s.name}
              className={`${styles.dot} ${i === stopIndex ? styles.dotActive : i < stopIndex ? styles.dotDone : ''}`}
            />
          ))}
        </div>
        <div className={styles.counter}>{stopIndex + 1} / {total}</div>
      </div>

      {/* Dwell countdown bar */}
      <div className={styles.dwellTrack}>
        <div className={styles.dwellBar} style={{ width: `${dwellProgress * 100}%` }} />
      </div>

      {/* Status & Speed */}
      <div className={styles.statusRow}>
        <div className={`${styles.statusPill} ${isTraveling ? styles.traveling : styles.arrived}`}>
          <span className={styles.statusIcon} aria-hidden="true">{isTraveling ? '⚡' : '🛰'}</span>
          {isTraveling ? 'TRANSIT' : 'ORBITAL LOCK'}
        </div>
        <button className={styles.speedBtn} onClick={handleSpeedChange} aria-label="Change warp speed">
          {timeScale === 0 ? 'PAUSED' : `WARP ${timeScale}×`}
        </button>
      </div>

      {/* Navigation Controls */}
      <div className={styles.controls}>
        <button className={styles.navBtn} onClick={requestPrev} aria-label="Previous stop">PREV</button>
        <button className={styles.navBtn} onClick={togglePause} aria-label={isPaused ? 'Resume tour' : 'Pause tour'}>
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
        <button className={styles.navBtn} onClick={requestSkip} aria-label="Next stop">NEXT</button>
        <button className={`${styles.navBtn} ${styles.stopBtn}`} onClick={stopTour} aria-label="Abort tour">ABORT</button>
      </div>
    </div>
  )
}
