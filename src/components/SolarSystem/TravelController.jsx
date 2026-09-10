import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTravelStore } from '../../store/travelStore'
import { useTourStore } from '../../store/tourStore'
import { useEarthStore } from '../../store/earthStore'
import { liveTravel, planetRefs } from '../../travel/travelState'

// Bodies that open their own page on arrival. Earth opens its hub on click and
// the galaxy stop has no page, so both are excluded.
const NO_ARRIVAL_PAGE = new Set(['Earth', 'Milky Way'])

const _target   = new THREE.Vector3()
const _camPos   = new THREE.Vector3()
const _dir      = new THREE.Vector3()

// How close the camera stops from the planet surface (world units, before scene scale)
const DEFAULT_STOP_OFFSET = 1.4
const SUN_STOP_OFFSET     = 4.5
const GALAXY_STOP_OFFSET  = 160.0

export default function TravelController({ orbitControlsRef, scale }) {
  const { camera } = useThree()
  const isTraveling      = useTravelStore((s) => s.isTraveling)
  const targetPlanetName = useTravelStore((s) => s.targetPlanetName)
  const endTravel        = useTravelStore((s) => s.endTravel)

  const progressRef = useRef(0)
  const startPosRef = useRef(new THREE.Vector3())
  const arrivedRef  = useRef(false)

  useEffect(() => {
    if (isTraveling) {
      startPosRef.current.copy(camera.position)
      progressRef.current = 0
      arrivedRef.current  = false
    }
  }, [camera, isTraveling, targetPlanetName])

  useFrame((_, delta) => {
    if (!isTraveling || !targetPlanetName) {
      liveTravel.traveling = false
      return
    }

    const ref = planetRefs[targetPlanetName]
    if (!ref?.current) return

    // Get planet world position (accounts for orbit rotation + scene scale group)
    ref.current.getWorldPosition(_target)

    // Approach vector: stop offset world-units away from planet
    _camPos.copy(camera.position)
    const dir      = _dir.copy(_camPos).sub(_target).normalize()
    
    // Determine stop distance based on target
    let rawOffset = DEFAULT_STOP_OFFSET
    if (targetPlanetName === 'Sun')       rawOffset = SUN_STOP_OFFSET
    if (targetPlanetName === 'Milky Way') rawOffset = GALAXY_STOP_OFFSET
    
    // Scaled stop distance — planet sizes scale with scene, so offset scales too
    const stopDist = rawOffset * scale
    const goalPos  = _target.clone().addScaledVector(dir, stopDist)

    // Smooth step progress (ease in–out)
    const speed = 0.6 * delta  // covers 0→1 in ~1.7 seconds
    progressRef.current = Math.min(progressRef.current + speed, 1)
    const t = smoothstep(progressRef.current)

    // Lerp camera toward goal
    camera.position.lerpVectors(startPosRef.current, goalPos, t)
    // Softly look at the planet
    camera.lookAt(_target)

    // Update live HUD data (read by TravelHUD via rAF)
    liveTravel.traveling  = true
    liveTravel.targetName = targetPlanetName
    liveTravel.x          = +camera.position.x.toFixed(2)
    liveTravel.y          = +camera.position.y.toFixed(2)
    liveTravel.z          = +camera.position.z.toFixed(2)
    liveTravel.distance   = +_target.distanceTo(camera.position).toFixed(2)
    liveTravel.progress   = progressRef.current

    // Disable orbit controls during travel
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = false
    }

    // Arrived
    if (progressRef.current >= 1 && !arrivedRef.current) {
      arrivedRef.current = true
      // Re-enable orbit controls centred on the planet
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.target.copy(_target)
        orbitControlsRef.current.enabled = true
        orbitControlsRef.current.update()
      }
      // Reveal the destination's info page — but never mid auto-tour
      if (!useTourStore.getState().isTouring && !NO_ARRIVAL_PAGE.has(targetPlanetName)) {
        useEarthStore.getState().setCurrentPage(targetPlanetName)
      }
      endTravel()
      liveTravel.traveling = false
    }
  })

  return null
}

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}
