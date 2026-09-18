import { useEffect, useState } from 'react'

interface TerminalTypewriterProps {
  lines: string[]
  className?: string
  typingSpeedMs?: number
  lineDelayMs?: number
  holdMs?: number
}

// Types out `lines` one character at a time, "presses enter" between lines, then
// clears and loops — mimicking a terminal recording (asciinema/GIF-style) tagline.
export function TerminalTypewriter({
  lines,
  className,
  typingSpeedMs = 35,
  lineDelayMs = 500,
  holdMs = 2400,
}: TerminalTypewriterProps) {
  const [completedLines, setCompletedLines] = useState<string[]>([])
  const [typed, setTyped] = useState('')
  const [lineIndex, setLineIndex] = useState(0)
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (reducedMotion) return

    const currentLine = lines[lineIndex % lines.length]
    let timeout: ReturnType<typeof setTimeout>

    if (typed.length < currentLine.length) {
      timeout = setTimeout(() => setTyped(currentLine.slice(0, typed.length + 1)), typingSpeedMs)
    } else if (lineIndex < lines.length - 1) {
      timeout = setTimeout(() => {
        setCompletedLines((prev) => [...prev, currentLine])
        setTyped('')
        setLineIndex((i) => i + 1)
      }, lineDelayMs)
    } else {
      timeout = setTimeout(() => {
        setCompletedLines([])
        setTyped('')
        setLineIndex(0)
      }, holdMs)
    }

    return () => clearTimeout(timeout)
  }, [reducedMotion, typed, lineIndex, lines, typingSpeedMs, lineDelayMs, holdMs])

  const fullText = lines.join(' ')

  if (reducedMotion) {
    return <p className={className}>{fullText}</p>
  }

  return (
    <p className={className}>
      <span aria-hidden="true">
        {completedLines.map((line) => (
          <span className="terminal-line" key={line}>
            {line}
            <br />
          </span>
        ))}
        <span className="terminal-line">
          {typed}
          <span className="terminal-cursor" />
        </span>
      </span>
      <span className="sr-only">{fullText}</span>
    </p>
  )
}
