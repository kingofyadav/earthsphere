import { useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { useAuthStore, registerClerkBridge, generateHDI } from '../store/authStore'
import { upsertProfile } from '../lib/api'

// Wires Clerk (identity/session) into authStore (app-side profile, Neon-backed).
// Mount once near the app root.
export function useAuthBridge() {
  const { isLoaded: authLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { isLoaded: userLoaded, user } = useUser()
  const hydratedFor = useRef(null)

  useEffect(() => {
    if (!authLoaded) return
    registerClerkBridge({ getToken, signOut })
  }, [authLoaded, getToken, signOut])

  useEffect(() => {
    if (!authLoaded || !userLoaded) return

    if (!isSignedIn) {
      hydratedFor.current = null
      if (useAuthStore.getState().isLoggedIn) useAuthStore.getState().logout()
      return
    }

    if (hydratedFor.current === user.id) return
    hydratedFor.current = user.id

    const email = user.primaryEmailAddress?.emailAddress || ''
    const name = user.unsafeMetadata?.name || user.fullName || email.split('@')[0] || 'Digital Traveler'
    const phone = user.unsafeMetadata?.phone || ''
    const country = user.unsafeMetadata?.country || 'India'

    getToken().then((token) => {
      if (!token) return
      return upsertProfile(token, { email, name, phone, country, hdi: generateHDI(name, phone, email) })
    }).then((res) => {
      if (res?.profile) useAuthStore.getState().hydrate(res.profile)
    }).catch(() => {
      hydratedFor.current = null
    })
  }, [authLoaded, userLoaded, isSignedIn, user, getToken])
}
