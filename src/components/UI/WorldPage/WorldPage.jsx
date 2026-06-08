import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Search, Globe, Users, Landmark, MapPin, SortAsc, Handshake, Plus, TrendingUp } from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { useNationStore } from '../../../store/nationStore'
import styles from './WorldPage.module.css'

function fmtRPC(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}
function relTime(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1d ago'
  if (d < 30)  return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

const SORT_OPTIONS = [
  { id: 'citizens',  label: 'Citizens',  Icon: Users    },
  { id: 'treasury',  label: 'Treasury',  Icon: Landmark },
  { id: 'zones',     label: 'Zones',     Icon: MapPin   },
  { id: 'founded',   label: 'Newest',    Icon: SortAsc  },
]

function NationCard({ nation, userHdi, onView, onJoin, onLeave }) {
  const isCitizen = nation.citizen_hids.includes(userHdi)
  const isFounder = nation.founder_hid === userHdi

  return (
    <div className={styles.card}>
      <div className={styles.cardFlag}>{nation.flag}</div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardName}>{nation.name}</h3>
        <p className={styles.cardFounder}>by <span className={styles.hid}>{nation.founder_hid}</span> · {relTime(nation.founded_at)}</p>

        <div className={styles.cardStats}>
          <div className={styles.cardStat}>
            <Users size={11} />
            <span>{nation.citizen_hids.length}</span>
          </div>
          <span className={styles.dot}>·</span>
          <div className={styles.cardStat}>
            <MapPin size={11} />
            <span>{nation.zones.length}</span>
          </div>
          <span className={styles.dot}>·</span>
          <div className={styles.cardStat}>
            <Landmark size={11} />
            <span>{fmtRPC(nation.treasury_balance)} RPC</span>
          </div>
        </div>

        {nation.constitution && (
          <p className={styles.cardConstitution}>{nation.constitution.slice(0, 120)}{nation.constitution.length > 120 ? '…' : ''}</p>
        )}
      </div>

      <div className={styles.cardActions}>
        <button className={styles.btnView} onClick={() => onView(nation.id)}>
          <Globe size={13} /> View
        </button>
        {userHdi && !isFounder && (
          isCitizen
            ? <button className={styles.btnLeave} onClick={() => onLeave(nation.id)}>Leave</button>
            : <button className={styles.btnJoin}  onClick={() => onJoin(nation.id)}>Join</button>
        )}
        {isCitizen && <span className={styles.memberBadge}>{isFounder ? 'Founder' : 'Citizen'}</span>}
      </div>
    </div>
  )
}

