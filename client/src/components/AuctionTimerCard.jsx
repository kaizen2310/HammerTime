import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { useCountdown } from '../hooks/useCountdown'
import FlipClock from '@/components/ui/flip-clock'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  const clockProps = {
    countdown: true,
    targetDate,
    showDays: 'never',
    variant: isUrgent ? 'destructive' : 'default',
    'aria-live': 'off',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4" />
          Time remaining
        </CardTitle>
        {isRunning && days > 0 && (
          <Badge variant="secondary">
            {days} {days === 1 ? 'day' : 'days'} left
          </Badge>
        )}
        {isUrgent && <Badge variant="destructive">Ending soon</Badge>}
      </CardHeader>
      <CardContent className="flex justify-center">
        {isRunning ? (
          <>
            {/* Small clock on phones, medium from the `sm` breakpoint up */}
            <FlipClock {...clockProps} size="sm" className="sm:hidden" />
            <FlipClock {...clockProps} size="md" className="hidden sm:flex" />
          </>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            {isActive ? 'Ending...' : 'This auction has ended'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}