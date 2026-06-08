import { useEffect, useRef } from 'react'
import { useTravelStore } from '../../../store/travelStore'
import { liveTravel } from '../../../travel/travelState'
import styles from './TravelHUD.module.css'

export default function TravelHUD() {
  const endTravel        = useTravelStore((s) => s.endTravel)
  const targetPlanetName = useTravelStore((s) => s.targetPlanetName)

  const xRef       = useRef(null)
  const yRef       = useRef(null)
  const zRef       = useRef(null)
  const distRef    = useRef(null)
  const barRef     = useRef(null)
  const statusRef  = useRef(null)
  const rafId      = useRef(null)

  // Poll liveTravel at display refresh rate via rAF — zero Zustand re-renders
  useEffect(() => {
    function tick() {
      if (xRef.current)    xRef.current.textContent    = liveTravel.x.toFixed(2)
      if (yRef.current)    yRef.current.textContent    = liveTravel.y.toFixed(2)
      if (zRef.current)    zRef.current.textContent    = liveTravel.z.toFixed(2)
      if (distRef.current) distRef.current.textContent = liveTravel.distance.toFixed(2) + ' AU'
      if (barRef.current)  barRef.current.style.width  = (liveTravel.progress * 100).toFixed(1) + '%'
      if (statusRef.current) {
        const traveling = liveTravel.traveling
        statusRef.current.textContent = traveling ? 'TRAVELING' : 'ARRIVED'
        statusRef.current.dataset.state = traveling ? 'traveling' : 'arrived'
      }
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [])

  return (
    <div className={styles.hud} role="region" aria-label="Travel telemetry">
      <div className={styles.header}>
        <span className={styles.label}>TRAVEL TARGET</span>
        <span className={styles.target}>{targetPlanetName ?? '—'}</span>
        <span ref={statusRef} className={styles.status} data-state="traveling">TRAVELING</span>
      </div>

      <div className={styles.coords}>
        <div className={styles.coord}>
          <span className={styles.axis}>X</span>
          <span ref={xRef} className={styles.value}>0.00</span>
        </div>
        <div className={styles.coord}>
          <span className={styles.axis}>Y</span>
          <span ref={yRef} className={styles.value}>0.00</span>
        </div>
        <div className={styles.coord}>
          <span className={styles.axis}>Z</span>
          <span ref={zRef} className={styles.value}>0.00</span>
        </div>
      </div>

      <div className={styles.distRow}>
        <span className={styles.label}>DISTANCE</span>
        <span ref={distRef} className={styles.value}>0.00 AU</span>
      </div>

      <div className={styles.progressRow}>
        <div className={styles.track}>
          <div ref={barRef} className={styles.bar} />
        </div>
      </div>

      <button className={styles.returnBtn} onClick={endTravel} aria-label="Return to solar system view">
        ← RETURN
      </button>
    </div>
  )
}
