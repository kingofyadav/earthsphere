import { useState, useMemo, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Search, Globe, Users, Landmark, MapPin, SortAsc, Handshake,
  Plus, TrendingUp, Send, Heart, Trash2, MessageSquare, Newspaper, Vote,
} from 'lucide-react'
import { useEarthStore }     from '../../../store/earthStore'
import { useAuthStore }      from '../../../store/authStore'
import { useNationStore }    from '../../../store/nationStore'
import { useCommunityStore } from '../../../store/communityStore'
import { PAGE } from '../../../lib/pages'
import { WorldGovernance, WorldAtlas } from './WorldGlobal'
import styles from './WorldPage.module.css'

/* ── helpers ── */
function fmtRPC(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}
function relTime(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  const d = Math.floor(s / 86400)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}
function avatarLetter(name, hdi) {
  return (name?.[0] || hdi?.[1] || '?').toUpperCase()
}

const POST_MAX = 500

const SORT_OPTIONS = [
  { id: 'citizens', label: 'Citizens', Icon: Users    },
  { id: 'treasury', label: 'Treasury', Icon: Landmark },
  { id: 'zones',    label: 'Zones',    Icon: MapPin   },
  { id: 'founded',  label: 'Newest',   Icon: SortAsc  },
]

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
const tr   = (d) => ({ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: d })

/* ── Post Composer ─────────────────────────────────────────────────────────── */
function PostComposer({ user, onPost }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)
  const remaining = POST_MAX - text.length
  const overLimit = remaining < 0

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  function submit() {
    if (!text.trim() || overLimit) return
    onPost(text)
    setText('')
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit() }
  }

  return (
    <div className={styles.composer}>
      <div className={styles.composerIdentity}>
        <div className={styles.composerAvatar} aria-hidden="true">
          {avatarLetter(user.name, user.hdi)}
        </div>
        <div className={styles.composerIdInfo}>
          <span className={styles.composerHdi}>{user.hdi}</span>
          {user.name && <span className={styles.composerName}>{user.name}</span>}
        </div>
        <span className={styles.hdiSyncBadge}>HDI ✓</span>
      </div>

      <textarea
        ref={textareaRef}
        className={styles.composerInput}
        placeholder={`What's on your mind, ${user.hdi ?? user.name ?? 'you'}?`}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
        maxLength={POST_MAX + 10}
        aria-label="Post content"
      />

      <div className={styles.composerFooter}>
        <span className={`${styles.composerCount} ${remaining < 50 ? styles.composerCountWarn : ''} ${overLimit ? styles.composerCountOver : ''}`}>
          {remaining}
        </span>
        <span className={styles.composerHint}>Ctrl+Enter to post</span>
        <button
          className={styles.composerPostBtn}
          onClick={submit}
          disabled={!text.trim() || overLimit}
          aria-label="Submit post"
        >
          <Send size={13} /> Post
        </button>
      </div>
    </div>
  )
}

