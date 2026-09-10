import { useMemo } from 'react'
import { Vote, Clock, CheckCircle2, XCircle, Landmark, Handshake, MapPin, Swords } from 'lucide-react'
import { useNationStore } from '../../../store/nationStore'
import { useGovernanceStore } from '../../../store/governanceStore'
import { useTerritoryStore } from '../../../store/territoryStore'
import { useRelationStore } from '../../../store/relationStore'
import TerritoryMap from '../common/TerritoryMap'
import styles from './WorldPage.module.css'

const NATION_COLORS = ['#FFD700', '#00e5ff', '#ff6b6b', '#a78bfa', '#4ade80', '#f472b6', '#fb923c', '#38bdf8']
const nationColor = i => NATION_COLORS[i % NATION_COLORS.length]

function fmtRPC(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}
function deadlineIn(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return 'Ended'
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m left`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h left`
  return `${Math.floor(ms / 86400000)}d left`
}

function GlobalStatStrip({ items }) {
  return (
    <div className={styles.gStatStrip}>
      {items.map(s => (
        <div key={s.label} className={styles.gStat}>
          <span className={styles.gStatVal}>{s.value}</span>
          <span className={styles.gStatLbl}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── World Governance — every nation's proposals in one feed ────────────────── */
export function WorldGovernance({ onOpenNation }) {
  const proposals = useGovernanceStore(s => s.proposals)
  const nations   = useNationStore(s => s.nations)
  const nameOf = id => nations.find(n => n.id === id) || { name: 'Unknown', flag: '🏳️' }

  const { open, concluded, passed, activeNations } = useMemo(() => {
    const sorted = [...proposals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const open = sorted.filter(p => p.status === 'open')
    const concluded = sorted.filter(p => p.status !== 'open')
    return {
      open,
      concluded,
      passed: concluded.filter(p => p.status === 'passed').length,
      activeNations: new Set(proposals.map(p => p.nation_id)).size,
    }
  }, [proposals])

  const Row = ({ p }) => {
    const n = nameOf(p.nation_id)
    const total = p.votes_for.length + p.votes_against.length
    const forPct = total ? Math.round((p.votes_for.length / total) * 100) : 0
    return (
      <button className={styles.gPropRow} onClick={() => onOpenNation(p.nation_id)}>
        <span className={styles.gPropFlag}>{n.flag}</span>
        <span className={styles.gPropText}>
          <span className={styles.gPropTitle}>{p.title}</span>
          <span className={styles.gPropMeta}>
            {n.name} · {total} votes
            {' · '}
            {p.status === 'open'
              ? <><Clock size={9} /> {deadlineIn(p.deadline)}</>
              : p.status === 'passed'
                ? <><CheckCircle2 size={9} /> Passed</>
                : <><XCircle size={9} /> Rejected</>}
          </span>
        </span>
        <span className={styles.gPropBar} aria-hidden="true">
          <span className={styles.gPropBarFill} style={{ width: `${forPct}%` }} />
        </span>
      </button>
    )
  }

  return (
    <div className={styles.gWrap}>
      <GlobalStatStrip items={[
        { label: 'Proposals', value: proposals.length },
        { label: 'Open',      value: open.length },
        { label: 'Passed',    value: passed },
        { label: 'Nations',   value: activeNations },
      ]} />

      {proposals.length === 0 && (
        <div className={styles.gEmpty}><Vote size={26} /><p>No proposals anywhere yet.</p></div>
      )}

      {open.length > 0 && (
        <section className={styles.gSection}>
          <p className={styles.gSectionLabel}>Active — {open.length}</p>
          {open.map(p => <Row key={p.id} p={p} />)}
        </section>
      )}
      {concluded.length > 0 && (
        <section className={styles.gSection}>
          <p className={styles.gSectionLabel}>Concluded — {concluded.length}</p>
          {concluded.map(p => <Row key={p.id} p={p} />)}
        </section>
      )}
    </div>
  )
}

/* ── World Atlas — territory map + treasury ranking + diplomacy ─────────────── */
export function WorldAtlas({ onOpenNation }) {
  const zones     = useTerritoryStore(s => s.zones)
  const nations   = useNationStore(s => s.nations)
  const alliances = useRelationStore(s => s.alliances)
  const treaties  = useRelationStore(s => s.treaties)
  const conflicts = useRelationStore(s => s.conflicts)

  const activeNations = useMemo(() => nations.filter(n => n.status === 'active'), [nations])
  const colorByNation = useMemo(() => {
    const m = {}
    activeNations.forEach((n, i) => { m[n.id] = nationColor(i) })
    return m
  }, [activeNations])

  const paintedZones = useMemo(
    () => zones.filter(z => z.lat != null).map(z => ({ ...z, color: colorByNation[z.nation_id] || 'rgba(255,255,255,0.5)' })),
    [zones, colorByNation],
  )
  const capitalIds = useMemo(() => activeNations.map(n => n.capital_zone_id).filter(Boolean), [activeNations])

  const treasuryRank = useMemo(
    () => [...activeNations].sort((a, b) => (b.treasury_balance ?? 0) - (a.treasury_balance ?? 0)).slice(0, 6),
    [activeNations],
  )
  const maxTreasury = treasuryRank[0]?.treasury_balance || 1

  const activeAlliances = alliances.filter(a => a.status === 'active')
  const activeTreaties  = treaties.filter(t => t.status === 'active')
  const openConflicts   = conflicts.filter(c => c.status !== 'resolved')
  const flagOf = id => nations.find(n => n.id === id)?.flag ?? '🏳️'
  const nameStr = id => nations.find(n => n.id === id)?.name ?? '—'

  return (
    <div className={styles.gWrap}>
      <GlobalStatStrip items={[
        { label: 'Zones',     value: zones.length },
        { label: 'Alliances', value: activeAlliances.length },
        { label: 'Treaties',  value: activeTreaties.length },
        { label: 'Conflicts', value: openConflicts.length },
      ]} />

      <section className={styles.gSection}>
        <p className={styles.gSectionLabel}><MapPin size={11} /> Territory</p>
        <TerritoryMap world zones={paintedZones} capitalIds={capitalIds}
          className={styles.gMap} ariaLabel="World territory map" />
        <div className={styles.gLegend}>
          {activeNations.map(n => (
            <button key={n.id} className={styles.gLegendItem} onClick={() => onOpenNation(n.id)}>
              <span className={styles.gLegendDot} style={{ background: colorByNation[n.id] }} />
              {n.flag} {n.name}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.gSection}>
        <p className={styles.gSectionLabel}><Landmark size={11} /> Treasury ranking</p>
        {treasuryRank.map((n, i) => (
          <button key={n.id} className={styles.gRankRow} onClick={() => onOpenNation(n.id)}>
            <span className={styles.gRankNum}>{i + 1}</span>
            <span className={styles.gRankFlag}>{n.flag}</span>
            <span className={styles.gRankName}>{n.name}</span>
            <span className={styles.gRankBar} aria-hidden="true">
              <span className={styles.gRankBarFill} style={{ width: `${((n.treasury_balance ?? 0) / maxTreasury) * 100}%` }} />
            </span>
            <span className={styles.gRankVal}>{fmtRPC(n.treasury_balance ?? 0)}</span>
          </button>
        ))}
      </section>

      <section className={styles.gSection}>
        <p className={styles.gSectionLabel}><Handshake size={11} /> World relations</p>
        {activeAlliances.length === 0 && activeTreaties.length === 0 && openConflicts.length === 0 && (
          <p className={styles.gMuted}>No alliances, treaties or conflicts yet — found a second nation to begin.</p>
        )}
        {activeAlliances.map(a => (
          <div key={a.id} className={styles.gRelRow}>
            <Handshake size={12} className={styles.gRelIcon} />
            <span>{flagOf(a.nation_a)} {nameStr(a.nation_a)} ↔ {flagOf(a.nation_b)} {nameStr(a.nation_b)}</span>
            <span className={styles.gRelBadge}>Allied</span>
          </div>
        ))}
        {activeTreaties.map(t => (
          <div key={t.id} className={styles.gRelRow}>
            <span className={styles.gRelIcon}>📜</span>
            <span>{flagOf(t.nation_a)} {nameStr(t.nation_a)} ↔ {flagOf(t.nation_b)} {nameStr(t.nation_b)} · {t.type}</span>
            <span className={styles.gRelBadge}>Signed</span>
          </div>
        ))}
        {openConflicts.map(c => (
          <div key={c.id} className={`${styles.gRelRow} ${styles.gRelConflict}`}>
            <Swords size={12} className={styles.gRelIcon} />
            <span>{flagOf(c.nation_a)} {nameStr(c.nation_a)} ⚔ {flagOf(c.nation_b)} {nameStr(c.nation_b)}</span>
            <span className={`${styles.gRelBadge} ${styles.gRelBadgeWar}`}>Conflict</span>
          </div>
        ))}
      </section>
    </div>
  )
}
