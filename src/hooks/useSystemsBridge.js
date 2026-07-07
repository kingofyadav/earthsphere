import { useEffect, useRef } from 'react'
import { useEarthStore } from '../store/earthStore'
import { useTravelStore } from '../store/travelStore'
import { setMuted, playSfx } from '../lib/audio'
import { startSync } from '../lib/syncEngine'

// Bridges cross-cutting systems to the stores:
//  • audio mute state  ← earthStore.audioMuted
//  • travel SFX (whoosh on depart, chime on arrival) ← travelStore.isTraveling
//  • starts the local-first sync engine once
export function useSystemsBridge() {
  const audioMuted = useEarthStore((s) => s.audioMuted)
  const wasTraveling = useRef(false)

  // keep the audio engine in sync with the persisted mute flag
  useEffect(() => { setMuted(audioMuted) }, [audioMuted])

  // start sync engine once
  useEffect(() => { startSync() }, [])

  // travel depart/arrive sounds
  useEffect(() => {
    const unsub = useTravelStore.subscribe((state) => {
      const now = state.isTraveling
      if (now && !wasTraveling.current) playSfx('whoosh')
      if (!now && wasTraveling.current) playSfx('arrive')
      wasTraveling.current = now
    })
    return unsub
  }, [])
}
