import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { useCountdown } from '../hooks/useCountdown'
import FlipClock from '@/components/ui/flip-clock'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const URGENT_THRESHOLD_MS = 5 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export default function AuctionTimerCard({ endsAt, isActive }) {
  const remaining = useCountdown(endsAt)
  // Same Date object between renders, so the clock's effect isn't restarted every second
  const targetDate = useMemo(() => new Date(endsAt), [endsAt])

  const isRunning = isActive && remaining > 0
  const isUrgent = isRunning && remaining <= URGENT_THRESHOLD_MS
  const days = Math.floor(remaining / DAY_MS)

  // Days go in the badge: a 3-digit day counter makes the clock wider than the card.
  // The clock itself only shows HH:MM:SS. "aria-live" is off so screen readers
  // don't announce every second.
  // When not running there is no targetDate, so the clock sits muted at 00:00:00.
  const clockProps = {
    countdown: true,
    showDays: 'never',
    'aria-live': 'off',
    ...(isRunning
      ? { targetDate, variant: isUrgent ? 'destructive' : 'default' }
      : { variant: 'muted' }),
  }

  const title = isRunning ? 'Time remaining' : isActive ? 'Ending...' : 'Auction ended'

  return (
    <Card className={cn(isUrgent && 'bg-destructive/5 ring-destructive/30')}>
      {/* Phone: title + badges on one row, clock below. sm+: title | clock | badges in one strip */}
      <CardContent className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-4">
        <CardTitle className="col-start-1 row-start-1 flex items-center gap-2 text-base">
          <Clock className="size-4" />
          {title}
        </CardTitle>

        <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-2 sm:col-start-3">
          {isRunning && days > 0 && (
            <Badge variant="secondary">
              {days} {days === 1 ? 'day' : 'days'} left
            </Badge>
          )}
          {isUrgent && <Badge variant="destructive">Ending soon</Badge>}
        </div>

        <div className="col-span-2 row-start-2 flex justify-center sm:col-span-1 sm:col-start-2 sm:row-start-1">
          {/* Small clock on phones, medium from the `sm` breakpoint up */}
          <FlipClock {...clockProps} size="sm" className="sm:hidden" />
          <FlipClock {...clockProps} size="md" className="hidden sm:flex" />
        </div>
      </CardContent>
    </Card>
  )
}