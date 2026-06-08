const BASE = '/api/rc'

async function rpcFetch(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, opts)
  if (!r.ok) throw new Error(`rupeecoin: ${r.status} ${path}`)
  return r.json()
}

export const rcGetStats   = ()        => rpcFetch('/stats')
export const rcGetBalance = (address) => rpcFetch(`/balance?address=${encodeURIComponent(address)}`)
export const rcGetUTXOs   = (address) => rpcFetch(`/utxos?address=${encodeURIComponent(address)}`)

export const rcNewWallet  = () => rpcFetch('/wallet/new', { method: 'POST' })

export const rcSendTx = ({ from_address, to_address, amount, private_key }) =>
  rpcFetch('/tx', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from_address, to_address, amount, private_key }),
  })
