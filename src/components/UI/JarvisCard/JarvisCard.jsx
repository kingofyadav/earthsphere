import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Globe, MapPin, Shield, Cpu, ExternalLink,
  Briefcase, Building2, Users, Link2,
  Send, MessageCircle, User, ChevronRight,
} from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { JARVIS_DNA } from '../../../data/jarvis.dna'
import styles from './JarvisCard.module.css'

const ASSET_ICON = {
  domain:       <Link2 size={12} />,
  business:     <Building2 size={12} />,
  organization: <Briefcase size={12} />,
  community:    <Users size={12} />,
}

const TRUST_LABELS = ['Unverified', 'Self-Sovereign', 'Public Verified', 'Chain Stamped']

const QUICK_LINKS = [
  { label: 'Blog',        href: 'https://kingofyadav.in/pages/blog.html' },
  { label: 'Work',        href: 'https://kingofyadav.in/pages/professional.html' },
  { label: 'Collaborate', href: 'https://kingofyadav.in/pages/collaboration.html' },
  { label: 'Wallet',      href: 'https://kingofyadav.in/wallet/' },
]

const CHAT_API    = 'https://kingofyadav.in/api/jarvis-chat'
const WELCOME_MSG = {
  role: 'assistant',
  content: "Hi! I'm Jarvis — Amit's AI assistant. Ask me about his work, services, ventures, or the HI platform.",
}

function TrustBar({ level }) {
  return (
    <div className={styles.trustRow}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`${styles.trustSegment} ${i <= level ? styles.trustSegmentActive : ''}`}
        />
      ))}
      <span className={styles.trustLabel}>{TRUST_LABELS[level]}</span>
    </div>
  )
}

export default function JarvisCard() {
  const isJarvisOpen = useEarthStore((s) => s.isJarvisOpen)
  const closeJarvis  = useEarthStore((s) => s.closeJarvis)
  const jarvisTab    = useEarthStore((s) => s.jarvisTab)
  const { identity, location, assets, agent, surface } = JARVIS_DNA

  const [tab,      setTab]      = useState('profile')
  const [messages, setMessages] = useState([WELCOME_MSG])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const msgEndRef  = useRef(null)
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  useEffect(() => {
    if (tab === 'chat') {
      msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, tab])

  useEffect(() => {
    if (isJarvisOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(jarvisTab || 'profile')
    } else {
      setInput('')
    }
  }, [isJarvisOpen, jarvisTab])

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setSending(true)
    const ctrl = new AbortController()
    try {
      const r = await fetch(CHAT_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history }),
        signal:  ctrl.signal,
      })
      const d = await r.json()
      if (!mountedRef.current) return
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: d.ok ? d.reply : 'Something went wrong. Try again.' },
      ])
    } catch (err) {
      if (!mountedRef.current || err.name === 'AbortError') return
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please try again.' },
      ])
    }
    if (mountedRef.current) setSending(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <AnimatePresence>
      {isJarvisOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeJarvis}
          />

          {/* Card */}
          <motion.aside
            className={styles.card}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0,       opacity: 1 }}
            exit={{ x: '100%',     opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          >
            {/* Header — always visible */}
            <div className={styles.header}>
              <span className={styles.eyebrow}>
                <span className={styles.liveDot} />
                Digital Earth · HID
              </span>
              <button className={styles.closeBtn} onClick={closeJarvis} aria-label="Close">
                <X size={14} />
              </button>
            </div>

            {/* Tab pills */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${tab === 'profile' ? styles.tabActive : ''}`}
                onClick={() => setTab('profile')}
              >
                <User size={11} /> Profile
              </button>
              <button
                className={`${styles.tab} ${tab === 'chat' ? styles.tabActive : ''}`}
                onClick={() => setTab('chat')}
              >
                <MessageCircle size={11} /> Jarvis AI
              </button>
            </div>

            {/* ── Profile tab ── */}
            {tab === 'profile' && (
              <>
                {/* Avatar + identity */}
                <div className={styles.hero}>
                  <div className={styles.avatarWrap}>
                    <div className={styles.avatar}>{identity.display_name[0].toUpperCase()}</div>
                    <span className={styles.flagBadge}>{location.flag}</span>
                  </div>
                  <div className={styles.identity}>
                    <h2 className={styles.displayName}>{identity.display_name}</h2>
                    <p className={styles.fullName}>{identity.name}</p>
                    <code className={styles.handle}>{identity.handle}</code>
                  </div>
                </div>

                {/* Trust */}
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Trust Level</p>
                  <TrustBar level={identity.trust_level} />
                  <p className={styles.licenseId}>
                    <Shield size={10} /> {identity.license_id}
                  </p>
                </section>

                {/* Location */}
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Location</p>
                  <div className={styles.locationRow}>
                    <MapPin size={13} className={styles.locationIcon} />
                    <span>{location.city}, {location.country}</span>
                    <span className={styles.coords}>
                      {location.lat.toFixed(4)}° N · {location.lng.toFixed(4)}° E
                    </span>
                  </div>
                  <div className={styles.locationRow}>
                    <Globe size={13} className={styles.locationIcon} />
                    <span>{location.home_zone}</span>
                    <span className={`${styles.statusPill} ${styles.statusLive}`}>
                      {surface.online_status}
                    </span>
                  </div>
                </section>

                {/* Assets */}
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Assets · {assets.length}</p>
                  <ul className={styles.assetList}>
                    {assets.map((a) => (
                      <li key={a.id} className={styles.assetRow}>
                        <span className={styles.assetIcon}>{ASSET_ICON[a.type]}</span>
                        <span className={styles.assetLabel}>{a.label}</span>
                        <span className={styles.assetType}>{a.type}</span>
                        {a.url && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.assetExtLink}
                            aria-label={`Visit ${a.label}`}
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* AI Agent */}
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>AI Agent</p>
                  <div className={styles.agentRow}>
                    <Cpu size={13} />
                    <span>{agent.model}</span>
                    <span className={styles.agentType}>{agent.type}</span>
                  </div>
                </section>

                {/* Quick links */}
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Quick Links</p>
                  <div className={styles.quickLinks}>
                    {QUICK_LINKS.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.quickLink}
                      >
                        {l.label} <ChevronRight size={10} />
                      </a>
                    ))}
                  </div>
                </section>

                {/* Footer CTA */}
                <div className={styles.footer}>
                  <a
                    href={identity.verify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.verifyLink}
                  >
                    <Shield size={12} /> Verify Identity
                  </a>
                  <a
                    href={`https://${location.home_zone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.ctaBtn}
                  >
                    Visit Profile <ExternalLink size={12} />
                  </a>
                </div>
              </>
            )}

            {/* ── Chat tab ── */}
            {tab === 'chat' && (
              <div className={styles.chatWrap}>
                <div className={styles.chatMessages}>
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`${styles.chatMsg} ${
                        m.role === 'user' ? styles.chatMsgUser : styles.chatMsgBot
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {sending && (
                    <div className={`${styles.chatMsg} ${styles.chatMsgBot} ${styles.chatMsgTyping}`}>
                      <span /><span /><span />
                    </div>
                  )}
                  <div ref={msgEndRef} />
                </div>

                <div className={styles.chatInput}>
                  <textarea
                    className={styles.chatTextarea}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask Jarvis anything…"
                    rows={1}
                    disabled={sending}
                  />
                  <button
                    className={styles.chatSend}
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    aria-label="Send message"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            )}

          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
