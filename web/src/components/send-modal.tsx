"use client"

import * as React from "react"
import { ArrowRight, Clock, Loader2, Radio, Send, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { DistressConfig, DistressMode, LensMode, SavedContact } from "@/lib/heartwood-types"
import { cn, formatZec } from "@/lib/utils"

export type SendModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  spendableZatoshis: number
  distressConfig: DistressConfig | null
  lensMode: LensMode
  savedContacts: SavedContact[]
  onSend: (params: {
    recipient: string
    amountZec: number
  }) => Promise<void>
  isSending: boolean
  onSetDistressMode: (mode: DistressMode) => Promise<void>
}

export function SendModal({
  open,
  onOpenChange,
  spendableZatoshis,
  distressConfig,
  lensMode,
  savedContacts,
  onSend,
  isSending,
  onSetDistressMode,
}: SendModalProps) {
  const [recipient, setRecipient] = React.useState("")
  const [amountStr, setAmountStr] = React.useState("")
  const [memo, setMemo] = React.useState("")

  const showInspector = lensMode === "inspector"
  const isDuressActive = distressConfig !== null
  const isImmediate = isDuressActive && distressConfig.mode === "Immediate"

  const parsedAmount = Number.parseFloat(amountStr)
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0
  const spendableZec = spendableZatoshis / 100_000_000

  const networkFeeZec = 0.0001
  const covertNoteZec = isImmediate && showInspector ? 0.0001 : 0
  const totalOutlayZec = validAmount + networkFeeZec + covertNoteZec
  const hasInsufficientFunds = totalOutlayZec > spendableZec

  const handleSetMax = () => {
    const maxZec = Math.max(0, spendableZec - networkFeeZec - (isImmediate ? 0.0001 : 0))
    setAmountStr(maxZec.toFixed(4))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipient.trim() || validAmount <= 0 || hasInsufficientFunds || isSending) {
      return
    }
    await onSend({ recipient: recipient.trim(), amountZec: validAmount })
    setRecipient("")
    setAmountStr("")
    setMemo("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Send Shielded Payment</DialogTitle>
            <span className="font-mono text-xs text-neutral-500">
              Spendable: {formatZec(spendableZatoshis)} ZEC
            </span>
          </div>
          <DialogDescription>
            Zero-knowledge shielded transfer with uniform 3-action Orchard bundle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
              <label>Recipient Address</label>
              {savedContacts.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-neutral-400">Quick fill:</span>
                  {savedContacts.slice(0, 2).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRecipient(c.address)}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700 hover:bg-neutral-200 cursor-pointer"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="utest1... or zs1..."
              className="font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
              <label>Amount (ZEC)</label>
              <button
                type="button"
                onClick={handleSetMax}
                className="font-mono text-[11px] font-semibold text-neutral-900 hover:underline cursor-pointer"
              >
                Use Max ({spendableZec.toFixed(4)} ZEC)
              </button>
            </div>
            <div className="relative">
              <Input
                type="number"
                step="0.001"
                min="0.0001"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.0000"
                className="font-mono text-base font-medium pr-14"
                required
              />
              <span className="absolute right-3.5 top-2.5 font-mono text-xs font-semibold text-neutral-400">
                ZEC
              </span>
            </div>
            {validAmount > 0 && (
              <div className="text-[11px] text-neutral-400">
                ≈ ${(validAmount * 35.0).toFixed(2)} USD (testnet reference rate)
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Encrypted Memo (Optional)
            </label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="512-byte encrypted message for recipient"
              className="text-xs"
            />
          </div>

          {showInspector && isDuressActive && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-950 flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-rose-600" />
                  Duress In-Band Signal Armed
                </span>
                <div className="inline-flex items-center rounded-full bg-white p-0.5 text-xs border border-rose-200">
                  <button
                    type="button"
                    onClick={() => void onSetDistressMode("Immediate")}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition cursor-pointer",
                      distressConfig.mode === "Immediate"
                        ? "bg-rose-900 text-white"
                        : "text-rose-700 hover:text-rose-950"
                    )}
                  >
                    Immediate
                  </button>
                  <button
                    type="button"
                    onClick={() => void onSetDistressMode("Deferred")}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition cursor-pointer",
                      distressConfig.mode === "Deferred"
                        ? "bg-rose-900 text-white"
                        : "text-rose-700 hover:text-rose-950"
                    )}
                  >
                    Deferred
                  </button>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-800">
                {distressConfig.mode === "Immediate"
                  ? "This coerced payment will silently carry a 512B HWOODSOS beacon in Output #1 to your Trusted Contact."
                  : "Covert output will be queued in encrypted local storage so watching eyes see normal network traffic."}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Network Fee (ZIP-317)</span>
              <span className="font-mono text-neutral-800">0.00010000 ZEC</span>
            </div>
            {isImmediate && showInspector && (
              <div className="flex justify-between text-rose-600">
                <span>Covert SOS Note (Action #1)</span>
                <span className="font-mono">0.00010000 ZEC</span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-1.5 font-medium text-neutral-950">
              <span>Total Deducted</span>
              <span className="font-mono">{totalOutlayZec.toFixed(8)} ZEC</span>
            </div>
          </div>

          {hasInsufficientFunds && (
            <div className="text-xs font-medium text-rose-600">
              Insufficient funds for transfer and required fees.
            </div>
          )}

          <Button
            type="submit"
            disabled={!recipient.trim() || validAmount <= 0 || hasInsufficientFunds || isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Constructing Orchard notes...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Confirm & Send Payment
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
