import * as THREE from 'three'

export function latLngToVec3(lat, lng, r) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  )
}

export function vec3ToLatLng(v) {
  const r   = v.length()
  const phi = Math.acos(THREE.MathUtils.clamp(v.y / r, -1, 1))
  const theta = Math.atan2(v.z, -v.x)
  return {
    lat: 90 - phi * (180 / Math.PI),
    lng: theta * (180 / Math.PI) - 180,
  }
}
