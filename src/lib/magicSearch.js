// Magic Search — classify an omnibox query and provide web/url helpers.
//
//   .foo        → dot command (config-like shortcut)
//   foo.com     → website (open URL)
//   hello world → keyword search (apps / files locally + web fallback)

const URL_RE = /^(https?:\/\/)?((localhost)|(([\w-]+\.)+[a-z]{2,}))(:\d+)?(\/\S*)?$/i

export function classify(raw) {
  const q = (raw || '').trim()
  if (!q) return { mode: 'browse', term: '' }
  if (q.startsWith('.')) return { mode: 'dot', term: q.slice(1).toLowerCase() }
  if (URL_RE.test(q) && !q.includes(' ')) return { mode: 'url', term: q, url: normalizeUrl(q) }
  return { mode: 'search', term: q.toLowerCase(), raw: q }
}

export function normalizeUrl(q) {
  return /^https?:\/\//i.test(q) ? q : `https://${q}`
}

export function webSearchUrl(q) {
  return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
}

export function prettyHost(url) {
  try { return new URL(normalizeUrl(url)).host } catch { return url }
}

// Open a file from the device. File System Access API where available,
// otherwise fall back to a hidden <input type="file"> click.
export async function openDeviceFile(fallbackInput) {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker()
      return handle ? handle.name : null
    } catch { return null }
  }
  fallbackInput?.click()
  return null
}
