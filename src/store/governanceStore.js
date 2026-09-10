import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { INDIA_PROPOSALS, mergeSeed } from '../data/seed'

function genId() {
  return `prop:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`
}

const withProposalSeed = (proposals) =>
  mergeSeed(proposals, INDIA_PROPOSALS, ['nation_id', 'title', 'description', 'proposer_hid', 'created_at'])

export const useGovernanceStore = create(
  devtools(
  persist(
    (set, get) => ({
      proposals: withProposalSeed([]),

      createProposal: ({ nation_id, title, description, proposer_hid, deadline_days = 7 }) => {
        const deadline = new Date()
        deadline.setDate(deadline.getDate() + deadline_days)
        const proposal = {
          id:           genId(),
          nation_id,
          title,
          description,
          proposer_hid,
          created_at:   new Date().toISOString(),
          deadline:     deadline.toISOString(),
          votes_for:    [],
          votes_against:[],
          status:       'open',
        }
        set(s => ({ proposals: [...s.proposals, proposal] }))
        return proposal
      },

      vote: (proposal_id, hid, direction) => set(s => ({
        proposals: s.proposals.map(p => {
          if (p.id !== proposal_id || p.status !== 'open') return p
          const forList     = p.votes_for.filter(h => h !== hid)
          const againstList = p.votes_against.filter(h => h !== hid)
          return direction === 'for'
            ? { ...p, votes_for: [...forList, hid],     votes_against: againstList }
            : { ...p, votes_for: forList, votes_against: [...againstList, hid] }
        }),
      })),

      // Close proposals past their deadline. Bails without a write when nothing
      // has expired, so mounting the Governance tab doesn't churn the store.
      finalizeExpired: () => set(s => {
        const now = Date.now()
        let changed = false
        const proposals = s.proposals.map(p => {
          if (p.status !== 'open' || new Date(p.deadline).getTime() > now) return p
          changed = true
          return { ...p, status: p.votes_for.length > p.votes_against.length ? 'passed' : 'rejected' }
        })
        return changed ? { proposals } : {}
      }),

      getByNation: (nation_id) => get().proposals.filter(p => p.nation_id === nation_id),
    }),
    {
      name: 'earthsphere-governance',
      version: 1,
      migrate: (persisted) => {
        if (persisted && typeof persisted === 'object') {
          persisted.proposals = withProposalSeed(persisted.proposals || [])
        }
        return persisted
      },
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        proposals: withProposalSeed(persisted?.proposals ?? current.proposals),
      }),
    }
  ),
  { name: 'GovernanceStore' }
  )
)
