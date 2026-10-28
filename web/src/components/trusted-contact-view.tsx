"use client"

import * as React from "react"
import {
  Check,
  Copy,
  MapPin,
  Radio,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DistressAlert } from "@/lib/heartwood-types"
import {
  formatRelativeTime,
  formatTimestamp,
  formatZec,
  middleTruncate,
} from "@/lib/utils"

export type TrustedContactViewProps = {
  alerts: DistressAlert[]
  contactAddress: string
  contactIvk: string
  queuedCount: number
  onTriggerDeferred: () => Promise<void>
  onSwitchToWallet: () => void
}

export function TrustedContactView({
  alerts,
  contactAddress,
  contactIvk,
  queuedCount,
  onTriggerDeferred,
  onSwitchToWallet,
}: TrustedContactViewProps) {
  const [copiedIvk, setCopiedIvk] = React.useState(false)
  const [copiedAddr, setCopiedAddr] = React.useState(false)

  const handleCopyIvk = () => {
    void navigator.clipboard.writeText(contactIvk)
    setCopiedIvk(true)
    setTimeout(() => setCopiedIvk(false), 1800)
  }

  const handleCopyAddr = () => {
    void navigator.clipboard.writeText(contactAddress)
    setCopiedAddr(true)
    setTimeout(() => setCopiedAddr(false), 1800)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Trusted Contact Receiver
            </h1>
            <Badge variant="emerald">ivk trial decryption live</Badge>
            <Badge variant="indigo">zip-302 512B memo</Badge>
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Your trusted contact holds only an Incoming Viewing Key (IVK). Their
            scanner performs ChaCha20-Poly1305 trial decryption on every
            580-byte Orchard action on-chain and automatically extracts any
            authenticated <span className="font-mono text-neutral-800">HWOODSOS</span>{" "}
            distress payload.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <Button
              variant="softAmber"
              size="sm"
              onClick={() => void onTriggerDeferred()}
            >
              Broadcast {queuedCount} Queued Outbox Beacon(s)
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              Trusted Contact Unified Address
            </span>
            <Badge variant="sky">recipient ua</Badge>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-3.5 py-2.5 font-mono text-xs text-neutral-800">
            <span className="truncate">{middleTruncate(contactAddress, 24, 14)}</span>
            <button
              type="button"
              onClick={handleCopyAddr}
              className="ml-2 text-neutral-500 hover:text-neutral-950 cursor-pointer"
            >
              {copiedAddr ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              Trusted Contact Incoming Viewing Key (Watch-Only)
            </span>
            <Badge variant="indigo">trial decrypt key</Badge>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-3.5 py-2.5 font-mono text-xs text-neutral-800">
            <span className="truncate">{middleTruncate(contactIvk, 24, 14)}</span>
            <button
              type="button"
              onClick={handleCopyIvk}
              className="ml-2 text-neutral-500 hover:text-neutral-950 cursor-pointer"
            >
              {copiedIvk ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-950">
              Decoded Emergency Beacons
            </h2>
            <Badge variant={alerts.length > 0 ? "rose" : "neutral"}>
              {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
            </Badge>
          </div>
          <span className="font-mono text-xs text-neutral-400">
            Magic Header: 0x48574F4F44534F53 (&quot;HWOODSOS&quot;)
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center space-y-3">
            <Radio className="mx-auto h-7 w-7 text-neutral-300" />
            <div className="text-base font-semibold text-neutral-900">
              No distress signals detected yet
            </div>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-neutral-500">
              Unlock the wallet with the Duress PIN (
              <span className="font-mono text-neutral-900">1357</span>) and send
              a payment to see the Trusted Contact&apos;s viewing key recover
              the hidden Output #1 beacon in real time.
            </p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={onSwitchToWallet}>
                Go to Wallet Workspace
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts
              .slice()
              .reverse()
              .map((alert) => (
                <div
                  key={`${alert.alert_id}-${alert.txid}`}
                  className="rounded-2xl border border-rose-200 bg-white p-6 space-y-4 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="rose" className="font-semibold">
                        <ShieldAlert className="h-3 w-3" />
                        {alert.beacon.distress_type}
                      </Badge>
                      <Badge variant="emerald">
                        Poly1305 Tag Authenticated ✓
                      </Badge>
                      <Badge variant="neutral" className="font-mono">
                        HWOODSOS v{alert.beacon.version}
                      </Badge>
                    </div>
                    <div className="font-mono text-xs text-neutral-500">
                      {formatTimestamp(alert.detected_at)} (
                      {formatRelativeTime(alert.detected_at)})
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-base font-semibold text-neutral-950">
                      {alert.beacon.alert_message}
                    </div>
                    <div className="font-mono text-xs text-neutral-500">
                      Carrier Transaction: {alert.txid}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-neutral-50/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="p-3.5">
                      <div className="text-[11px] text-neutral-500">
                        Coerced Payment Amount
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-semibold text-neutral-950">
                        {formatZec(
                          alert.beacon.coerced_amount_zatoshis ?? 0,
                          4
                        )}{" "}
                        ZEC
                      </div>
                    </div>
                    <div className="p-3.5">
                      <div className="text-[11px] text-neutral-500">
                        Coercer Destination Address
                      </div>
                      <div className="mt-0.5 font-mono text-xs font-medium text-neutral-800 truncate">
                        {middleTruncate(
                          alert.beacon.coerced_recipient ?? "N/A",
                          18,
                          10
                        )}
                      </div>
                    </div>
                    <div className="p-3.5">
                      <div className="text-[11px] text-neutral-500">
                        Covert Beacon Note Value
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-semibold text-emerald-700">
                        {formatZec(alert.received_zatoshis, 4)} ZEC (
                        {alert.received_zatoshis} zat)
                      </div>
                    </div>
                  </div>

                  {alert.beacon.latitude !== null &&
                    alert.beacon.longitude !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-rose-50/60 px-4 py-2.5 font-mono text-xs text-rose-900">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-rose-600" />
                          Embedded GPS Coordinates:{" "}
                          {alert.beacon.latitude.toFixed(4)},{" "}
                          {alert.beacon.longitude.toFixed(4)}
                        </span>
                        <span className="text-[11px] text-rose-700">
                          San Francisco, CA
                        </span>
                      </div>
                    )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
