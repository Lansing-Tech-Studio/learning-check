import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { auth } from '../firebase'
import { playersCol, sessionRef } from './session'
import type { PlayerDoc, SessionDoc } from '../types'

/** Current Firebase auth user (null when signed out, undefined while loading). */
export function useAuthUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return user
}

/** Live subscription to a session document. Returns null once loaded if it doesn't exist. */
export function useSession(code: string | undefined): SessionDoc | null | undefined {
  const [session, setSession] = useState<SessionDoc | null | undefined>(undefined)
  useEffect(() => {
    if (!code) return
    return onSnapshot(
      sessionRef(code),
      (snap) => setSession(snap.exists() ? (snap.data() as SessionDoc) : null),
      () => setSession(null),
    )
  }, [code])
  return session
}

/** Live leaderboard, sorted by score descending. */
export function usePlayers(code: string | undefined): PlayerDoc[] {
  const [players, setPlayers] = useState<PlayerDoc[]>([])
  useEffect(() => {
    if (!code) return
    const q = query(playersCol(code), orderBy('score', 'desc'))
    return onSnapshot(
      q,
      (snap) => setPlayers(snap.docs.map((d) => d.data() as PlayerDoc)),
      () => setPlayers([]),
    )
  }, [code])
  return players
}
