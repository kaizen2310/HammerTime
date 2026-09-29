import { useState, useEffect } from 'react'

export const useCountdown = (endsAt) => {
  const [remaining, setRemaining] = useState(() => new Date(endsAt).getTime() - Date.now())

  useEffect(() => {
    const tick = () => setRemaining(new Date(endsAt).getTime() - Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  return remaining
}