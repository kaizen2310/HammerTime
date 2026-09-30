import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

// Adapted from the Xevrion Lab live indicator: https://lab.xevrion.dev/lab/live-indicator
// Changes: JS instead of TS; lab tokens mapped to this project's (bg-surface -> bg-muted,
// bg-danger -> bg-destructive, text-muted -> text-muted-foreground); the keyframes live in
// index.css instead of an inline <style> per instance.
//
// NOT ported: the lab's `useViewerCount` hook. It invents a randomly drifting audience for its
// demo. Here `viewers` must always be the real count from the socket ('viewer_count').

const EASE_OUT = [0.23, 1, 0.32, 1]

// Locale independent, so the same number always prints the same way.
function group(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Slower than a click's roll: nobody caused this change, so it should drift past rather than snap.
const ROLL = {
  enter: ({ direction, reduceMotion }) => ({
    y: reduceMotion ? '0%' : `${direction * 100}%`,
    opacity: 0,
  }),
  center: {
    y: '0%',
    opacity: 1,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
  exit: ({ direction, reduceMotion }) => ({
    y: reduceMotion ? '0%' : `${direction * -100}%`,
    opacity: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  }),
}

// viewers       real number of people in the auction room
// reconnecting  true while the socket is down: the dot goes hollow and blinks, the count dims
export function LiveIndicator({ viewers, reconnecting = false, label = 'Live', className }) {
  const reduceMotion = useReducedMotion()

  const [prev, setPrev] = useState(viewers)
  const [direction, setDirection] = useState(1)
  if (prev !== viewers) {
    setDirection(viewers > prev ? 1 : -1)
    setPrev(viewers)
  }

  const custom = { direction, reduceMotion }
  const chars = group(viewers).split('')
  const status = reconnecting ? 'Reconnecting' : label

  return (
    <span
      className={cn(
        'relative inline-flex h-7 items-center gap-2 rounded-full bg-muted pr-3 pl-2.5 text-[13px] font-medium text-foreground ring-1 ring-foreground/10 select-none',
        className
      )}
    >
      {/* The accessible text never includes the ticking number, so screen readers hear the
          state, not a stream of digits. */}
      <span className="sr-only">
        {reconnecting ? 'Reconnecting' : `${label}, ${group(viewers)} watching`}
      </span>

      <span aria-hidden className="relative grid size-2 place-items-center">
        {/* Sonar: one soft ring every 2.4s, only while actually live. */}
        {!reconnecting && !reduceMotion && (
          <span className="absolute inset-0 rounded-full bg-destructive [animation:live-indicator-sonar_2.4s_cubic-bezier(0.23,1,0.32,1)_infinite]" />
        )}
        <span
          className={cn(
            'relative size-2 rounded-full border-[1.5px] transition-[background-color,border-color] duration-200 ease-out',
            reconnecting
              ? 'border-muted-foreground bg-transparent motion-safe:[animation:live-indicator-blink_1s_ease-in-out_infinite]'
              : 'border-destructive bg-destructive motion-safe:[animation:live-indicator-breathe_2.4s_ease-in-out_infinite]'
          )}
        />
      </span>

      <span aria-hidden className="grid">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={status}
            className="col-start-1 row-start-1 whitespace-nowrap"
            initial={{ opacity: 0, filter: reduceMotion ? 'blur(0px)' : 'blur(4px)' }}
            animate={{
              opacity: 1,
              filter: 'blur(0px)',
              transition: { duration: 0.22, ease: EASE_OUT },
            }}
            exit={{
              opacity: 0,
              filter: reduceMotion ? 'blur(0px)' : 'blur(4px)',
              transition: { duration: 0.12, ease: EASE_OUT },
            }}
          >
            {status}
          </motion.span>
        </AnimatePresence>
      </span>

      <span aria-hidden className="h-3 w-px bg-border" />

      <span
        aria-hidden
        className={cn(
          'flex items-center gap-1 text-muted-foreground tabular-nums transition-opacity duration-200 ease-out',
          // A frozen count is stale, so it steps back while reconnecting.
          reconnecting && 'opacity-50'
        )}
      >
        <svg
          viewBox="0 0 16 16"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
        <span className="flex">
          {chars.map((char, i) => (
            // Keyed by place from the right, so only the digits that change roll.
            <span key={chars.length - i} className="inline-grid overflow-hidden">
              <AnimatePresence initial={false} custom={custom}>
                <motion.span
                  key={char}
                  custom={custom}
                  variants={ROLL}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="col-start-1 row-start-1"
                >
                  {char}
                </motion.span>
              </AnimatePresence>
            </span>
          ))}
        </span>
      </span>
    </span>
  )
}
