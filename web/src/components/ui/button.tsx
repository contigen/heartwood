import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/20 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-950 text-white hover:bg-neutral-800 active:scale-[0.99] rounded-full shadow-2xs",
        secondary:
          "bg-neutral-100 text-neutral-900 hover:bg-neutral-200/80 active:scale-[0.99] rounded-full",
        outline:
          "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 active:scale-[0.99] rounded-full",
        ghost:
          "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100/80 rounded-full",
        danger:
          "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.99] rounded-full",
        softRose:
          "bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100/70 rounded-full",
        softAmber:
          "bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100/70 rounded-full",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
