import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.ComponentProps<"input">

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50/60 px-3.5 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 transition-colors focus-visible:bg-white focus-visible:border-neutral-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
