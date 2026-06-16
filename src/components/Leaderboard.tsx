import type { PlayerDoc } from '../types'

interface Props {
  players: PlayerDoc[]
  /** Highlight this uid (the current student). */
  highlightUid?: string
  /** How many to show (default all). */
  limit?: number
  podium?: boolean
}

const MEDALS = ['🥇', '🥈', '🥉']

/** Ranked list of players by score. Optionally renders a celebratory podium at the top. */
export function Leaderboard({ players, highlightUid, limit, podium }: Props) {
  const ranked = limit ? players.slice(0, limit) : players

  return (
    <ol className="flex w-full flex-col gap-2">
      {ranked.map((p, i) => {
        const isMe = p.uid === highlightUid
        return (
          <li
            key={p.uid}
            className={[
              'flex items-center gap-3 rounded-2xl border px-4 py-3 animate-float-up',
              isMe ? 'border-brand-400 bg-brand-600/20' : 'border-white/10 bg-white/5',
              podium && i === 0 ? 'scale-[1.02]' : '',
            ].join(' ')}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="w-8 text-center font-display text-lg font-bold">
              {podium && i < 3 ? MEDALS[i] : i + 1}
            </span>
            <span className="flex-1 truncate font-semibold">
              {p.nickname}
              {isMe && <span className="ml-2 pill">you</span>}
            </span>
            <span className="font-display text-lg font-bold tabular-nums text-brand-400">
              {p.score.toLocaleString()}
            </span>
          </li>
        )
      })}
      {ranked.length === 0 && (
        <li className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-slate-500">
          No players yet…
        </li>
      )}
    </ol>
  )
}
