import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-neutral-100 text-neutral-700",
        outline: "border border-neutral-200 text-neutral-600 bg-white",
        sky: "bg-sky-50 text-sky-600",
        indigo: "bg-indigo-50 text-indigo-600",
        emerald: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
        rose: "bg-rose-50 text-rose-600",
        ink: "bg-neutral-950 text-white",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
