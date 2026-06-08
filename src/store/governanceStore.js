import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function genId() {
  return `prop:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`
}

export const useGovernanceStore = create(
  persist(
    (set, get) => ({
      proposals: [],

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

      finalizeExpired: () => set(s => ({
        proposals: s.proposals.map(p => {
          if (p.status !== 'open' || new Date(p.deadline) > new Date()) return p
          return { ...p, status: p.votes_for.length >= p.votes_against.length ? 'passed' : 'rejected' }
        }),
      })),

      getByNation: (nation_id) => get().proposals.filter(p => p.nation_id === nation_id),
    }),
    { name: 'earthsphere-governance' }
  )
)
