import { Fragment, useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Search, Mic, X, Globe, Shield, Users, Monitor, Globe2, MapPin,
  MessageCircle, Wallet, FolderOpen, FileText, LayoutDashboard,
  ExternalLink, Link2, KeyRound, Clock, ArrowRight,
} from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { initAudio, playSfx } from '../../../lib/audio'
import { classify, prettyHost, webSearchUrl, openDeviceFile, fuzzyScore, matchRanges } from '../../../lib/magicSearch'
import { PAGE } from '../../../lib/pages'
import styles from './MagicSearch.module.css'

const RECENT_KEY = 'earthsphere.magicsearch.recent'
const MAX_RECENT  = 5
const MAX_RESULTS = 8

function openExt(url) { window.open(url, '_blank', 'noopener,noreferrer') }

function loadRecent() {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(v) ? v : [] }
  catch { return [] }
}
function persistRecent(ids) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT))) } catch { /* private mode */ }
}

/* Bold the matched slices of a label */
function Highlight({ text, ranges }) {
  if (!ranges || !ranges.length) return text
  const out = []
  let cursor = 0
  ranges.forEach(([s, e], i) => {
    if (s > cursor) out.push(text.slice(cursor, s))
    out.push(<mark key={i} className={styles.mark}>{text.slice(s, e)}</mark>)
    cursor = e
  })
  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

/* ── Voice-to-text (Web Speech API) ─────────────────────────────────────────── */
function useVoiceInput(onText) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const supported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-IN'
    rec.onresult = (e) => onText(Array.from(e.results).map(r => r[0].transcript).join(''))
    rec.onend   = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.abort() } catch { /* noop */ } }
  }, [supported, onText])

  const toggle = useCallback(() => {
    if (!supported || !recRef.current) return
    if (listening) { recRef.current.stop(); setListening(false); return }
    try { recRef.current.start(); setListening(true) } catch { /* already running */ }
  }, [supported, listening])

  return { supported: Boolean(supported), listening, toggle }
}

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function MagicSearch() {
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)
  const openJarvisChat = useEarthStore(s => s.openJarvisChat)
  const assets         = useAuthStore(s => s.assets)
  const isLoggedIn     = useAuthStore(s => s.isLoggedIn)
  const openLoginModal = useAuthStore(s => s.openLoginModal)
  const addAsset       = useAuthStore(s => s.addAsset)

  const [query,     setQuery]     = useState('')
  const [active,    setActive]    = useState(0)
  const [prevQuery, setPrevQuery] = useState('')
  const [recentIds, setRecentIds] = useState(loadRecent)
  const inputRef = useRef(null)
  const listRef  = useRef(null)
  const voice = useVoiceInput(setQuery)

  const goJarvis = useCallback(() => { setCurrentPage(null); openJarvisChat() }, [setCurrentPage, openJarvisChat])

  const openFile = useCallback(async () => {
    if (!isLoggedIn) { openLoginModal(); return }
    const f = await openDeviceFile()
    if (!f) return
    addAsset('documents', { title: f.name, name: f.name, size: f.size, mime: f.type })
    setCurrentPage(PAGE.HDI)
  }, [isLoggedIn, openLoginModal, addAsset, setCurrentPage])

  /* Commands + apps — the fixed catalog */
  const catalog = useMemo(() => {
    const mk = (id, name, label, sublabel, Icon, run, extra = {}) =>
      ({ id, name, group: extra.group || 'command', label, sublabel, Icon,
         keywords: extra.keywords || '', transient: extra.transient || false, run })
    return [
      mk('profile',   'profile',   'HDI Profile',    'Your sovereign identity',        Shield,          () => setCurrentPage(PAGE.HDI),           { keywords: 'identity trust passport me' }),
      mk('dashboard', 'dashboard', 'Dashboard',      'Solar system overview',          LayoutDashboard, () => setCurrentPage(null),               { keywords: 'home overview solar system' }),
      mk('world',     'world',     'World Nations',  'Nations, citizens & community',   Users,           () => setCurrentPage(PAGE.WORLD),         { keywords: 'community nation citizens social' }),
      mk('surface',   'surface',   'Surface Workspace', 'White workspace to build',     Monitor,         () => setCurrentPage(PAGE.SURFACE),       { keywords: 'workspace apps build white' }),
      mk('earth',     'earth',     'Earth Surface Map', 'Territory map — claim zones',  Globe2,          () => setCurrentPage(PAGE.EARTH_SURFACE), { keywords: 'map territory claim zone land gps' }),
      mk('claim',     'claim',     'Claim Territory', 'Stake a zone on the globe',      MapPin,          () => setCurrentPage(PAGE.EARTH_SURFACE), { keywords: 'territory land zone stake own' }),
      mk('jarvis',    'jarvis',    'Ask Jarvis AI',  'Talk to your agent',             MessageCircle,   goJarvis,                                 { keywords: 'ai chat assistant agent ask' }),
      mk('wallet',    'wallet',    'Wallet',         'Wallet & assets in your HDI',     Wallet,          () => setCurrentPage(PAGE.HDI),           { keywords: 'coin money rupeecoin assets balance' }),
      mk('file',      'file',      'Open File',      'Add a document from your device', FolderOpen,      openFile,                                 { keywords: 'upload document import attach device' }),
      mk('0dot',      '0dot',      '0dot Identity',  '0dot.in — claim your profile & domain', ExternalLink, () => openExt('https://0dot.in'),   { group: 'app', keywords: 'identity profile domain username portfolio site', transient: true }),
      mk('web',       'web',       'Web Search',     'Search the internet',             Globe,           () => openExt('https://duckduckgo.com'),  { keywords: 'internet google duckduckgo browse', transient: true }),
    ]
  }, [setCurrentPage, goJarvis, openFile])

  /* Files — the user's HDI assets */
  const fileItems = useMemo(() => {
    const A = assets || {}
    const mk = (id, label, sublabel, Icon, run) =>
      ({ id, group: 'file', label: label || 'Untitled', sublabel, Icon, keywords: '', transient: false, run })
    const out = []
    ;(A.documents   || []).forEach(d => out.push(mk('doc:'  + d.id, d.title || d.name, 'Document',   FileText, () => setCurrentPage(PAGE.HDI))))
    ;(A.credentials || []).forEach(c => out.push(mk('cred:' + c.id, c.name,            'Credential', KeyRound, () => setCurrentPage(PAGE.HDI))))
    ;(A.domains     || []).forEach(d => d.name && out.push(mk('dom:' + d.id, d.name,   'Domain',     Link2,    () => openExt('https://' + d.name.replace(/^https?:\/\//, '')))))
    ;(A.wallets     || []).forEach(w => out.push(mk('wal:'  + w.id, w.label || w.address, 'Wallet',  Wallet,   () => setCurrentPage(PAGE.HDI))))
    return out
  }, [assets, setCurrentPage])

  /* Grouped results for the current query */
  const sections = useMemo(() => {
    const c = classify(query)
    const all = [...catalog, ...fileItems]

    if (c.mode === 'url') {
      return [{ title: 'Open site', items: [{
        id: 'open-url', group: 'web', Icon: Globe, transient: true,
        label: prettyHost(c.url), sublabel: c.url, badge: 'ENTER',
        run: () => openExt(c.url),
      }] }]
    }

    if (c.mode === 'dot') {
      const items = catalog
        .map(x => ({ x, s: Math.max(fuzzyScore(c.term, x.name), fuzzyScore(c.term, x.label)) }))
        .filter(o => !c.term || o.s > 0)
        .sort((a, b) => b.s - a.s)
        .map(o => ({ ...o.x, badge: '.' + o.x.name, ranges: matchRanges(c.term, o.x.label) }))
      return items.length ? [{ title: 'Commands', items }] : []
    }

    if (c.mode === 'search') {
      const scored = all
        .map(x => ({
          x,
          s: Math.max(
            fuzzyScore(c.term, x.label),
            fuzzyScore(c.term, x.keywords) * 0.7,
            fuzzyScore(c.term, x.sublabel || '') * 0.4,
          ),
        }))
        .filter(o => o.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, MAX_RESULTS)
        .map(o => ({ ...o.x, ranges: matchRanges(c.term, o.x.label) }))

      const order = ['command', 'app', 'file']
      const titles = { command: 'Commands', app: 'Apps', file: 'Your files' }
      const groups = order
        .map(g => ({ title: titles[g], items: scored.filter(i => i.group === g) }))
        .filter(s => s.items.length)

      groups.push({ title: 'Web', items: [{
        id: 'web-search', group: 'web', Icon: Search, badge: 'WEB', transient: true,
        label: `Search the web for “${c.raw}”`, sublabel: 'DuckDuckGo',
        run: () => openExt(webSearchUrl(c.raw)),
      }] })
      return groups
    }

    // browse — empty query
    const recent = recentIds.map(id => all.find(x => x.id === id)).filter(Boolean)
    const seen = new Set(recent.map(x => x.id))
    const jump = catalog.filter(x => ['profile', 'world', 'earth', 'jarvis'].includes(x.name) && !seen.has(x.id))
    const out = []
    if (recent.length) out.push({ title: 'Recent', items: recent, recent: true })
    if (jump.length) out.push({ title: 'Jump to', items: jump })
    return out
  }, [query, catalog, fileItems, recentIds])

  const flat = useMemo(() => sections.flatMap(s => s.items), [sections])

  // Reset the highlight to the top when the query changes — adjusted during
  // render (React's "storing info from previous renders" pattern), not in an effect.
  if (query !== prevQuery) {
    setPrevQuery(query)
    if (active !== 0) setActive(0)
  }
  const idx = flat.length ? Math.min(active, flat.length - 1) : 0

  // Keep the active row visible
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [idx, sections])

  const run = useCallback((it) => {
    if (!it) return
    initAudio(); playSfx('click')
    if (!it.transient && !String(it.id).startsWith('open-url')) {
      setRecentIds(prev => {
        const next = [it.id, ...prev.filter(x => x !== it.id)].slice(0, MAX_RECENT)
        persistRecent(next)
        return next
      })
    }
    it.run()
    setQuery('')
  }, [])

  function onKeyDown(e) {
    if (e.nativeEvent.isComposing) return // let IME confirmation through
    const n = flat.length
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => n ? (Math.min(a, n - 1) + 1) % n : 0) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => n ? (Math.min(a, n - 1) + n - 1) % n : 0) }
    else if (e.key === 'Enter') { e.preventDefault(); run(flat[idx]) }
    else if (e.key === 'Escape') {
      if (query) setQuery(''); else inputRef.current?.blur()
    }
  }

  function handleMic() {
    initAudio()
    inputRef.current?.focus()
    voice.toggle()
  }

  const activeId = flat.length ? `ms-opt-${idx}` : undefined
  const isDot = query.trimStart().startsWith('.')
  let counter = -1

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Magic Search</h1>

      <div className={styles.box}>
        <Search size={16} className={styles.icon} aria-hidden="true" />
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search apps & files, type a URL, or . for commands"
          aria-label="Magic search"
          aria-expanded={flat.length > 0 || query.trim().length > 0}
          aria-autocomplete="list"
          aria-controls="ms-listbox"
          aria-activedescendant={activeId}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {query && (
          <button type="button" className={styles.clearBtn} onClick={() => { setQuery(''); inputRef.current?.focus() }}
            aria-label="Clear search">
            <X size={14} />
          </button>
        )}
        {voice.supported && (
          <button type="button"
            className={`${styles.micBtn} ${voice.listening ? styles.micListening : ''}`}
            onClick={handleMic}
            aria-label={voice.listening ? 'Stop listening' : 'Search by voice'}
            aria-pressed={voice.listening}>
            <Mic size={15} />
          </button>
        )}
      </div>

      {voice.listening && <p className={styles.listening}>Listening…</p>}

      <ul className={styles.list} id="ms-listbox" role="listbox" ref={listRef} aria-label="Results">
        {flat.length === 0 && query.trim() && (
          <li className={styles.empty}>
            {isDot ? 'No matching command.' : `No match for “${query.trim()}”. Press Enter to search the web.`}
          </li>
        )}

        {sections.map((section) => (
          <Fragment key={section.title}>
            <li className={styles.groupLabel} role="presentation">
              {section.recent && <Clock size={10} aria-hidden="true" />}
              {section.title}
            </li>
            {section.items.map((it) => {
              counter += 1
              const i = counter
              const isActive = i === idx
              return (
                <li
                  key={`${section.title}:${it.id}`}
                  id={`ms-opt-${i}`}
                  role="option"
                  aria-selected={isActive}
                  data-active={isActive}
                  className={`${styles.opt} ${isActive ? styles.optActive : ''}`}
                  onMouseMove={() => { if (i !== idx) setActive(i) }}
                  onClick={() => run(it)}
                >
                  <span className={styles.optIcon}><it.Icon size={15} /></span>
                  <span className={styles.optText}>
                    <span className={styles.optLabel}>
                      <Highlight text={it.label} ranges={it.ranges} />
                    </span>
                    {it.sublabel && <span className={styles.optSub}>{it.sublabel}</span>}
                  </span>
                  {it.badge
                    ? <span className={styles.optBadge}>{it.badge}</span>
                    : <ArrowRight size={13} className={styles.optArrow} aria-hidden="true" />}
                </li>
              )
            })}
          </Fragment>
        ))}
      </ul>

      <p className={styles.hint}>
        <kbd>↑</kbd><kbd>↓</kbd> navigate&nbsp;·&nbsp;<kbd>↵</kbd> open&nbsp;·&nbsp;<kbd>esc</kbd> clear
        &nbsp;·&nbsp;<code>.</code> for commands
      </p>
    </div>
  )
}