export default function WorldPage() {
  const currentPage        = useEarthStore(s => s.currentPage)
  const setCurrentPage     = useEarthStore(s => s.setCurrentPage)
  const setCurrentNationId = useEarthStore(s => s.setCurrentNationId)
  const user               = useAuthStore(s => s.user)
  const nations            = useNationStore(s => s.nations)
  const joinNation         = useNationStore(s => s.joinNation)
  const leaveNation        = useNationStore(s => s.leaveNation)

  const [query, setQuery]   = useState('')
  const [sort, setSort]     = useState('citizens')

  const userHdi = user?.hdi ?? null

  const activeNations = useMemo(() => nations.filter(n => n.status === 'active'), [nations])
  const totalCitizens = useMemo(() => nations.reduce((t, n) => t + n.citizen_hids.length, 0), [nations])
  const totalTreasury = useMemo(() => nations.reduce((t, n) => t + (n.treasury_balance ?? 0), 0), [nations])

  const myNations = useMemo(
    () => userHdi ? activeNations.filter(n => n.citizen_hids.includes(userHdi)) : [],
    [activeNations, userHdi]
  )

  const filtered = useMemo(() => {
    let list = activeNations.slice()
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.founder_hid.toLowerCase().includes(q) ||
        (n.constitution ?? '').toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      if (sort === 'citizens') return b.citizen_hids.length - a.citizen_hids.length
      if (sort === 'treasury') return b.treasury_balance - a.treasury_balance
      if (sort === 'zones')    return b.zones.length - a.zones.length
      if (sort === 'founded')  return new Date(b.founded_at) - new Date(a.founded_at)
      return 0
    })
    return list
  }, [activeNations, query, sort])

  function openNation(id) {
    setCurrentNationId(id)
    setCurrentPage('nation')
  }

  function handleJoin(id) {
    if (userHdi) joinNation(id, userHdi)
  }

  function handleLeave(id) {
    if (userHdi) leaveNation(id, userHdi)
  }

  function handleFoundNation() {
    setCurrentPage('earth-hero')
  }

  return (
    <AnimatePresence>
      {currentPage === 'world' && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.22 } }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          {/* ── Page header bar ── */}
          <header className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <span className={styles.liveDot} aria-hidden="true" />
              <Globe size={15} className={styles.headerGlobe} aria-hidden="true" />
              <span className={styles.headerTitle}>World Nations</span>
              <span className={styles.headerSep} aria-hidden="true">·</span>
              <span className={styles.headerSub}>
                {activeNations.length} nations · {totalCitizens} citizens
              </span>
            </div>

            <div className={styles.headerRight}>
              <button className={styles.foundBtn} onClick={handleFoundNation} title="Found a new nation on Earth">
                <Plus size={12} />
                <span>Found Nation</span>
              </button>
              <button className={styles.closeBtn} onClick={() => setCurrentPage(null)} aria-label="Close World page">
                <X size={16} />
              </button>
            </div>
          </header>

          {/* ── Stats bar ── */}
          <div className={styles.statsBar}>
            <div className={styles.statChip}>
              <Globe size={11} className={styles.statIcon} />
              <span className={styles.statValue}>{activeNations.length}</span>
              <span className={styles.statLabel}>Nations</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statChip}>
              <Users size={11} className={styles.statIcon} />
              <span className={styles.statValue}>{totalCitizens}</span>
              <span className={styles.statLabel}>Citizens</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statChip}>
              <Landmark size={11} className={styles.statIcon} />
              <span className={styles.statValue}>{fmtRPC(totalTreasury)}</span>
              <span className={styles.statLabel}>World Treasury</span>
            </div>
            {myNations.length > 0 && (
              <>
                <div className={styles.statDivider} />
                <div className={`${styles.statChip} ${styles.statChipMine}`}>
                  <TrendingUp size={11} className={styles.statIcon} />
                  <span className={styles.statValue}>{myNations.length}</span>
                  <span className={styles.statLabel}>My Nations</span>
                </div>
              </>
            )}
          </div>

          <div className={styles.inner}>
            {/* ── My Nations strip ── */}
            {myNations.length > 0 && (
              <section className={styles.mySection}>
                <p className={styles.mySectionLabel}>
                  <TrendingUp size={11} /> My Nations
                </p>
                <div className={styles.myStrip}>
                  {myNations.map(n => (
                    <button key={n.id} className={styles.myChip} onClick={() => openNation(n.id)}>
                      <span className={styles.myChipFlag}>{n.flag}</span>
                      <span className={styles.myChipName}>{n.name}</span>
                      {n.founder_hid === userHdi && <span className={styles.founderTag}>Founder</span>}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Search + Sort ── */}
            <div className={styles.controls}>
              <div className={styles.searchWrap}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  className={styles.search}
                  placeholder="Search nations, founders, constitutions…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  aria-label="Search nations"
                />
                {query && <button className={styles.searchClear} onClick={() => setQuery('')} aria-label="Clear search"><X size={12} /></button>}
              </div>

              <div className={styles.sortRow}>
                <span className={styles.sortLabel}>Sort by</span>
                {SORT_OPTIONS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className={`${styles.sortBtn} ${sort === id ? styles.sortActive : ''}`}
                    onClick={() => setSort(id)}
                  >
                    <Icon size={12} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Grid ── */}
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                <Handshake size={28} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>{query ? 'No matches found' : 'No nations yet'}</p>
                <p className={styles.emptySub}>{query ? 'Try a different search term.' : 'Claim territory on Earth to found the first nation.'}</p>
                {!query && (
                  <button className={styles.emptyBtn} onClick={handleFoundNation}>
                    <Plus size={13} /> Found First Nation
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.grid}>
                {filtered.map(n => (
                  <NationCard
                    key={n.id}
                    nation={n}
                    userHdi={userHdi}
                    onView={openNation}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
