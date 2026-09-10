import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Globe, Landmark, Vote, Handshake,
  MapPin, Plus, ThumbsUp, ThumbsDown, Clock,
  CheckCircle2, XCircle, Coins, ChevronDown, ChevronUp,
  Share2, Check, Wifi, WifiOff, Wallet,
} from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { useNationStore } from '../../../store/nationStore'
import { useTerritoryStore } from '../../../store/territoryStore'
import { useGovernanceStore } from '../../../store/governanceStore'
import { useRelationStore } from '../../../store/relationStore'
import { rcGetStats, rcGetBalance, rcNewWallet } from '../../../lib/rupeecoin'
import { PAGE } from '../../../lib/pages'
import TerritoryMap from '../common/TerritoryMap'
import styles from './NationPanel.module.css'

/* ─────────────────── helpers ─────────────────── */
function relTime(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`
  return `${Math.floor(ms / 86400000)}d ago`
}
function deadlineIn(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return 'Ended'
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m left`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h left`
  return `${Math.floor(ms / 86400000)}d left`
}
function fmtRPC(n) { return n.toLocaleString() + ' RPC' }
function fmtCoord(lat, lng) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`
}
// Area of a circular zone of radius r km
function zoneAreaKm2(r) { return Math.PI * r * r }
function fmtArea(km2) {
  if (km2 >= 1e6) return (km2 / 1e6).toFixed(1) + 'M km²'
  if (km2 >= 1e3) return (km2 / 1e3).toFixed(0) + 'k km²'
  return Math.round(km2) + ' km²'
}

/* ─────────────────── Mini territory map ─────────────────── */
function MiniMap({ zones, capitalId }) {
  if (!zones.length) return <div className={styles.miniMapEmpty}>No territory claimed yet</div>
  const painted = zones.map(z => ({ ...z, color: z.id === capitalId ? '#FFD700' : '#00e5ff' }))
  return (
    <TerritoryMap
      zones={painted}
      capitalIds={capitalId ? [capitalId] : []}
      className={styles.miniMap}
      ariaLabel={`${zones.length} zone territory map`}
    />
  )
}

/* ─────────────────── Treasury history chart ─────────────────── */
function TreasuryChart({ txLog }) {
  const chrono = [...txLog].reverse()
  if (chrono.length < 2) return null
  const pts = chrono.reduce((acc, t) => {
    const prev = acc.length ? acc[acc.length - 1] : 0
    acc.push(prev + (t.type === 'deposit' ? t.amount : -t.amount))
    return acc
  }, [])
  const max = Math.max(...pts, 1)
  const W = 320, H = 84, n = pts.length
  const px = i => (i / (n - 1)) * W
  const py = v => H - 4 - (v / max) * (H - 10)
  const line = pts.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.tChart} role="img" aria-label="Treasury balance over time" preserveAspectRatio="none">
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="rgba(255,215,0,0.10)" />
      <polyline points={line} fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r="2" fill="#FFD700" />)}
    </svg>
  )
}

