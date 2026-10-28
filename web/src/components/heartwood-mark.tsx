import * as React from "react"
import { cn } from "@/lib/utils"

export type HeartwoodMarkProps = {
  className?: string
}

export function HeartwoodMark({ className }: HeartwoodMarkProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8 text-neutral-950", className)}
      aria-hidden="true"
    >
      <path
        d="M18 3.5C10.1 3.5 4 9.7 4 17.8C4 25.4 9.6 31.8 17.2 32.4C17.7 32.5 18.3 32.5 18.8 32.4C26.4 31.8 32 25.4 32 17.8C32 9.7 25.9 3.5 18 3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M18 8.2C12.7 8.2 8.6 12.4 8.6 17.8C8.6 23.1 12.7 27.4 18 27.4C23.3 27.4 27.4 23.1 27.4 17.8C27.4 12.4 23.3 8.2 18 8.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 2.2"
      />
      <circle
        cx="18"
        cy="17.8"
        r="4.6"
        fill="currentColor"
      />
      <circle
        cx="18"
        cy="17.8"
        r="1.7"
        fill="white"
      />
    </svg>
  )
}
