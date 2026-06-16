import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './routes/Landing'

// Host and Play pull in the Firebase SDK; lazy-loading them keeps the landing page tiny
// and means it renders even before Firebase is configured.
const Host = lazy(() => import('./routes/Host').then((m) => ({ default: m.Host })))
const Play = lazy(() => import('./routes/Play').then((m) => ({ default: m.Play })))

function Loading() {
  return (
    <div className="grid min-h-full place-items-center text-slate-400">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-brand-400" />
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/host" element={<Host />} />
        <Route path="/play" element={<Play />} />
        <Route path="/play/:code" element={<Play />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
