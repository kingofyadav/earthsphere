// Magic Search — classify an omnibox query and provide web / URL / file helpers.
//
//   .foo          → command        (config-like shortcut)
//   foo.com  /x   → website        (open URL)
//   hello world   → keyword search (apps / files locally + web fallback)

const SAFE_SCHEMES = new Set(['http', 'https'])
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
const HOST_RE =
  /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i

// Curated common TLDs. A bare "word.tld" with no scheme and no path is treated
// as a URL only when its suffix is one of these — so "notes.txt", "README.md"
// and "App.jsx" fall through to search instead of opening a junk tab.
const COMMON_TLDS = new Set([
  'com', 'org', 'net', 'io', 'in', 'co', 'dev', 'app', 'ai', 'xyz', 'tech', 'info', 'biz',
  'gov', 'edu', 'mil', 'so', 'gg', 'to', 'tv', 'fm', 'cc', 'id',
  'uk', 'us', 'ca', 'au', 'de', 'fr', 'es', 'it', 'nl', 'se', 'no', 'fi', 'ch', 'at', 'be',
  'jp', 'cn', 'kr', 'sg', 'hk', 'ae', 'br', 'mx', 'ru', 'pl', 'pt', 'ie', 'nz', 'za', 'eu',
  'store', 'online', 'site', 'page', 'link', 'wiki', 'blog', 'cloud', 'design', 'studio', 'news',
])

function looksLikeUrl(q) {
  if (/\s/.test(q)) return false

  // Hierarchical scheme (scheme://…) — only http(s) count as a website.
  const hier = q.match(/^([a-z][a-z0-9+.-]*):\/\//i)
  if (hier) return SAFE_SCHEMES.has(hier[1].toLowerCase())

  // Opaque scheme (mailto:, javascript:, data:, tel:, …) — never a website.
  // "host:1234" is exempt: the char after ":" is a digit, so this won't match it.
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(q)) return false

  const cut = q.search(/[/?#]/)
  const authority = cut === -1 ? q : q.slice(0, cut)
  const [host, port] = authority.split(':')
  if (port !== undefined && !/^\d{1,5}$/.test(port)) return false
  if (!host) return false

  if (host === 'localhost' || IPV4_RE.test(host)) return true
  if (!HOST_RE.test(host) || !host.includes('.')) return false

  const hasPath = cut !== -1 && q.length > cut + 1
  const tld = host.slice(host.lastIndexOf('.') + 1).toLowerCase()
  if (COMMON_TLDS.has(tld)) return true
  // Deliberate URL intent even with an uncommon TLD: a real path or a port.
  return hasPath || port !== undefined
}

export function classify(raw) {
  const q = (raw || '').trim()
  if (!q) return { mode: 'browse', term: '' }
  if (q.startsWith('.')) return { mode: 'dot', term: q.slice(1).toLowerCase() }
  if (looksLikeUrl(q)) return { mode: 'url', term: q, url: normalizeUrl(q) }
  return { mode: 'search', term: q.toLowerCase(), raw: q }
}

export function normalizeUrl(q) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(q)) return q
  const host = q.split(/[/:?#]/)[0]
  const scheme = host === 'localhost' || IPV4_RE.test(host) ? 'http' : 'https'
  return `${scheme}://${q}`
}

export function webSearchUrl(q) {
  return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
}

export function prettyHost(url) {
  try { return new URL(normalizeUrl(url)).host } catch { return url }
}

/* ── Fuzzy matching ────────────────────────────────────────────────────────── */

const BOUNDARY = /[\s./_@-]/

// Case-insensitive relevance score. 0 = no match; higher = better.
// Rewards exact / prefix / word-boundary / contiguous matches.
export function fuzzyScore(query, text) {
  if (!query) return 1
  if (!text) return 0
  const q = query.toLowerCase()
  const t = text.toLowerCase()

  if (t === q) return 1000
  if (t.startsWith(q)) return 900 - t.length

  const idx = t.indexOf(q)
  if (idx > 0) {
    const atBoundary = BOUNDARY.test(t[idx - 1])
    return (atBoundary ? 600 : 380) - idx
  }

  // subsequence fallback
  let qi = 0, score = 0, streak = 0, prev = -2
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      streak = ti === prev + 1 ? streak + 1 : 0
      const atBoundary = ti === 0 || BOUNDARY.test(t[ti - 1])
      score += 10 + streak * 6 + (atBoundary ? 14 : 0)
      prev = ti
      qi++
    }
  }
  return qi === q.length ? score : 0
}

// [start, end) ranges of `text` that match `query`, for highlighting. Prefers a
// contiguous substring; otherwise the fuzzy subsequence positions.
export function matchRanges(query, text) {
  if (!query || !text) return []
  const q = query.toLowerCase()
  const t = text.toLowerCase()

  const idx = t.indexOf(q)
  if (idx !== -1) return [[idx, idx + q.length]]

  const ranges = []
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      const last = ranges[ranges.length - 1]
      if (last && last[1] === ti) last[1] = ti + 1
      else ranges.push([ti, ti + 1])
      qi++
    }
  }
  return qi === q.length ? ranges : []
}

/* ── Device file picker ───────────────────────────────────────────────────────
   Resolves to { name, size, type, file } or null if the user cancels. Uses the
   File System Access API where available, otherwise a transient <input> with a
   real change + cancel handler (the old version dropped the selected file). */

function fileMeta(file) {
  return { name: file.name, size: file.size, type: file.type || '', file }
}

function pickViaInput(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    Object.assign(input.style, { position: 'fixed', left: '-9999px', opacity: '0' })

    let settled = false
    const finish = (val) => {
      if (settled) return
      settled = true
      window.removeEventListener('focus', onRefocus, true)
      input.remove()
      resolve(val)
    }
    // A cancelled dialog fires no 'change' — the window just regains focus.
    const onRefocus = () => setTimeout(() => {
      if (!settled && !input.files?.length) finish(null)
    }, 350)

    input.addEventListener('change', () => {
      finish(input.files?.[0] ? fileMeta(input.files[0]) : null)
    }, { once: true })

    document.body.appendChild(input)
    input.click()
    window.addEventListener('focus', onRefocus, true)
  })
}

export async function openDeviceFile({ accept = '' } = {}) {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({ multiple: false })
      const file = handle && (await handle.getFile())
      return file ? fileMeta(file) : null
    } catch (err) {
      if (err?.name === 'AbortError') return null
      // fall through to the input fallback on any other failure
    }
  }
  if (typeof document === 'undefined') return null
  return pickViaInput(accept)
}
