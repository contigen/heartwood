"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowRight, ChevronDown, ChevronUp, Delete, KeyRound, Loader2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { LensMode, TimingSample } from "@/lib/heartwood-types"
import { cn } from "@/lib/utils"

export type PinVaultGateProps = {
  onUnlock: (pin: string) => Promise<void>
  isUnlocking: boolean
  lensMode: LensMode
  timingSamples: TimingSample[]
  overallEntropy: number
}

const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]

const TESTING_PRESETS = [
  {
    pin: "2468",
    title: "Primary Vault (Real Savings)",
    balance: "142.50 ZEC",
    detail: "Slot 0 · Real savings, zero distress traces.",
  },
  {
    pin: "1357",
    title: "Duress Decoy Vault",
    balance: "1.25 ZEC",
    detail: "Slot 1 · Plausible spendable decoy with silent SOS.",
  },
  {
    pin: "0000",
    title: "Any Other PIN",
    balance: "0.00 ZEC",
    detail: "Synthetic · Plausible zero-balance, no error oracle.",
  },
]

export function PinVaultGate({
  onUnlock,
  isUnlocking,
  lensMode,
  timingSamples,
  overallEntropy,
}: PinVaultGateProps) {
  const [pin, setPin] = React.useState("")
  const [showDevShortcuts, setShowDevShortcuts] = React.useState(false)

  const handleDigit = React.useCallback(
    (digit: string) => {
      if (isUnlocking) return
      setPin((prev) => (prev.length < 4 ? `${prev}${digit}` : prev))
    },
    [isUnlocking]
  )

  const handleBackspace = React.useCallback(() => {
    if (isUnlocking) return
    setPin((prev) => prev.slice(0, -1))
  }, [isUnlocking])

  const handleClear = React.useCallback(() => {
    if (isUnlocking) return
    setPin("")
  }, [isUnlocking])

  const handleSubmit = React.useCallback(
    async (overridePin?: string) => {
      const targetPin = overridePin ?? pin
      if (!targetPin || isUnlocking) return
      if (overridePin) {
        setPin(overridePin)
      }
      await onUnlock(targetPin)
      setPin("")
    },
    [pin, isUnlocking, onUnlock]
  )

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault()
        handleDigit(event.key)
      } else if (event.key === "Backspace") {
        event.preventDefault()
        handleBackspace()
      } else if (event.key === "Escape") {
        event.preventDefault()
        handleClear()
      } else if (event.key === "Enter" && pin.length > 0) {
        event.preventDefault()
        void handleSubmit()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleDigit, handleBackspace, handleClear, handleSubmit, pin])

  const latestSample =
    timingSamples.length > 0 ? timingSamples[timingSamples.length - 1] : null

  return (
    <div className="mx-auto max-w-md py-8 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-8 text-center"
      >
        <div className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-900 shadow-2xs">
            <Shield className="h-6 w-6 stroke-[1.75]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Heartwood Shielded Vault
          </h1>
          <p className="text-xs text-neutral-500">
            Enter your 4-digit PIN to decrypt your shielded keys
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3].map((idx) => {
                const filled = idx < pin.length
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl border font-mono text-xl font-semibold transition-all",
                      filled
                        ? "border-neutral-950 bg-neutral-950 text-white shadow-2xs"
                        : "border-neutral-200 bg-neutral-50 text-neutral-300"
                    )}
                  >
                    {filled ? "•" : ""}
                  </div>
                )
              })}
            </div>

            <div className="min-h-[20px] text-center text-xs text-neutral-500 font-mono">
              {isUnlocking ? (
                <span className="inline-flex items-center gap-1.5 text-neutral-900">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Twin Argon2id passes evaluating...
                </span>
              ) : (
                <span>Physical keyboard 0–9 + Enter supported</span>
              )}
            </div>

            <div className="grid w-full max-w-xs grid-cols-3 gap-2">
              {KEYPAD_DIGITS.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isUnlocking}
                  onClick={() => handleDigit(digit)}
                  className="flex h-12 items-center justify-center rounded-xl border border-neutral-200/90 bg-neutral-50/40 font-mono text-base font-medium text-neutral-950 transition hover:bg-neutral-100 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={isUnlocking || pin.length === 0}
                onClick={handleBackspace}
                className="flex h-12 items-center justify-center rounded-xl border border-neutral-200/80 bg-white text-xs font-medium text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-40 cursor-pointer"
              >
                <Delete className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={isUnlocking}
                onClick={() => handleDigit("0")}
                className="flex h-12 items-center justify-center rounded-xl border border-neutral-200/90 bg-neutral-50/40 font-mono text-base font-medium text-neutral-950 transition hover:bg-neutral-100 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                disabled={isUnlocking || pin.length === 0}
                onClick={() => void handleSubmit()}
                className="flex h-12 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <Button
              onClick={() => void handleSubmit()}
              disabled={isUnlocking || pin.length === 0}
              className="w-full max-w-xs"
            >
              {isUnlocking ? "Unlocking..." : "Unlock Vault"}
            </Button>
          </div>
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowDevShortcuts(!showDevShortcuts)}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-900 transition cursor-pointer"
          >
            <KeyRound className="h-3 w-3" />
            <span>Testing & Judge Credentials</span>
            {showDevShortcuts ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showDevShortcuts && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 grid grid-cols-1 gap-2 text-left"
            >
              {TESTING_PRESETS.map((p) => (
                <button
                  key={p.pin}
                  type="button"
                  onClick={() => void handleSubmit(p.pin)}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-xs transition hover:border-neutral-900 cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-neutral-950 flex items-center gap-2">
                      <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-[11px]">
                        PIN {p.pin}
                      </span>
                      <span>{p.title}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">{p.detail}</div>
                  </div>
                  <span className="font-mono font-semibold text-neutral-900">
                    {p.balance} →
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
