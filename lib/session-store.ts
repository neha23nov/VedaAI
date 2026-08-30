
import { ProcessingResult } from '@/types'

// super simple in-memory store
// NOTE: on serverless this resets on cold starts — totally fine for this demo
// if you need persistence, swap this for Upstash Redis or Vercel KV

interface StoredSession {
  status: 'processing' | 'done' | 'error'
  error?: string
  result?: ProcessingResult
  createdAt: number
}

const sessions = new Map<string, StoredSession>()

// basic cleanup - remove sessions older than 1 hour so memory doesn't balloon
function cleanup() {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [id, session] of sessions) {
    if (session.createdAt < cutoff) sessions.delete(id)
  }
}

export const store = {
  create(id: string) {
    sessions.set(id, { status: 'processing', createdAt: Date.now() })
    cleanup() // run cleanup on each new session (lazy approach)
  },

  setDone(id: string, result: ProcessingResult) {
    const s = sessions.get(id)
    if (!s) return
    sessions.set(id, { ...s, status: 'done', result })
  },

  setError(id: string, error: string) {
    const s = sessions.get(id)
    if (!s) return
    sessions.set(id, { ...s, status: 'error', error })
  },

  get(id: string) {
    return sessions.get(id)
  },
}
