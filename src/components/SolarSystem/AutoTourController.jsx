import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTourStore, TOUR_STOPS, DWELL_SECONDS } from '../../store/tourStore'
import { useTravelStore } from '../../store/travelStore'
import { useEarthStore } from '../../store/earthStore'

export default function AutoTourController() {
  const prevTouring = useRef(false)
  const dwellRef    = useRef(0)

  useFrame((_, delta) => {
    const tour   = useTourStore.getState()
    const travel = useTravelStore.getState()
    const { timeScale } = useEarthStore.getState()

    // ── Tour just started ────────────────────────────────────────────────────
    if (tour.isTouring && !prevTouring.current) {
      prevTouring.current = true
      dwellRef.current    = 0
      travel.startTravel(TOUR_STOPS[tour.stopIndex].name)
      return
    }

    // ── Tour stopped or never running ────────────────────────────────────────
    if (!tour.isTouring) {
      if (prevTouring.current) {
        prevTouring.current = false
        dwellRef.current    = 0
      }
      return
    }

    // ── Skip requested ───────────────────────────────────────────────────────
    if (tour.skipRequested) {
      const next = (tour.stopIndex + 1) % TOUR_STOPS.length
      useTourStore.setState({ skipRequested: false, stopIndex: next, dwellProgress: 0 })
      dwellRef.current = 0
      travel.startTravel(TOUR_STOPS[next].name)
      return
    }

    // ── Prev requested ───────────────────────────────────────────────────────
    if (tour.prevRequested) {
      const prev = (tour.stopIndex - 1 + TOUR_STOPS.length) % TOUR_STOPS.length
      useTourStore.setState({ prevRequested: false, stopIndex: prev, dwellProgress: 0 })
      dwellRef.current = 0
      travel.startTravel(TOUR_STOPS[prev].name)
      return
    }

    // ── Still traveling — wait ───────────────────────────────────────────────
    if (travel.isTraveling) {
      dwellRef.current = 0
      useTourStore.setState({ dwellProgress: 0 })
      return
    }

    // ── Dwelling after arrival ───────────────────────────────────────────────
    if (!tour.isPaused && timeScale > 0) {
      dwellRef.current += delta
      const progress = Math.min(dwellRef.current / DWELL_SECONDS, 1)
      useTourStore.setState({ dwellProgress: progress })

      if (dwellRef.current >= DWELL_SECONDS) {
        dwellRef.current = 0
        const next = (tour.stopIndex + 1) % TOUR_STOPS.length
        useTourStore.setState({ stopIndex: next, dwellProgress: 0 })
        travel.startTravel(TOUR_STOPS[next].name)
      }
    }
  })

  return null
}
