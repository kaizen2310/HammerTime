import { useState } from 'react'
import { CalendarIcon, ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { WheelPicker } from '@/components/ui/wheel-picker'
import { cn } from '@/lib/utils'

// The data model is deliberately the one the app already uses: a `Date` for the day and a 24h
// "HH:mm" string for the time (what <input type="time"> produced). Combining them into a UTC ISO
// string stays with the caller, so API payloads and server validation are untouched.

// "18:05" -> { hour: 6, minute: 5, period: 'PM' } (the wheel's 12h shape)
function parseTime(time) {
  const [h, m] = String(time ?? '').split(':').map(Number)
  const hour24 = Number.isInteger(h) && h >= 0 && h <= 23 ? h : 0
  const minute = Number.isInteger(m) && m >= 0 && m <= 59 ? m : 0
  return {
    hour: ((hour24 + 11) % 12) + 1,
    minute,
    period: hour24 >= 12 ? 'PM' : 'AM',
  }
}

// { hour: 12, minute: 0, period: 'AM' } -> "00:00"; 12 PM -> "12:00"
function toTimeString({ hour, minute, period }) {
  const hour24 = (hour % 12) + (period === 'PM' ? 12 : 0)
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatTime(time) {
  const { hour, minute, period } = parseTime(time)
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}

// Locale-aware, like the other toLocale*String calls in the app.
function formatDate(date) {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/**
 * Date = calendar popover, time = wheel popover (hour / minute / AM-PM).
 *
 * date          Date | undefined
 * time          "HH:mm" (24h)
 * minDate       earliest selectable day (default: today). Pass another picker's date here to keep
 *               an end date from landing before its start date.
 * invalid       marks both triggers aria-invalid (red ring); pair with `describedBy` for the message
 * label         screen-reader prefix, e.g. "Ends at" -> "Ends at date: Sep 30, 2026"
 *
 * The picker never rewrites what the user chose; range/"in the future" rules belong to the caller.
 */
function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  minDate,
  invalid = false,
  describedBy,
  disabled = false,
  label = 'Date and time',
  className,
}) {
  const [dateOpen, setDateOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className={cn('grid grid-cols-[minmax(0,1fr)_auto] gap-2', className)}
    >
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              aria-invalid={invalid || undefined}
              className="min-w-0 justify-between font-normal"
            >
              <span className={cn('truncate', !date && 'text-muted-foreground')}>
                <span className="sr-only">{label} date: </span>
                {date ? formatDate(date) : 'Select date'}
              </span>
              <CalendarIcon className="size-4 opacity-60" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-1" aria-label={`${label}: choose a date`}>
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(picked) => {
              // Clicking the selected day again would clear it; keep the choice instead.
              if (!picked) return
              onDateChange(picked)
              setDateOpen(false)
            }}
            disabled={(d) => d < startOfDay(minDate ?? new Date())}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <Popover open={timeOpen} onOpenChange={setTimeOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              aria-invalid={invalid || undefined}
              className="justify-between gap-2 font-normal tabular-nums"
            >
              <span>
                <span className="sr-only">{label} time: </span>
                {formatTime(time)}
              </span>
              <ClockIcon className="size-4 opacity-60" />
            </Button>
          }
        />
        <PopoverContent align="end" className="w-auto gap-3 p-3" aria-label={`${label}: choose a time`}>
          <WheelPicker
            value={parseTime(time)}
            onChange={(next) => onTimeChange(toTimeString(next))}
            label={`${label} time`}
          />
          <Button type="button" size="sm" className="w-full" onClick={() => setTimeOpen(false)}>
            Done
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DateTimePicker }
