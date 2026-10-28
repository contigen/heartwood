"use client"

import * as React from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Eye,
  Plus,
  QrCode,
  Radio,
  Search,
  Send,
  Shield,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  LensMode,
  ShieldedTransactionPlan,
  UnlockMetrics,
  WalletSession,
} from "@/lib/heartwood-types"
import {
  cn,
  formatRelativeTime,
  formatZatoshis,
  formatZec,
  middleTruncate,
} from "@/lib/utils"

export type WalletWorkspaceProps = {
  session: WalletSession
  lastMetrics: UnlockMetrics | null
  lensMode: LensMode
  queuedCount: number
  onOpenSendModal: () => void
  onOpenReceiveModal: () => void
  onOpenTxDetail: (tx: ShieldedTransactionPlan) => void
  onTriggerDeferred: () => Promise<void>
}

export function WalletWorkspace({
  session,
  lastMetrics,
  lensMode,
  queuedCount,
  onOpenSendModal,
  onOpenReceiveModal,
  onOpenTxDetail,
  onTriggerDeferred,
}: WalletWorkspaceProps) {
  const [copiedUa, setCopiedUa] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const showInspector = lensMode === "inspector"
  const distressConfig = session.distress_config

  const handleCopyUa = () => {
    void navigator.clipboard.writeText(session.unified_address)
    setCopiedUa(true)
    setTimeout(() => setCopiedUa(false), 1800)
  }

  const spendableZec = session.balance_zatoshis / 100_000_000
  const usdEstimate = (spendableZec * 35.0).toFixed(2)

  const filteredTxs = session.transactions.filter((tx) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      tx.txid.toLowerCase().includes(q) ||
      tx.outputs.some(
        (o) =>
          o.recipient_address.toLowerCase().includes(q) ||
          o.label.toLowerCase().includes(q)
      )
    )
  })

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-neutral-950">
              {session.account_name}
            </span>
            <Badge variant="sky">Orchard Pool</Badge>
            {session.is_synthetic && (
              <Badge variant="amber" className="gap-1">
                <Shield className="h-3 w-3" />
                Zero-Oracle Defense Active
              </Badge>
            )}
            {showInspector && distressConfig && (
              <Badge variant="rose" className="gap-1">
                <Radio className="h-3 w-3" />
                Duress SOS Armed
              </Badge>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyUa}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 font-mono text-xs text-neutral-600 hover:text-neutral-950 transition cursor-pointer"
            title="Copy Unified Address"
          >
            <span>{middleTruncate(session.unified_address, 16, 8)}</span>
            {copiedUa ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>

        {session.is_synthetic && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-amber-700" />
              Zero-Oracle Immunity Verification
            </div>
            <p className="text-neutral-600 leading-relaxed">
              An unregistered PIN was entered. Instead of returning an error or MAC failure, Heartwood evaluated both Argon2id slots in constant time and derived this ephemeral zero-balance wallet. A coercer cannot tell whether the PIN exists.
            </p>
          </div>
        )}

        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Shielded Spendable Balance
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-950">
              {formatZec(session.balance_zatoshis, 4)}
            </span>
            <span className="font-mono text-xl text-neutral-400 font-normal">
              ZEC
            </span>
          </div>
          <div className="font-mono text-xs text-neutral-500">
            ≈ ${usdEstimate} USD · {formatZatoshis(session.balance_zatoshis)} zatoshis
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button onClick={onOpenSendModal} className="px-6 gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Send Payment
          </Button>

          <Button variant="secondary" onClick={onOpenReceiveModal} className="px-6 gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Receive / Deposit
          </Button>

          {showInspector && queuedCount > 0 && (
            <Button variant="softAmber" onClick={() => void onTriggerDeferred()} className="gap-2">
              <Clock className="h-3.5 w-3.5" />
              Broadcast {queuedCount} Queued SOS
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">
              Transaction History
            </h2>
            <p className="text-xs text-neutral-500">
              {session.transactions.length} shielded compact block transactions
            </p>
          </div>

          {session.transactions.length > 3 && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by address or txid..."
                className="pl-8 text-xs h-9"
              />
            </div>
          )}
        </div>

        {session.transactions.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center space-y-2">
            <Shield className="mx-auto h-7 w-7 text-neutral-300" />
            <div className="text-sm font-semibold text-neutral-900">
              No transactions yet
            </div>
            <p className="text-xs text-neutral-500">
              Use &quot;Receive / Deposit&quot; to test receiving shielded funds, or send a payment.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-200 overflow-hidden shadow-xs">
            {filteredTxs
              .slice()
              .reverse()
              .map((tx) => {
                const primaryOut = tx.outputs[0]
                const isIncoming = tx.inputs_spent_zatoshis === 0
                return (
                  <button
                    key={tx.txid}
                    type="button"
                    onClick={() => onOpenTxDetail(tx)}
                    className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:bg-neutral-50/70 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs",
                          isIncoming
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-neutral-800"
                        )}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-neutral-950 truncate">
                            {primaryOut?.label || (isIncoming ? "Incoming Deposit" : "Shielded Payment")}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {formatRelativeTime(tx.created_at)}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-neutral-400 truncate">
                          {middleTruncate(primaryOut?.recipient_address || tx.txid, 24, 10)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          "font-mono text-sm font-semibold",
                          isIncoming ? "text-emerald-700" : "text-neutral-950"
                        )}
                      >
                        {isIncoming ? "+" : "-"}
                        {formatZec(primaryOut?.amount_zatoshis ?? 0, 4)} ZEC
                      </div>
                      <div className="font-mono text-[11px] text-neutral-400">
                        {tx.on_chain_actions.length} Orchard actions
                      </div>
                    </div>
                  </button>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
