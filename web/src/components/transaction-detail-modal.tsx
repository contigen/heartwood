"use client"

import * as React from "react"
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ShieldedTransactionPlan } from "@/lib/heartwood-types"
import { formatRelativeTime, formatTimestamp, formatZec, middleTruncate } from "@/lib/utils"

export type TransactionDetailModalProps = {
  tx: ShieldedTransactionPlan | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransactionDetailModal({
  tx,
  open,
  onOpenChange,
}: TransactionDetailModalProps) {
  const [copiedTxid, setCopiedTxid] = React.useState(false)

  if (!tx) return null

  const handleCopyTxid = () => {
    void navigator.clipboard.writeText(tx.txid)
    setCopiedTxid(true)
    setTimeout(() => setCopiedTxid(false), 1800)
  }

  const primaryOut = tx.outputs[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Shielded Transaction Details</DialogTitle>
            <Badge variant="emerald">Confirmed in Compact Block</Badge>
          </div>
          <DialogDescription>
            Zero-knowledge shielded Orchard transfer with 3 uniform note ciphertexts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1 min-w-0">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-neutral-500">Transaction Value</span>
              <span className="font-mono text-2xl font-semibold text-neutral-950">
                {formatZec(primaryOut?.amount_zatoshis ?? 0, 4)} ZEC
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-neutral-500 border-t border-neutral-200/80 pt-2.5">
              <span>ZIP-317 Network Fee:</span>
              <span className="text-neutral-900">{formatZec(tx.fee_zatoshis, 4)} ZEC</span>
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-neutral-500">
              <span>Timestamp:</span>
              <span className="text-neutral-900">
                {formatTimestamp(tx.created_at)} ({formatRelativeTime(tx.created_at)})
              </span>
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Transaction ID (TxID)</span>
              <a
                href={`https://sochain.com/tx/ZECTEST/${tx.txid}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-950 transition"
              >
                <span>View on Explorer</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-3.5 py-2 font-mono text-xs text-neutral-800 min-w-0">
              <span className="truncate" title={tx.txid}>{middleTruncate(tx.txid, 18, 10)}</span>
              <button
                type="button"
                onClick={handleCopyTxid}
                className="ml-2 text-neutral-500 hover:text-neutral-950 cursor-pointer shrink-0"
                title="Copy TxID"
              >
                {copiedTxid ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2 min-w-0">
            <span className="text-xs font-medium text-neutral-500">
              Orchard Bundle Actions ({tx.on_chain_actions.length} Padded Actions)
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {tx.outputs.map((out, idx) => (
                <div
                  key={`${out.recipient_address}-${idx}`}
                  className="rounded-xl border border-neutral-200 bg-white p-3 space-y-1.5 text-xs font-mono min-w-0 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-950">
                      Output #{idx} · {out.label}
                    </span>
                    <Badge variant={out.is_distress_beacon ? "rose" : "neutral"} className="shrink-0">
                      {formatZec(out.amount_zatoshis, 4)} ZEC
                    </Badge>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono truncate" title={out.recipient_address}>
                    to: {middleTruncate(out.recipient_address, 18, 10)}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    cmx: {middleTruncate(out.cmx || "0x9a8b...1c0d", 16, 8)} · note: 580 B
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
