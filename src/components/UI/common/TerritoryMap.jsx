// Equirectangular mini world-map. Auto-fits its viewport to the supplied zones
// (or shows the whole globe when `world` is set). Each zone may carry a `color`;
// zones whose id is in `capitalIds` get a solid centre dot.

export default function TerritoryMap({ zones = [], capitalIds = [], world = false, className, ariaLabel = 'Territory map' }) {
  const W = 360, H = 180
  const caps = new Set(capitalIds)

  let left, top, spanLng, spanLat
  if (world || zones.length === 0) {
    left = -180; top = 90; spanLng = 360; spanLat = 180
  } else {
    const lats = zones.map(z => z.lat)
    const lngs = zones.map(z => z.lng)
    spanLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) + 30, 50)
    spanLat = spanLng / 2
    let cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    let cLat = (Math.min(...lats) + Math.max(...lats)) / 2
    cLng = Math.max(-180 + spanLng / 2, Math.min(180 - spanLng / 2, cLng))
    cLat = Math.max(-90 + spanLat / 2, Math.min(90 - spanLat / 2, cLat))
    left = cLng - spanLng / 2
    top = cLat + spanLat / 2
  }

  const x = lng => ((lng - left) / spanLng) * W
  const y = lat => ((top - lat) / spanLat) * H
  const step = spanLng > 200 ? 60 : spanLng > 100 ? 30 : spanLng > 60 ? 15 : 10
  const lines = (from, to) => {
    const out = []
    for (let v = Math.ceil(from / step) * step; v <= to; v += step) out.push(v)
    return out
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="#070a16" />
      {lines(left, left + spanLng).map(v => (
        <line key={'x' + v} x1={x(v)} y1="0" x2={x(v)} y2={H} stroke="rgba(255,255,255,0.05)" />
      ))}
      {lines(top - spanLat, top).map(v => (
        <line key={'y' + v} x1="0" y1={y(v)} x2={W} y2={y(v)}
          stroke={v === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'} />
      ))}
      {zones.map(z => {
        const c = z.color || '#00e5ff'
        const r = Math.max(3, Math.min(28, (z.radius / spanLng) * W * 0.9))
        return (
          <g key={z.id}>
            <circle cx={x(z.lng)} cy={y(z.lat)} r={r} fill={c} fillOpacity="0.14" stroke={c} strokeOpacity="0.7" strokeWidth="1" />
            <circle cx={x(z.lng)} cy={y(z.lat)} r={caps.has(z.id) ? 2.4 : 1.6} fill={c} />
          </g>
        )
      })}
    </svg>
  )
}
