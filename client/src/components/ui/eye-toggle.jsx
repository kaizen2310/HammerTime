import { useEffect, useId } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

// Adapted from the Xevrion Lab eye toggle: https://lab.xevrion.dev/lab/eye-toggle
// Kept: the lid morph (open <-> shut, lashes while hidden), and keeping focus in the field.
// Dropped on purpose: the pupil following the cursor / caret and the random idle blink. They add
// a window-level pointermove listener and timers to an auth form, which is more motion than this
// app's "animate sparingly" direction calls for.

// Eye geometry in a 24 unit box. The upper lid's control points travel from 5 (open) down to 19,
// where the lid lies on the lower one and the eye is shut.
const OPEN_Y = 5
const SHUT_Y = 19
const round = (n) => Math.round(n * 100) / 100
const topLid = (c) => `M2 12C6 ${c} 18 ${c} 22 12`
const LOWER_LID = 'M2 12C6 19 18 19 22 12'
const lidAt = (v) => round(OPEN_Y + (SHUT_Y - OPEN_Y) * v)

// `visible` = the password is currently revealed (eye open).
// `controls` = id of the input this button reveals, for aria-controls.
export function EyeToggle({ visible, onToggle, controls, className }) {
  const clipId = `eye-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const reduceMotion = useReducedMotion()

  const lid = useMotionValue(visible ? 0 : 1)
  const lidCurve = useTransform(lid, (v) => topLid(lidAt(v)))
  // The open area between both lids; the iris is clipped to it so it disappears as the lid shuts.
  const aperture = useTransform(lid, (v) => `${topLid(lidAt(v))}C18 19 6 19 2 12Z`)

  // Opening springs up; closing is a quicker, flatter fall with no bounce.
  useEffect(() => {
    const playback = reduceMotion
      ? animate(lid, visible ? 0 : 1, { duration: 0 })
      : visible
        ? animate(lid, 0, { type: 'spring', duration: 0.35, bounce: 0.2 })
        : animate(lid, 1, { duration: 0.2, ease: [0.23, 1, 0.32, 1] })
    return () => playback.stop()
  }, [visible, reduceMotion, lid])

  return (
    <button
      type="button"
      // The label changes with state, so aria-pressed is intentionally omitted: together they
      // make screen readers announce a confusing "Hide password, pressed".
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-controls={controls}
      onClick={onToggle}
      // Keeps focus (and the caret) in the field when clicking/tapping the button.
      onPointerDown={(e) => e.preventDefault()}
      className={cn(
        'flex size-6 touch-manipulation items-center justify-center rounded-md text-muted-foreground outline-none transition-[scale,color,background-color] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]',
        visible && 'text-foreground',
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4 overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <motion.path d={aperture} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <circle cx="12" cy="12" r="3.4" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </g>
        <path d={LOWER_LID} />
        <motion.path d={lidCurve} />
        {/* Lashes hang from the shut lid; they belong to "hidden", not to a blink, so they follow
            the state rather than the lid. */}
        <motion.g
          initial={false}
          animate={visible ? { opacity: 0, y: reduceMotion ? 0 : -1.5 } : { opacity: 1, y: 0 }}
          transition={
            visible
              ? { duration: 0.1 }
              : { duration: 0.18, delay: reduceMotion ? 0 : 0.12, ease: [0.23, 1, 0.32, 1] }
          }
        >
          <path d="M5.2 15.4 3.9 17.4" />
          <path d="M12 17.3V19.8" />
          <path d="M18.8 15.4 20.1 17.4" />
        </motion.g>
      </svg>
    </button>
  )
}
