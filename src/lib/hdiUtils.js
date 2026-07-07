export function trustLabel(score) {
  if (score < 200) return 'Unverified'
  if (score < 400) return 'Emerging'
  if (score < 600) return 'Established'
  if (score < 800) return 'Trusted'
  return 'Sovereign'
}

export function computeTrustScore(verif = {}, rels = [], assets = {}, rec = {}) {
  let s = 100
  if (verif.email)       s += 100
  if (verif.phone)       s += 150
  if (verif.govId)       s += 150
  if (verif.employer)    s += 100
  if (verif.university)  s += 100
  if (verif.socialTrust) s += 100
  s += Math.min(rels.length * 10, 50)
  s += Math.min(Object.values(assets).reduce((t, a) => t + (a?.length || 0), 0) * 10, 50)
  s += Object.values(rec).filter(Boolean).length * 25
  return Math.min(s, 1000)
}