/* ── Post Card ─────────────────────────────────────────────────────────────── */
function PostCard({ post, userHdi, onLike, onDelete }) {
  const isOwn  = post.authorHdi === userHdi
  const liked  = userHdi ? post.likes.includes(userHdi) : false
  const letter = avatarLetter(post.authorName, post.authorHdi)

  return (
    <article className={styles.postCard}>
      <div className={styles.postHeader}>
        <div className={styles.postAvatar} aria-hidden="true">{letter}</div>
        <div className={styles.postMeta}>
          <span className={styles.postHdi}>{post.authorHdi}</span>
          {post.authorName && <span className={styles.postAuthorName}>{post.authorName}</span>}
        </div>
        <time className={styles.postTime} dateTime={post.createdAt}>{relTime(post.createdAt)}</time>
        {isOwn && (
          <button
            className={styles.postDeleteBtn}
            onClick={() => onDelete(post.id, userHdi)}
            aria-label="Delete post"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <p className={styles.postContent}>{post.content}</p>
      <div className={styles.postActions}>
        <button
          className={`${styles.postAction} ${liked ? styles.postActionLiked : ''}`}
          onClick={() => userHdi && onLike(post.id, userHdi)}
          aria-label={liked ? 'Unlike' : 'Like'}
          disabled={!userHdi}
        >
          <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
          <span>{post.likes.length > 0 ? post.likes.length : ''}</span>
        </button>
      </div>
    </article>
  )
}

/* ── Community Feed ────────────────────────────────────────────────────────── */
function CommunityFeed({ user, openLogin }) {
  const posts      = useCommunityStore(s => s.posts)
  const addPost    = useCommunityStore(s => s.addPost)
  const toggleLike = useCommunityStore(s => s.toggleLike)
  const deletePost = useCommunityStore(s => s.deletePost)

  function handlePost(content) {
    if (!user?.hdi) return
    addPost({ authorHdi: user.hdi, authorName: user.name ?? '', content })
  }

  return (
    <div className={styles.feedWrap}>
      {user ? (
        <PostComposer user={user} onPost={handlePost} />
      ) : (
        <div className={styles.feedGuestPrompt}>
          <MessageSquare size={20} className={styles.feedGuestIcon} />
          <p className={styles.feedGuestText}>Sign in with your HDI to post and engage with the community.</p>
          <button className={styles.feedGuestBtn} onClick={openLogin}>Sign In</button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className={styles.feedEmpty}>
          <Newspaper size={26} className={styles.feedEmptyIcon} />
          <p className={styles.feedEmptyTitle}>No posts yet</p>
          <p className={styles.feedEmptySub}>Be the first to share something with the world community.</p>
        </div>
      ) : (
        <div className={styles.feed}>
          {posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              userHdi={user?.hdi ?? null}
              onLike={toggleLike}
              onDelete={deletePost}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Nation Card ───────────────────────────────────────────────────────────── */
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
          <div className={styles.cardStat}><Users size={11} /><span>{nation.citizen_hids.length}</span></div>
          <span className={styles.dot}>·</span>
          <div className={styles.cardStat}><MapPin size={11} /><span>{nation.zones.length}</span></div>
          <span className={styles.dot}>·</span>
          <div className={styles.cardStat}><Landmark size={11} /><span>{fmtRPC(nation.treasury_balance)} RPC</span></div>
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

/* ── Nations View ──────────────────────────────────────────────────────────── */
function NationsView({ nations, userHdi, onView, onJoin, onLeave, onFoundNation }) {
  const [query, setQuery] = useState('')
  const [sort, setSort]   = useState('citizens')

  const activeNations = useMemo(() => nations.filter(n => n.status === 'active'), [nations])
  const myNations     = useMemo(
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
    list.sort((a, b) => {
      if (sort === 'citizens') return b.citizen_hids.length - a.citizen_hids.length
      if (sort === 'treasury') return b.treasury_balance - a.treasury_balance
      if (sort === 'zones')    return b.zones.length - a.zones.length
      if (sort === 'founded')  return new Date(b.founded_at) - new Date(a.founded_at)
      return 0
    })
    return list
  }, [activeNations, query, sort])

  return (
    <>
      {myNations.length > 0 && (
        <section className={styles.mySection}>
          <p className={styles.mySectionLabel}><TrendingUp size={11} /> My Nations</p>
          <div className={styles.myStrip}>
            {myNations.map(n => (
              <button key={n.id} className={styles.myChip} onClick={() => onView(n.id)}>
                <span className={styles.myChipFlag}>{n.flag}</span>
                <span className={styles.myChipName}>{n.name}</span>
                {n.founder_hid === userHdi && <span className={styles.founderTag}>Founder</span>}
              </button>
            ))}
          </div>
        </section>
      )}

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
          {query && (
            <button className={styles.searchClear} onClick={() => setQuery('')} aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </div>
        <div className={styles.sortRow}>
          <span className={styles.sortLabel}>Sort by</span>
          {SORT_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`${styles.sortBtn} ${sort === id ? styles.sortActive : ''}`}
              onClick={() => setSort(id)}
            >
              <Icon size={12} /> <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Handshake size={28} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>{query ? 'No matches found' : 'No nations yet'}</p>
          <p className={styles.emptySub}>{query ? 'Try a different search term.' : 'Claim territory on Earth to found the first nation.'}</p>
          {!query && (
            <button className={styles.emptyBtn} onClick={onFoundNation}>
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
              onView={onView}
              onJoin={onJoin}
              onLeave={onLeave}
            />
          ))}
        </div>
      )}
    </>
  )
}

/* ── Main export ───────────────────────────────────────────────────────────── */
const MAIN_TABS = [
  { id: 'nations',    label: 'Nations',    Icon: Globe         },
  { id: 'governance', label: 'Governance', Icon: Vote          },
  { id: 'atlas',      label: 'Atlas',      Icon: MapPin        },
  { id: 'feed',       label: 'Community',  Icon: MessageSquare },
]

export default function WorldPage() {
  const currentPage         = useEarthStore(s => s.currentPage)
  const setCurrentPage      = useEarthStore(s => s.setCurrentPage)
  const setCurrentNationId  = useEarthStore(s => s.setCurrentNationId)
  const setNationReturnPage = useEarthStore(s => s.setNationReturnPage)
  const isLoggedIn          = useAuthStore(s => s.isLoggedIn)
  const user                = useAuthStore(s => s.user)
  const openLoginModal      = useAuthStore(s => s.openLoginModal)
  const nations             = useNationStore(s => s.nations)
  const joinNation          = useNationStore(s => s.joinNation)
  const leaveNation         = useNationStore(s => s.leaveNation)
  const postCount           = useCommunityStore(s => s.posts.length)

  const [mainTab, setMainTab] = useState('nations')

  const userHdi       = user?.hdi ?? null

  // Make the signed-in user a citizen of the nation matching their profile
  // country (e.g. India) — their country is theirs by default; others join by hand.
  useEffect(() => {
    if (!userHdi || !user?.country) return
    const home = useNationStore.getState().nations.find(
      n => n.status === 'active' && n.name.toLowerCase() === user.country.trim().toLowerCase(),
    )
    if (home && !home.citizen_hids.includes(userHdi)) joinNation(home.id, userHdi)
  }, [userHdi, user?.country, joinNation])

  const activeNations = useMemo(() => nations.filter(n => n.status === 'active'), [nations])
  const totalCitizens = useMemo(() => nations.reduce((t, n) => t + n.citizen_hids.length, 0), [nations])
  const totalTreasury = useMemo(() => nations.reduce((t, n) => t + (n.treasury_balance ?? 0), 0), [nations])
  const myNations     = useMemo(
    () => userHdi ? activeNations.filter(n => n.citizen_hids.includes(userHdi)) : [],
    [activeNations, userHdi]
  )

  function openNation(id) {
    setNationReturnPage(PAGE.WORLD)
    setCurrentNationId(id)
    setCurrentPage(PAGE.NATION)
  }
  function handleJoin(id) {
    if (!isLoggedIn) { openLoginModal(); return }
    if (!userHdi) return
    joinNation(id, userHdi)
  }
  function handleLeave(id) {
    if (!isLoggedIn) { openLoginModal(); return }
    if (!userHdi) return
    leaveNation(id, userHdi)
  }
  function handleFoundNation() {
    if (!isLoggedIn) { openLoginModal(); return }
    setCurrentPage(PAGE.EARTH_HERO)
  }

  return (
    <AnimatePresence>
      {currentPage === PAGE.WORLD && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, x: 80, transition: { duration: 0.28 } }}
          role="main"
          aria-label="World Community"
        >
          {/* ── Sticky back / close ── */}
          <button className={styles.backBtn} onClick={() => setCurrentPage(null)} aria-label="Close World">
            <X size={13} /><span>Solar System</span>
          </button>

          <div className={styles.inner}>

            {/* ══ HERO HEADER ══ */}
            <motion.header className={styles.hero} variants={fade} initial="hidden" animate="show" transition={tr(0.05)}>
              <p className={styles.eyebrow}>DIGITAL WORLD · COMMUNITY HUB · NATION PROTOCOL v0.1</p>

              <div className={styles.heroRow}>
                {/* Globe avatar */}
                <div className={styles.avatar} aria-hidden="true">
                  <Globe size={22} className={styles.avatarIcon} />
                </div>

                {/* Title */}
                <h1 className={styles.worldTag}>World</h1>

                {/* Live badge */}
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} aria-hidden="true" />LIVE
                </span>

                {/* Nation count badge */}
                <span className={styles.countBadge}>
                  <Globe size={11} />
                  {activeNations.length} Nations
                </span>

                {/* Found Nation action */}
                <button className={styles.actionBtn} onClick={handleFoundNation} title="Found a new nation">
                  <Plus size={13} />
                  <span>Found Nation</span>
                </button>
              </div>

              {/* Stats bar — same pattern as HDI page */}
              <div className={styles.statsBar}>
                {[
                  { v: activeNations.length, k: 'Nations'         },
                  { v: totalCitizens,        k: 'Citizens'        },
                  { v: fmtRPC(totalTreasury),k: 'World Treasury'  },
                  { v: postCount,             k: 'Community Posts' },
                  ...(myNations.length > 0 ? [{ v: myNations.length, k: 'My Nations', highlight: true }] : []),
                ].map(({ v, k, highlight }, i, arr) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <div className={`${styles.stat} ${highlight ? styles.statHighlight : ''}`}>
                      <span className={styles.statVal}>{v}</span>
                      <span className={styles.statKey}>{k}</span>
                    </div>
                    {i < arr.length - 1 && <div className={styles.statDiv} aria-hidden="true" />}
                  </div>
                ))}
              </div>
            </motion.header>

            {/* ── Sticky section nav — identical pattern to HDI ── */}
            <nav className={styles.sectionNav} aria-label="World sections">
              {MAIN_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`${styles.sectionNavBtn} ${mainTab === id ? styles.sectionNavBtnActive : ''}`}
                  onClick={() => setMainTab(id)}
                  aria-selected={mainTab === id}
                >
                  <Icon size={11} />
                  {label}
                  {id === 'feed' && postCount > 0 && (
                    <span className={styles.navBadge}>{postCount > 99 ? '99+' : postCount}</span>
                  )}
                </button>
              ))}
            </nav>

            {/* ── Tab content ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mainTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                {mainTab === 'nations' && (
                  <NationsView
                    nations={nations}
                    userHdi={userHdi}
                    onView={openNation}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    onFoundNation={handleFoundNation}
                  />
                )}
                {mainTab === 'governance' && <WorldGovernance onOpenNation={openNation} />}
                {mainTab === 'atlas'      && <WorldAtlas onOpenNation={openNation} />}
                {mainTab === 'feed' && (
                  <CommunityFeed user={user} openLogin={openLoginModal} />
                )}
              </motion.div>
            </AnimatePresence>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