/* ─────────────────── Stat strip ─────────────────── */
function StatStrip({ items }) {
  return (
    <div className={`${styles.statRow} ${styles.statStrip}`}>
      {items.map((s, i) => (
        <div key={s.label} style={{ display: 'contents' }}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{s.value}</span>
            <span className={styles.statLbl}>{s.label}</span>
          </div>
          {i < items.length - 1 && <div className={styles.statDiv} />}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────── OverviewTab ─────────────────── */
function OverviewTab({ nation, isCitizen, userHdi, onJoin, onLeave }) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.nationHero}>
        <div className={styles.nationFlag}>{nation.flag}</div>
        <h1 className={styles.nationName}>{nation.name}</h1>
        <p className={styles.nationMeta}>
          Founded by <span className={styles.hid}>{nation.founder_hid}</span> · {relTime(nation.founded_at)}
        </p>
        <div className={styles.statRow}>
          <div className={styles.stat}><span className={styles.statNum}>{nation.citizen_hids.length}</span><span className={styles.statLbl}>Citizens</span></div>
          <div className={styles.statDiv} />
          <div className={styles.stat}><span className={styles.statNum}>{nation.zones.length}</span><span className={styles.statLbl}>Zones</span></div>
          <div className={styles.statDiv} />
          <div className={styles.stat}><span className={styles.statNum}>{fmtRPC(nation.treasury_balance)}</span><span className={styles.statLbl}>Treasury</span></div>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Constitution</h3>
        <p className={styles.constitution}>{nation.constitution}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Citizens</h3>
        <div className={styles.citizenList}>
          {nation.citizen_hids.map(hid => (
            <div key={hid} className={styles.citizenRow}>
              <span className={styles.hid}>{hid}</span>
              {hid === nation.founder_hid && <span className={styles.founderBadge}>Founder</span>}
              {hid === userHdi && <span className={styles.youBadge}>You</span>}
            </div>
          ))}
        </div>
      </section>

      {userHdi && nation.founder_hid !== userHdi && (
        isCitizen
          ? <button className={styles.btnDanger} onClick={onLeave}>Leave Nation</button>
          : <button className={styles.btnJoin} onClick={onJoin}>Join Nation</button>
      )}
    </div>
  )
}

/* ─────────────────── TerritoryTab ─────────────────── */
function TerritoryTab({ nation, zones }) {
  const nationZones = zones.filter(z => nation.zones.includes(z.id))
  const totalArea = nationZones.reduce((t, z) => t + zoneAreaKm2(z.radius), 0)

  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <MiniMap zones={nationZones} capitalId={nation.capital_zone_id} />
      </section>

      <StatStrip items={[
        { label: 'Zones',    value: nationZones.length },
        { label: 'Coverage', value: fmtArea(totalArea) },
        { label: 'Citizens', value: nation.citizen_hids.length },
      ]} />

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Zones</h3>
        <div className={styles.zoneList}>
          {nationZones.length === 0 && <p className={styles.empty}>No zones yet. Claim territory on Earth and assign it to this nation.</p>}
          {nationZones.map(z => (
            <div key={z.id} className={styles.zoneRow}>
              <MapPin size={13} className={z.id === nation.capital_zone_id ? styles.capitalIcon : styles.zoneIcon} />
              <div className={styles.zoneInfo}>
                <span className={styles.zoneName}>{z.name}</span>
                <span className={styles.zoneCoord}>{fmtCoord(z.lat, z.lng)} · r{z.radius}km · {fmtArea(zoneAreaKm2(z.radius))}</span>
              </div>
              {z.id === nation.capital_zone_id && <span className={styles.capitalBadge}>Capital</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ─────────────────── TreasuryTab ─────────────────── */
function TreasuryTab({ nation, userHdi, isCitizen, isFounder, spendRPC, earnRPC, depositTreasury, withdrawTreasury, txLog }) {
  const [amount, setAmount]       = useState('')
  const [note,   setNote]         = useState('')
  const [error,  setError]        = useState('')
  const [done,   setDone]         = useState(false)
  const [wAmount, setWAmount]     = useState('')
  const [wNote,   setWNote]       = useState('')
  const [wError,  setWError]      = useState('')
  const [stats,  setStats]        = useState(null)
  const [statsErr, setStatsErr]   = useState(false)
  const [onchainBal, setOnchainBal] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)

  const userBalance = useAuthStore(s => s.user?.rpcBalance ?? 0)
  const rcAddress   = useAuthStore(s => s.user?.rcAddress ?? null)
  const setRcAddress = useAuthStore(s => s.setRcAddress)

  /* fetch chain stats */
  useEffect(() => {
    let alive = true
    rcGetStats()
      .then(data => { if (alive) setStats(data) })
      .catch(() => { if (alive) setStatsErr(true) })
    return () => { alive = false }
  }, [])

  /* fetch on-chain balance when address is set */
  useEffect(() => {
    if (!rcAddress) return
    let alive = true
    rcGetBalance(rcAddress)
      .then(data => { if (alive) setOnchainBal(data.balance ?? data.confirmed ?? 0) })
      .catch(() => { if (alive) setOnchainBal(null) })
    return () => { alive = false }
  }, [rcAddress])

  async function handleCreateWallet() {
    setWalletLoading(true)
    try {
      const w = await rcNewWallet()
      setRcAddress(w.address)
    } catch {
      /* server offline — silently skip */
    } finally {
      setWalletLoading(false)
    }
  }

  const doneTimerRef = useRef(null)
  useEffect(() => () => { if (doneTimerRef.current) clearTimeout(doneTimerRef.current) }, [])

  function contribute() {
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    if (amt > userBalance) { setError(`You only have ${fmtRPC(userBalance)}.`); return }
    spendRPC(amt)
    depositTreasury(nation.id, userHdi, amt, note.trim() || 'Contribution')
    setAmount(''); setNote(''); setError(''); setDone(true)
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
    doneTimerRef.current = setTimeout(() => setDone(false), 2500)
  }

  const nationTx    = txLog.filter(t => t.nation_id === nation.id)
  const nationTxLog = nationTx.slice(0, 20)
  const contributors = new Set(nationTx.filter(t => t.type === 'deposit').map(t => t.hid)).size

  function withdraw() {
    const amt = Number(wAmount)
    if (!amt || amt <= 0) { setWError('Enter a valid amount.'); return }
    if (amt > nation.treasury_balance) { setWError(`Treasury holds ${fmtRPC(nation.treasury_balance)}.`); return }
    withdrawTreasury(nation.id, userHdi, amt, wNote.trim() || 'Withdrawal')
    earnRPC?.(amt)
    setWAmount(''); setWNote(''); setWError('')
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.treasuryHero}>
        <Coins size={22} className={styles.treasuryIcon} />
        <div className={styles.treasuryBalance}>{fmtRPC(nation.treasury_balance)}</div>
        <div className={styles.treasuryLbl}>National Treasury</div>
        <TreasuryChart txLog={nationTx} />
      </div>

      <StatStrip items={[
        { label: 'Deposits',     value: nationTx.filter(t => t.type === 'deposit').length },
        { label: 'Contributors', value: contributors },
        { label: 'Transactions', value: nationTx.length },
      ]} />

      {isFounder && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Withdraw (Founder)</h3>
          <div className={styles.contributeRow}>
            <input className={styles.input} type="number" min="1" placeholder="Amount (RPC)"
              value={wAmount} onChange={e => { setWAmount(e.target.value); setWError('') }} />
            <input className={styles.input} placeholder="Reason" value={wNote}
              onChange={e => setWNote(e.target.value)} maxLength={60} />
          </div>
          {wError && <p className={styles.error}>{wError}</p>}
          <button className={styles.btnContribute} onClick={withdraw}>Withdraw from Treasury</button>
        </section>
      )}

      {/* On-chain stats */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {statsErr
            ? <><WifiOff size={11} /> Chain · offline</>
            : <><Wifi size={11} /> RupeeCoin Chain</>
          }
        </h3>
        {statsErr ? (
          <p className={styles.chainError}>Start the rupeecoin server on port 9944 to see live data.</p>
        ) : stats ? (
          <div className={styles.chainStats}>
            <div className={styles.chainStat}>
              <span className={styles.chainStatVal}>{stats.blocks ?? stats.block_count ?? '—'}</span>
              <span className={styles.chainStatLbl}>Blocks</span>
            </div>
            <div className={styles.chainStat}>
              <span className={styles.chainStatVal}>{stats.pending_txs ?? stats.mempool ?? '—'}</span>
              <span className={styles.chainStatLbl}>Pending TXs</span>
            </div>
            <div className={styles.chainStat}>
              <span className={styles.chainStatVal}>{stats.circulating ?? stats.total_supply ?? '—'}</span>
              <span className={styles.chainStatLbl}>Circulating</span>
            </div>
          </div>
        ) : (
          <p className={styles.chainError}>Loading…</p>
        )}

        {/* Wallet connect */}
        <div className={styles.walletRow} style={{ marginTop: '0.75rem' }}>
          {rcAddress ? (
            <>
              <Wallet size={12} style={{ color: '#00ff88', flexShrink: 0 }} />
              <span className={styles.walletAddr}>{rcAddress}</span>
              {onchainBal !== null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#FFD700' }}>{onchainBal} RPC</span>}
            </>
          ) : (
            <button className={styles.btnWallet} onClick={handleCreateWallet} disabled={walletLoading}>
              <Wallet size={13} />{walletLoading ? 'Creating…' : 'Create Chain Wallet'}
            </button>
          )}
        </div>
      </section>

      {isCitizen && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Contribute</h3>
          <div className={styles.contributeRow}>
            <input
              className={styles.input} type="number" min="1" placeholder="Amount (RPC)"
              value={amount} onChange={e => { setAmount(e.target.value); setError('') }}
            />
            <input
              className={styles.input} placeholder="Note (optional)"
              value={note} onChange={e => setNote(e.target.value)} maxLength={60}
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {done  && <p className={styles.success}>✓ Contributed!</p>}
          <p className={styles.balanceHint}>Your balance: {fmtRPC(userBalance)}</p>
          <button className={styles.btnContribute} onClick={contribute}>Contribute to Treasury</button>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Transactions</h3>
        {nationTxLog.length === 0 && <p className={styles.empty}>No transactions yet.</p>}
        <div className={styles.txList}>
          {nationTxLog.map(tx => (
            <div key={tx.id} className={styles.txRow}>
              <span className={`${styles.txType} ${tx.type === 'deposit' ? styles.txDeposit : styles.txWithdraw}`}>
                {tx.type === 'deposit' ? '+' : '-'}{fmtRPC(tx.amount)}
              </span>
              <span className={styles.txNote}>{tx.note || tx.hid}</span>
              <span className={styles.txTime}>{relTime(tx.ts)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ─────────────────── ProposalCard ─────────────────── */
function ProposalCard({ p, expanded, setExpanded, userHdi, isCitizen, vote }) {
  const total  = p.votes_for.length + p.votes_against.length
  const forPct = total ? Math.round((p.votes_for.length / total) * 100) : 0
  const myVote = p.votes_for.includes(userHdi) ? 'for' : p.votes_against.includes(userHdi) ? 'against' : null
  const isOpen = p.status === 'open'
  const exp    = expanded === p.id

  return (
    <div className={`${styles.proposalCard} ${p.status !== 'open' ? styles.proposalDone : ''}`}>
      <div className={styles.proposalHeader} onClick={() => setExpanded(exp ? null : p.id)}>
        <div className={styles.proposalTitleRow}>
          {p.status === 'passed'   && <CheckCircle2 size={13} className={styles.iconPassed} />}
          {p.status === 'rejected' && <XCircle      size={13} className={styles.iconRejected} />}
          {p.status === 'open'     && <Clock        size={13} className={styles.iconOpen} />}
          <span className={styles.proposalTitle}>{p.title}</span>
        </div>
        <div className={styles.proposalMeta}>
          <span className={styles.proposalTime}>{isOpen ? deadlineIn(p.deadline) : p.status}</span>
          {exp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>
      {exp && (
        <div className={styles.proposalBody}>
          <p className={styles.proposalDesc}>{p.description}</p>
          <div className={styles.voteBar}>
            <div className={styles.voteBarFill} style={{ width: `${forPct}%` }} />
          </div>
          <div className={styles.voteStats}>
            <span className={styles.voteFor}>{p.votes_for.length} For</span>
            <span className={styles.voteAgainst}>{p.votes_against.length} Against</span>
          </div>
          {isCitizen && isOpen && (
            <div className={styles.voteRow}>
              <button
                className={`${styles.btnVote} ${myVote === 'for' ? styles.btnVoteForActive : ''}`}
                onClick={() => vote(p.id, userHdi, 'for')}
              >
                <ThumbsUp size={13} /> For
              </button>
              <button
                className={`${styles.btnVote} ${myVote === 'against' ? styles.btnVoteAgainstActive : ''}`}
                onClick={() => vote(p.id, userHdi, 'against')}
              >
                <ThumbsDown size={13} /> Against
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────── GovernanceTab ─────────────────── */
function GovernanceTab({ nation, proposals, userHdi, isCitizen, createProposal, vote, finalizeExpired }) {
  const [showCreate, setShowCreate] = useState(false)
  const [title,    setTitle]        = useState('')
  const [desc,     setDesc]         = useState('')
  const [days,     setDays]         = useState(7)
  const [error,    setError]        = useState('')
  const [expanded, setExpanded]     = useState(null)

  useEffect(() => { finalizeExpired() }, [finalizeExpired])

  const nationProps = proposals.filter(p => p.nation_id === nation.id)
  const open     = nationProps.filter(p => p.status === 'open')
  const finished = nationProps.filter(p => p.status !== 'open')
  const passed   = finished.filter(p => p.status === 'passed').length
  const voters   = new Set(nationProps.flatMap(p => [...p.votes_for, ...p.votes_against])).size
  const turnout  = nation.citizen_hids.length
    ? Math.round((voters / nation.citizen_hids.length) * 100) : 0

  function handleCreate() {
    if (!title.trim()) { setError('Proposal needs a title.'); return }
    if (!desc.trim())  { setError('Add a description.'); return }
    createProposal({ nation_id: nation.id, title: title.trim(), description: desc.trim(), proposer_hid: userHdi, deadline_days: days })
    setTitle(''); setDesc(''); setError('')
    setShowCreate(false)
  }

  return (
    <div className={styles.tabContent}>
      {nationProps.length > 0 && (
        <StatStrip items={[
          { label: 'Open',    value: open.length },
          { label: 'Passed',  value: passed },
          { label: 'Turnout', value: `${turnout}%` },
        ]} />
      )}

      {isCitizen && (
        <div className={styles.govActions}>
          <button className={styles.btnCreateProposal} onClick={() => setShowCreate(s => !s)}>
            <Plus size={14} /> New Proposal
          </button>
        </div>
      )}

      {showCreate && (
        <div className={styles.createForm}>
          <input className={styles.input} placeholder="Proposal title" value={title} onChange={e => { setTitle(e.target.value); setError('') }} maxLength={80} />
          <textarea className={styles.textarea} placeholder="Describe this proposal..." value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} rows={3} />
          <div className={styles.daysRow}>
            <span className={styles.daysLbl}>Deadline:</span>
            {[3, 7, 14, 30].map(d => (
              <button key={d} className={`${styles.dayBtn} ${days === d ? styles.dayActive : ''}`} onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btnSubmitProposal} onClick={handleCreate}>Submit Proposal</button>
        </div>
      )}

      {open.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Active</h3>
          {open.map(p => <ProposalCard key={p.id} p={p} expanded={expanded} setExpanded={setExpanded} userHdi={userHdi} isCitizen={isCitizen} vote={vote} />)}
        </section>
      )}
      {finished.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Concluded</h3>
          {finished.map(p => <ProposalCard key={p.id} p={p} expanded={expanded} setExpanded={setExpanded} userHdi={userHdi} isCitizen={isCitizen} vote={vote} />)}
        </section>
      )}
      {nationProps.length === 0 && (
        <p className={styles.empty}>No proposals yet. {isCitizen ? 'Start the first one.' : ''}</p>
      )}
    </div>
  )
}

/* ─────────────────── DiplomacyTab ─────────────────── */
function DiplomacyTab({ nation, nations, isFounder, proposeAlliance, acceptAlliance, rejectAlliance, proposeTreaty, acceptTreaty, rejectTreaty, detectConflicts, resolveConflict, zones }) {
  const alliances = useRelationStore(s => s.alliances.filter(a => a.nation_a === nation.id || a.nation_b === nation.id))
  const treaties  = useRelationStore(s => s.treaties.filter(t => t.nation_a === nation.id || t.nation_b === nation.id))
  const conflicts = useRelationStore(s => s.conflicts.filter(c =>
    (c.nation_a === nation.id || c.nation_b === nation.id) && c.status !== 'resolved'))
  const [allyTarget, setAllyTarget]     = useState('')
  const [treatyTarget, setTreatyTarget] = useState('')
  const [treatyType, setTreatyType]     = useState('trade')

  const otherNations = nations.filter(n => n.id !== nation.id && n.status === 'active')

  /* re-detect conflicts whenever zones list changes */
  useEffect(() => { detectConflicts(zones) }, [zones, detectConflicts])

  function partnerName(a) {
    const partnerId = a.nation_a === nation.id ? a.nation_b : a.nation_a
    return nations.find(n => n.id === partnerId)?.name ?? partnerId
  }
  function partnerFlag(id) { return nations.find(n => n.id === id)?.flag ?? '🌐' }

  const activeAllies = alliances.filter(a => a.status === 'active').length
  const activeTreaties = treaties.filter(t => t.status === 'active').length

  return (
    <div className={styles.tabContent}>
      <StatStrip items={[
        { label: 'Allies',    value: activeAllies },
        { label: 'Treaties',  value: activeTreaties },
        { label: 'Conflicts', value: conflicts.length },
      ]} />

      {otherNations.length === 0 && (
        <p className={styles.empty}>Diplomacy opens up once another nation is founded.</p>
      )}

      {/* Conflicts alert */}
      {conflicts.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Zone Conflicts</h3>
          <div className={styles.conflictList}>
            {conflicts.map(c => {
              const otherId = c.nation_a === nation.id ? c.nation_b : c.nation_a
              const other   = nations.find(n => n.id === otherId)
              return (
                <div key={c.id} className={styles.conflictRow}>
                  <span style={{ fontSize: '1.2rem' }}>{other?.flag ?? '⚔️'}</span>
                  <div className={styles.conflictInfo}>
                    <span className={styles.conflictName}>{other?.name ?? otherId}</span>
                    <span className={styles.conflictMeta}>Zone overlap detected</span>
                  </div>
                  <span className={styles.badgeConflict}>Conflict</span>
                  {isFounder && <button className={styles.btnResolve} onClick={() => resolveConflict(c.id)}>Resolve</button>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Alliances */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Alliances</h3>
        {alliances.length === 0 && <p className={styles.empty}>No alliances yet.</p>}
        <div className={styles.allianceList}>
          {alliances.map(a => (
            <div key={a.id} className={styles.allianceRow}>
              <span style={{ fontSize: '1.2rem' }}>{partnerFlag(a.nation_a === nation.id ? a.nation_b : a.nation_a)}</span>
              <div className={styles.allianceInfo}>
                <span className={styles.allianceName}>{partnerName(a)}</span>
                <span className={styles.allianceMeta}>{a.status === 'pending' ? `Proposed ${relTime(a.proposed_at)}` : `Allied ${a.accepted_at ? relTime(a.accepted_at) : ''}`}</span>
              </div>
              {a.status === 'active'  && <span className={styles.badgeActive}>Allied</span>}
              {a.status === 'pending' && a.nation_b === nation.id && isFounder && (
                <div className={styles.dipActions}>
                  <button className={styles.btnAccept} onClick={() => acceptAlliance(a.id)}>Accept</button>
                  <button className={styles.btnReject} onClick={() => rejectAlliance(a.id)}>Decline</button>
                </div>
              )}
              {a.status === 'pending' && a.nation_a === nation.id && <span className={styles.badgePending}>Pending</span>}
            </div>
          ))}
        </div>

        {isFounder && otherNations.length > 0 && (
          <div className={styles.dipSelectRow} style={{ marginTop: '0.75rem' }}>
            <select className={styles.dipSelect} value={allyTarget} onChange={e => setAllyTarget(e.target.value)}>
              <option value="">Propose alliance with…</option>
              {otherNations.map(n => <option key={n.id} value={n.id}>{n.flag} {n.name}</option>)}
            </select>
            <button
              className={styles.btnPropose}
              disabled={!allyTarget}
              onClick={() => { if (allyTarget) { proposeAlliance(nation.id, allyTarget); setAllyTarget('') } }}
            >
              <Handshake size={14} /> Propose Alliance
            </button>
          </div>
        )}
      </section>

      {/* Treaties */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Treaties</h3>
        {treaties.length === 0 && <p className={styles.empty}>No treaties signed.</p>}
        <div className={styles.treatyList}>
          {treaties.map(t => {
            const partnerId = t.nation_a === nation.id ? t.nation_b : t.nation_a
            const other = nations.find(n => n.id === partnerId)
            return (
              <div key={t.id} className={styles.treatyRow}>
                <span style={{ fontSize: '1.2rem' }}>{other?.flag ?? '📜'}</span>
                <div className={styles.treatyInfo}>
                  <span className={styles.treatyName}>{other?.name ?? partnerId} — {t.type}</span>
                  <span className={styles.treatyMeta}>{t.status === 'pending' ? 'Awaiting signature' : `Signed ${t.signed_at ? relTime(t.signed_at) : ''}`}</span>
                </div>
                {t.status === 'active'  && <span className={styles.badgeActive}>Active</span>}
                {t.status === 'pending' && t.nation_b === nation.id && isFounder && (
                  <div className={styles.dipActions}>
                    <button className={styles.btnAccept} onClick={() => acceptTreaty(t.id)}>Sign</button>
                    <button className={styles.btnReject} onClick={() => rejectTreaty(t.id)}>Decline</button>
                  </div>
                )}
                {t.status === 'pending' && t.nation_a === nation.id && <span className={styles.badgePending}>Pending</span>}
              </div>
            )
          })}
        </div>

        {isFounder && otherNations.length > 0 && (
          <div className={styles.dipSelectRow} style={{ marginTop: '0.75rem' }}>
            <select className={styles.dipSelect} value={treatyTarget} onChange={e => setTreatyTarget(e.target.value)}>
              <option value="">Propose treaty with…</option>
              {otherNations.map(n => <option key={n.id} value={n.id}>{n.flag} {n.name}</option>)}
            </select>
            <select className={styles.dipSelect} value={treatyType} onChange={e => setTreatyType(e.target.value)}>
              <option value="trade">Trade Treaty</option>
              <option value="nonaggression">Non-Aggression Pact</option>
              <option value="defense">Mutual Defense</option>
            </select>
            <button
              className={styles.btnPropose}
              disabled={!treatyTarget}
              onClick={() => { if (treatyTarget) { proposeTreaty(nation.id, treatyTarget, treatyType); setTreatyTarget('') } }}
            >
              <Plus size={14} /> Propose Treaty
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

/* ─────────────────── main panel ─────────────────── */
const TABS = [
  { id: 'overview',   label: 'Overview',   Icon: Globe      },
  { id: 'territory',  label: 'Territory',  Icon: MapPin     },
  { id: 'treasury',   label: 'Treasury',   Icon: Landmark   },
  { id: 'governance', label: 'Governance', Icon: Vote       },
  { id: 'diplomacy',  label: 'Diplomacy',  Icon: Handshake  },
]

export default function NationPanel() {
  const currentPage        = useEarthStore(s => s.currentPage)
  const setCurrentPage     = useEarthStore(s => s.setCurrentPage)
  const currentNationId    = useEarthStore(s => s.currentNationId)
  const setCurrentNationId = useEarthStore(s => s.setCurrentNationId)
  const nationReturnPage   = useEarthStore(s => s.nationReturnPage)
  const setNationReturnPage = useEarthStore(s => s.setNationReturnPage)
  const user               = useAuthStore(s => s.user)
  const spendRPC           = useAuthStore(s => s.spendRPC)
  const earnRPC            = useAuthStore(s => s.earnRPC)
  const nations            = useNationStore(s => s.nations)
  const joinNation         = useNationStore(s => s.joinNation)
  const leaveNation        = useNationStore(s => s.leaveNation)
  const depositTreasury    = useNationStore(s => s.depositTreasury)
  const withdrawTreasury   = useNationStore(s => s.withdrawTreasury)
  const txLog              = useNationStore(s => s.txLog)
  const zones              = useTerritoryStore(s => s.zones)
  const proposals          = useGovernanceStore(s => s.proposals)
  const createProposal     = useGovernanceStore(s => s.createProposal)
  const vote               = useGovernanceStore(s => s.vote)
  const finalizeExpired    = useGovernanceStore(s => s.finalizeExpired)
  const proposeAlliance    = useRelationStore(s => s.proposeAlliance)
  const acceptAlliance     = useRelationStore(s => s.acceptAlliance)
  const rejectAlliance     = useRelationStore(s => s.rejectAlliance)
  const proposeTreaty      = useRelationStore(s => s.proposeTreaty)
  const acceptTreaty       = useRelationStore(s => s.acceptTreaty)
  const rejectTreaty       = useRelationStore(s => s.rejectTreaty)
  const detectConflicts    = useRelationStore(s => s.detectConflicts)
  const resolveConflict    = useRelationStore(s => s.resolveConflict)

  const [activeTab, setActiveTab] = useState('overview')
  const [copied,    setCopied]    = useState(false)

  const isOpen = currentPage === PAGE.NATION
  const nation = nations.find(n => n.id === currentNationId) ?? null

  /* Step 10: sync URL when panel opens/closes */
  useEffect(() => {
    if (isOpen && currentNationId) {
      window.history.replaceState(null, '', `?nation=${currentNationId}`)
    } else {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [isOpen, currentNationId])

  const userHdi   = user?.hdi ?? null
  const isCitizen = nation ? nation.citizen_hids.includes(userHdi) : false
  const isFounder = nation ? nation.founder_hid === userHdi : false

  function close() {
    setCurrentPage(nationReturnPage ?? null)
    setNationReturnPage(null)
    setCurrentNationId(null)
    setActiveTab('overview')
  }

  const shareUrl = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?nation=${currentNationId}`
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [currentNationId])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.22 } }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <button className={styles.backBtn} onClick={close}>
            <ArrowLeft size={12} /> Back
          </button>

          {nation && (
            <button className={`${styles.shareBtn} ${copied ? styles.shareDone : ''}`} onClick={shareUrl}>
              {copied ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share</>}
            </button>
          )}

          <div className={styles.inner}>
            {!nation ? (
              <p className={styles.empty}>Nation not found.</p>
            ) : (
              <>
                {/* Tab bar */}
                <div className={styles.tabBar} role="tablist" aria-label="Nation sections">
                  {TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={activeTab === id}
                      className={`${styles.tabBtn} ${activeTab === id ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab(id)}
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  >
                    {activeTab === 'overview' && (
                      <OverviewTab
                        nation={nation}
                        isCitizen={isCitizen}
                        userHdi={userHdi}
                        onJoin={() => userHdi && joinNation(nation.id, userHdi)}
                        onLeave={() => userHdi && leaveNation(nation.id, userHdi)}
                      />
                    )}
                    {activeTab === 'territory' && (
                      <TerritoryTab nation={nation} zones={zones} />
                    )}
                    {activeTab === 'treasury' && (
                      <TreasuryTab
                        nation={nation}
                        userHdi={userHdi}
                        isCitizen={isCitizen}
                        isFounder={isFounder}
                        spendRPC={spendRPC}
                        earnRPC={earnRPC}
                        depositTreasury={depositTreasury}
                        withdrawTreasury={withdrawTreasury}
                        txLog={txLog}
                      />
                    )}
                    {activeTab === 'governance' && (
                      <GovernanceTab
                        nation={nation}
                        proposals={proposals}
                        userHdi={userHdi}
                        isCitizen={isCitizen}
                        createProposal={createProposal}
                        vote={vote}
                        finalizeExpired={finalizeExpired}
                      />
                    )}
                    {activeTab === 'diplomacy' && (
                      <DiplomacyTab
                        nation={nation}
                        nations={nations}
                        isFounder={isFounder}
                        proposeAlliance={proposeAlliance}
                        acceptAlliance={acceptAlliance}
                        rejectAlliance={rejectAlliance}
                        proposeTreaty={proposeTreaty}
                        acceptTreaty={acceptTreaty}
                        rejectTreaty={rejectTreaty}
                        detectConflicts={detectConflicts}
                        resolveConflict={resolveConflict}
                        zones={zones}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
