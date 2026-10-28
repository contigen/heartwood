"use client"

import * as React from "react"
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Lock,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  DistressAlert,
  DistressConfig,
  ShieldedTransactionPlan,
} from "@/lib/heartwood-types"
import { cn, formatZatoshis, middleTruncate } from "@/lib/utils"

export type InBandSignalPipelineProps = {
  activeDraftAmountZec: number
  activeDraftRecipient: string
  activeDistressConfig: DistressConfig | null
  selectedTx: ShieldedTransactionPlan | null
  allTransactions: ShieldedTransactionPlan[]
  onSelectTx: (tx: ShieldedTransactionPlan) => void
  alerts: DistressAlert[]
  contactAddress: string
  contactIvk: string
  queuedCount: number
  onTriggerDeferred: () => Promise<void>
}

export function InBandSignalPipeline({
  activeDraftAmountZec,
  activeDraftRecipient,
  activeDistressConfig,
  selectedTx,
  allTransactions,
  onSelectTx,
  alerts,
  contactAddress,
  contactIvk,
  queuedCount,
  onTriggerDeferred,
}: InBandSignalPipelineProps) {
  const [perspective, setPerspective] = React.useState<"anatomy" | "wire" | "ivk">(
    "anatomy"
  )

  const inspectTx =
    selectedTx ??
    (allTransactions.length > 0
      ? allTransactions[allTransactions.length - 1]
      : null)

  const matchingAlert = inspectTx
    ? alerts.find((a) => a.txid === inspectTx.txid) ?? null
    : null

  const primaryAmountZat = inspectTx
    ? inspectTx.outputs[0]?.amount_zatoshis ?? 0
    : Math.round((activeDraftAmountZec || 1.0) * 100_000_000)

  const primaryRecipient = inspectTx
    ? inspectTx.outputs[0]?.recipient_address ?? activeDraftRecipient
    : activeDraftRecipient

  const hasCovertOutput = inspectTx
    ? inspectTx.silent_distress_injected
    : Boolean(activeDistressConfig && activeDistressConfig.mode === "Immediate")

  const isDeferredQueued = inspectTx
    ? inspectTx.deferred_distress_queued
    : Boolean(activeDistressConfig && activeDistressConfig.mode === "Deferred")

  const actions = inspectTx?.on_chain_actions ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
              In-Band Signal Pipeline
            </h2>
            <Badge variant="rose">the money is cover for the signal</Badge>
            <Badge variant="sky">3 × 580 B orchard bundle</Badge>
          </div>
          <p className="text-sm text-neutral-500">
            Inspect how a single coerced payment carries a covert 512-byte
            ZIP-302 distress beacon inside an indistinguishable Orchard bundle.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full bg-neutral-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setPerspective("anatomy")}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-medium transition cursor-pointer",
              perspective === "anatomy"
                ? "bg-white text-neutral-950 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-950"
            )}
          >
            1. Note Split Anatomy
          </button>
          <button
            type="button"
            onClick={() => setPerspective("wire")}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-medium transition cursor-pointer",
              perspective === "wire"
                ? "bg-white text-neutral-950 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-950"
            )}
          >
            2. Coercer Wire View
          </button>
          <button
            type="button"
            onClick={() => setPerspective("ivk")}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-medium transition cursor-pointer",
              perspective === "ivk"
                ? "bg-white text-neutral-950 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-950"
            )}
          >
            3. Contact IVK Decryption
          </button>
        </div>
      </div>

      {allTransactions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">
            Inspect broadcast transaction:
          </span>
          {allTransactions
            .slice()
            .reverse()
            .slice(0, 5)
            .map((tx) => {
              const active = inspectTx?.txid === tx.txid
              return (
                <button
                  key={tx.txid}
                  type="button"
                  onClick={() => onSelectTx(tx)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs transition cursor-pointer",
                    active
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                  )}
                >
                  <span>{tx.txid.slice(0, 14)}...</span>
                  {tx.silent_distress_injected && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        active ? "bg-rose-400" : "bg-rose-500"
                      )}
                    />
                  )}
                </button>
              )
            })}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 border-b border-neutral-200 bg-neutral-50/50">
          <div className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500">Bundle Footprint</div>
            <div className="mt-1 font-mono text-xl font-semibold text-neutral-950">
              1,740 bytes
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">
              3 × 580 B AEAD note ciphertexts
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500">Covert Signal Status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xl font-semibold text-neutral-950">
                {hasCovertOutput
                  ? "In-Band Active"
                  : isDeferredQueued
                    ? "Deferred Queue"
                    : "Chaff Padded"}
              </span>
              <Badge
                variant={
                  hasCovertOutput
                    ? "rose"
                    : isDeferredQueued
                      ? "amber"
                      : "emerald"
                }
              >
                {hasCovertOutput
                  ? "HWOODSOS v1"
                  : isDeferredQueued
                    ? `${queuedCount} queued`
                    : "standard"}
              </Badge>
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">
              {hasCovertOutput
                ? "Output #1 encrypted to Trusted Contact UA"
                : isDeferredQueued
                  ? "Encrypted in local outbox until unsupervised"
                  : "Output #1 is indistinguishable dummy chaff"}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500">ZIP-317 Fee & Covert Cost</div>
            <div className="mt-1 font-mono text-xl font-semibold text-neutral-950">
              {hasCovertOutput ? "0.0002 ZEC" : "0.0001 ZEC"}
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">
              10,000 zat fee {hasCovertOutput ? "+ 10,000 zat SOS note" : ""}
            </div>
          </div>
        </div>

        {perspective === "anatomy" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-neutral-900">
                    ACTION #0 · VISIBLE COVER
                  </span>
                  <Badge variant="neutral">coercer destination</Badge>
                </div>
                <div className="font-mono text-2xl font-semibold text-neutral-950">
                  {((primaryAmountZat || 0) / 100_000_000).toFixed(4)} ZEC
                </div>
                <p className="text-xs leading-relaxed text-neutral-500">
                  The payment demanded by the coercer. Satisfies visual and
                  recipient-side verification of the forced transfer.
                </p>
                <div className="space-y-1.5 rounded-xl bg-neutral-100 p-3 font-mono text-[11px] text-neutral-700">
                  <div className="truncate">
                    to: {middleTruncate(primaryRecipient, 18, 10)}
                  </div>
                  <div>memo: 0xF60000...00 (ZIP-302 empty memo)</div>
                  <div>note: 580 B ChaCha20-Poly1305</div>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-2xl border p-5 space-y-3 transition",
                  hasCovertOutput
                    ? "border-rose-300 bg-rose-50/20"
                    : isDeferredQueued
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-neutral-200 bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-neutral-900">
                    ACTION #1 · {hasCovertOutput ? "COVERT SOS NOTE" : "CHAFF / DEFERRED"}
                  </span>
                  <Badge
                    variant={
                      hasCovertOutput
                        ? "rose"
                        : isDeferredQueued
                          ? "amber"
                          : "sky"
                    }
                  >
                    {hasCovertOutput
                      ? "in-band beacon"
                      : isDeferredQueued
                        ? "queued locally"
                        : "dummy action"}
                  </Badge>
                </div>
                <div className="font-mono text-2xl font-semibold text-neutral-950">
                  {hasCovertOutput ? "0.0001 ZEC" : "0.0000 ZEC"}
                </div>
                <p className="text-xs leading-relaxed text-neutral-600">
                  {hasCovertOutput
                    ? "Silently addressed to your Trusted Contact. Embeds a 512-byte HWOODSOS beacon inside the same shielded transaction."
                    : isDeferredQueued
                      ? "On-chain Action #1 is dummy chaff while the HWOODSOS beacon waits in the encrypted local outbox."
                      : "Padded dummy Orchard action so 1-recipient and 2-recipient transfers have identical on-chain size."}
                </p>
                <div className="space-y-1.5 rounded-xl bg-neutral-100 p-3 font-mono text-[11px] text-neutral-800">
                  <div className="truncate">
                    to: {middleTruncate(contactAddress, 18, 10)}
                  </div>
                  <div>
                    memo:{" "}
                    {hasCovertOutput || isDeferredQueued
                      ? "HWOODSOS | v1 | 37.7749,-122.4194 | 512B"
                      : "CSPRNG uniform dummy payload (512B)"}
                  </div>
                  <div>note: 580 B ChaCha20-Poly1305</div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-neutral-900">
                    ACTION #2 · SHIELDED CHANGE
                  </span>
                  <Badge variant="emerald">internal orchard</Badge>
                </div>
                <div className="font-mono text-2xl font-semibold text-neutral-950">
                  {inspectTx
                    ? `${(inspectTx.change_zatoshis / 100_000_000).toFixed(4)} ZEC`
                    : " Remainder"}
                </div>
                <p className="text-xs leading-relaxed text-neutral-500">
                  Remaining note value returned to the active identity&apos;s
                  internal Orchard change address.
                </p>
                <div className="space-y-1.5 rounded-xl bg-neutral-100 p-3 font-mono text-[11px] text-neutral-700">
                  <div>
                    change:{" "}
                    {inspectTx
                      ? `${formatZatoshis(inspectTx.change_zatoshis)} zatoshis`
                      : "computed on spend"}
                  </div>
                  <div>memo: 0xF60000...00 (internal note)</div>
                  <div>note: 580 B ChaCha20-Poly1305</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-neutral-900">
                  512-BYTE ZIP-302 MEMO FRAME (HWOODSOS BINARY LAYOUT)
                </span>
                <span className="font-mono text-[11px] text-neutral-500">
                  Total: 512 bytes · Encrypted inside 580-byte Orchard note
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6 font-mono text-[11px]">
                <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
                  <div className="text-neutral-400">[0..8] 8B</div>
                  <div className="font-semibold text-neutral-950">HWOODSOS</div>
                  <div className="text-[10px] text-neutral-500">Magic Header</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
                  <div className="text-neutral-400">[8..10] 2B</div>
                  <div className="font-semibold text-neutral-950">0x01 · 0x01</div>
                  <div className="text-[10px] text-neutral-500">Ver + Coerced</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
                  <div className="text-neutral-400">[10..18] 8B</div>
                  <div className="font-semibold text-neutral-950">i64 BE</div>
                  <div className="text-[10px] text-neutral-500">UTC Timestamp</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
                  <div className="text-neutral-400">[18..34] 16B</div>
                  <div className="font-semibold text-neutral-950">37.77, -122.41</div>
                  <div className="text-[10px] text-neutral-500">f64 Lat / Lon</div>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-2.5">
                  <div className="text-rose-500">[34..36+N]</div>
                  <div className="font-semibold text-rose-950">JSON Payload</div>
                  <div className="text-[10px] text-rose-700">Coerced To + Amt</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
                  <div className="text-neutral-400">[36+N..512]</div>
                  <div className="font-semibold text-neutral-950">CSPRNG Pad</div>
                  <div className="text-[10px] text-neutral-500">Uniform Noise</div>
                </div>
              </div>
            </div>

            {queuedCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50/50 p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-amber-950">
                    {queuedCount} Deferred Distress Beacon(s) Waiting in Encrypted Outbox
                  </div>
                  <p className="text-xs text-amber-800">
                    Simulate the device returning to an unsupervised network to
                    drain the outbox and broadcast the covert transaction.
                  </p>
                </div>
                <Button variant="default" size="sm" onClick={() => void onTriggerDeferred()}>
                  Broadcast Outbox Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {perspective === "wire" && (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-neutral-500" />
                Public Blockchain / Coercer Mempool View
              </div>
              <Badge variant="emerald">zero plaintext metadata</Badge>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Without the Trusted Contact&apos;s Incoming Viewing Key, all three
              Orchard actions are indistinguishable 580-byte random ciphertexts.
              The coercer cannot tell whether Action #1 is dummy padding or an
              emergency distress beacon.
            </p>
            <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
              {(actions.length > 0
                ? actions
                : [0, 1, 2].map((idx) => ({
                    action_index: idx,
                    nullifier: `0x8f3c...a91${idx}`,
                    cmx: `0x4d2e...c08${idx}`,
                    ephemeral_key: `0x7b1a...e44${idx}`,
                    enc_ciphertext_preview: "a94f81c3e05b72d1984a63f0c2e8b14d...",
                    enc_ciphertext_len: 580,
                  }))
              ).map((act) => (
                <div
                  key={act.action_index}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 font-mono text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-950">
                        Orchard Action #{act.action_index}
                      </span>
                      <Badge variant="neutral">
                        {act.enc_ciphertext_len} bytes
                      </Badge>
                      <span className="text-neutral-400">
                        {act.enc_ciphertext_preview}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      epk: {middleTruncate(act.ephemeral_key, 16, 8)} · cmx:{" "}
                      {middleTruncate(act.cmx, 16, 8)} · nf:{" "}
                      {middleTruncate(act.nullifier, 16, 8)}
                    </div>
                  </div>
                  <Badge variant="outline">Indistinguishable Ciphertext</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {perspective === "ivk" && (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-600" />
                Trusted Contact AEAD Trial Decryption (`{middleTruncate(contactIvk, 18, 8)}`)
              </div>
              <Badge variant="indigo">ChaCha20-Poly1305 MAC check</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Action #0 Trial</span>
                  <Badge variant="neutral">MAC Mismatch</Badge>
                </div>
                <div className="text-neutral-700 font-sans text-xs">
                  Encrypted to coercer&apos;s key. Poly1305 tag rejects cleanly;
                  scanner skips note.
                </div>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-4 font-mono text-xs space-y-1.5",
                  matchingAlert || hasCovertOutput
                    ? "border-rose-300 bg-rose-50/40"
                    : "border-neutral-200 bg-neutral-50/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-900 font-semibold">
                    Action #1 Trial
                  </span>
                  <Badge
                    variant={
                      matchingAlert || hasCovertOutput ? "rose" : "neutral"
                    }
                  >
                    {matchingAlert || hasCovertOutput
                      ? "Poly1305 Authenticated ✓"
                      : "MAC Mismatch"}
                  </Badge>
                </div>
                <div className="text-neutral-800 font-sans text-xs">
                  {matchingAlert
                    ? `Decrypted 512B HWOODSOS: "${matchingAlert.beacon.alert_message}" (${((matchingAlert.beacon.coerced_amount_zatoshis ?? 0) / 1e8).toFixed(4)} ZEC coerced)`
                    : hasCovertOutput
                      ? "Ready: Sending this transfer will authenticate under Trusted Contact IVK."
                      : "No beacon addressed to Trusted Contact in this transaction."}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Action #2 Trial</span>
                  <Badge variant="neutral">MAC Mismatch</Badge>
                </div>
                <div className="text-neutral-700 font-sans text-xs">
                  Internal sender change note. Poly1305 tag rejects under
                  Trusted Contact IVK.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
