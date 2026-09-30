import { useEffect, useId, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { EyeToggle } from '@/components/ui/eye-toggle'
import { cn } from '@/lib/utils'

// Drop-in replacement for <Input type="password">. Each instance owns its own reveal state, so
// Password / Confirm password / New password fields toggle independently. The value, name,
// onChange and `required` validation are untouched: only the input's `type` flips.
function PasswordInput({ className, id, ...props }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [visible, setVisible] = useState(false)
  const wrapperRef = useRef(null)
  const caret = useRef(null)

  // Observed in Chromium: flipping an input's `type` during a click moves the caret to the start,
  // and does it after React's effects have run, so a synchronous restore is overwritten. That is
  // jarring when someone reveals the password halfway through typing it, so remember the selection
  // here and put it back on the next frame (before paint). Harmless in browsers that don't reset it.
  const toggle = () => {
    const input = wrapperRef.current?.querySelector('input')
    caret.current =
      input && document.activeElement === input ? [input.selectionStart, input.selectionEnd] : null
    setVisible((v) => !v)
  }

  useEffect(() => {
    const input = wrapperRef.current?.querySelector('input')
    const selection = caret.current
    caret.current = null
    if (!input || !selection) return
    const frame = requestAnimationFrame(() => input.setSelectionRange(...selection))
    return () => cancelAnimationFrame(frame)
  }, [visible])

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        spellCheck={false}
        {...props}
        id={inputId}
        // Always ours, even if a caller passes `type`.
        type={visible ? 'text' : 'password'}
        // pr-9 leaves room for the toggle; the ::-ms-* rules hide Edge's built-in reveal button,
        // which would otherwise render a second eye.
        className={cn('pr-9 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden', className)}
      />
      <EyeToggle
        visible={visible}
        onToggle={toggle}
        controls={inputId}
        className="absolute top-1 right-1"
      />
    </div>
  )
}

export { PasswordInput }
