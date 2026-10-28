"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { Check, Copy, Download, Loader2, Plus, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { middleTruncate } from "@/lib/utils"

export type ReceiveModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  unifiedAddress: string
  accountName: string
  onDepositTestnetZec: (amountZatoshis: number, label?: string) => Promise<void>
  isDepositing: boolean
}

export function ReceiveModal({
  open,
  onOpenChange,
  unifiedAddress,
  accountName,
  onDepositTestnetZec,
  isDepositing,
}: ReceiveModalProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(unifiedAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Receive Shielded Zcash</DialogTitle>
            <Badge variant="sky">Orchard + Sapling</Badge>
          </div>
          <DialogDescription>
            Deposits to this ZIP-316 Unified Address are fully shielded and encrypted on-chain.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-5 py-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
            <QRCodeSVG
              value={unifiedAddress}
              size={180}
              level="M"
              includeMargin={false}
              className="rounded-lg"
            />
          </div>

          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
              <span>{accountName} Unified Address</span>
              <span className="font-mono text-[11px] text-neutral-400">ZIP-316</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-3.5 py-2.5 font-mono text-xs text-neutral-800">
              <span className="truncate" title={unifiedAddress}>
                {middleTruncate(unifiedAddress, 22, 12)}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="ml-2 text-neutral-500 hover:text-neutral-950 cursor-pointer"
                title="Copy Address"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-950 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-neutral-700" />
                Faucet / Testnet Deposit
              </span>
              <span className="text-[11px] text-neutral-500">Instant shielded note</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-500">
              Receive an incoming shielded payment to credit spendable testnet funds in real time.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isDepositing}
                onClick={() => void onDepositTestnetZec(25_000_000, "Shielded Staking Reward")}
                className="font-mono text-xs"
              >
                +0.25 ZEC
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isDepositing}
                onClick={() => void onDepositTestnetZec(100_000_000, "OTC Shielded Transfer")}
                className="font-mono text-xs"
              >
                +1.00 ZEC
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isDepositing}
                onClick={() => void onDepositTestnetZec(500_000_000, "Cold Vault Top-up")}
                className="font-mono text-xs"
              >
                +5.00 ZEC
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
