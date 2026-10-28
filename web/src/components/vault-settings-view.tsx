"use client"

import * as React from "react"
import { Check, Eye, EyeOff, KeyRound, Lock, Radio, Save, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DistressConfig, DistressMode, SavedContact } from "@/lib/heartwood-types"

export type VaultSettingsViewProps = {
  accountName: string
  mnemonic: string
  distressConfig: DistressConfig | null
  savedContacts: SavedContact[]
  contactAddress: string
  onSaveDistressConfig: (params: {
    trustedContactAddress: string
    defaultMessage: string
    mode: DistressMode
  }) => Promise<void>
  isSaving: boolean
}

export function VaultSettingsView({
  accountName,
  mnemonic,
  distressConfig,
  savedContacts,
  contactAddress,
  onSaveDistressConfig,
  isSaving,
}: VaultSettingsViewProps) {
  const [showMnemonic, setShowMnemonic] = React.useState(false)
  const [emergencyAddress, setEmergencyAddress] = React.useState(
    distressConfig?.trusted_contact_address || contactAddress
  )
  const [emergencyMessage, setEmergencyMessage] = React.useState(
    distressConfig?.default_message || "COERCION ALERT: Forced transfer executed on device"
  )
  const [emergencyMode, setEmergencyMode] = React.useState<DistressMode>(
    distressConfig?.mode || "Immediate"
  )
  const [includeGps, setIncludeGps] = React.useState(true)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emergencyAddress.trim()) return
    await onSaveDistressConfig({
      trustedContactAddress: emergencyAddress.trim(),
      defaultMessage: emergencyMessage.trim(),
      mode: emergencyMode,
    })
  }

  const mnemonicWords = mnemonic.split(" ").filter(Boolean)

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Vault Settings & Duress Configuration
          </h1>
          <Badge variant="emerald">ZIP-32 Keystore</Badge>
        </div>
        <p className="text-sm text-neutral-500">
          Manage your shielded account credentials, recovery phrase, and covert emergency parameters.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">
              Secret Recovery Phrase ({accountName})
            </h2>
            <p className="text-xs text-neutral-500">
              128-bit BIP-39 mnemonic seed. Keep this offline and never share it.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMnemonic(!showMnemonic)}
          >
            {showMnemonic ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide Phrase
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Reveal Recovery Phrase
              </>
            )}
          </Button>
        </div>

        {showMnemonic ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 font-mono text-xs">
            {mnemonicWords.map((word, idx) => (
              <div
                key={`${word}-${idx}`}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900"
              >
                <span className="text-[10px] text-neutral-400 select-none">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{word}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-xs text-neutral-500">
            Recovery phrase is hidden for your safety. Click &quot;Reveal Recovery Phrase&quot; to inspect your seed words.
          </div>
        )}
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-6 shadow-xs"
      >
        <div className="border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-950">
              Covert Emergency & Duress Rules
            </h2>
            <Badge variant="rose">In-Band Signal</Badge>
          </div>
          <p className="text-xs text-neutral-500">
            These rules control how covert distress signals are constructed when transactions are sent from the decoy volume under coercion.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
              <label>Emergency Guardian Shielded Address</label>
              {savedContacts.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-neutral-400">Select contact:</span>
                  {savedContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEmergencyAddress(c.address)}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700 hover:bg-neutral-200 cursor-pointer"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input
              value={emergencyAddress}
              onChange={(e) => setEmergencyAddress(e.target.value)}
              placeholder="utest1..."
              className="font-mono text-xs"
              required
            />
            <p className="text-[11px] text-neutral-400">
              The recipient of the silent Output #1 note. Only this contact can trial-decrypt the distress beacon.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Default Emergency Distress Payload
            </label>
            <Input
              value={emergencyMessage}
              onChange={(e) => setEmergencyMessage(e.target.value)}
              placeholder="e.g. COERCION ALERT: Forced transfer executed on device"
              className="text-xs"
              required
            />
            <p className="text-[11px] text-neutral-400">
              Encoded into the 512-byte ZIP-302 memo frame with timestamp, coerced recipient, and amount.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <label className="text-xs font-semibold text-neutral-900 block">
                Broadcast Dispatch Mode
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEmergencyMode("Immediate")}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition cursor-pointer ${
                    emergencyMode === "Immediate"
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  Immediate (In-Band)
                </button>
                <button
                  type="button"
                  onClick={() => setEmergencyMode("Deferred")}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition cursor-pointer ${
                    emergencyMode === "Deferred"
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  Deferred (Outbox)
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                {emergencyMode === "Immediate"
                  ? "Transmits covert note in the same transaction as the coerced payment."
                  : "Queues beacon in encrypted local storage until the device is unsupervised."}
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <label className="text-xs font-semibold text-neutral-900 block">
                GPS Telemetry
              </label>
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includeGps}
                  onChange={(e) => setIncludeGps(e.target.checked)}
                  className="rounded border-neutral-300"
                />
                <span>Attach coordinates (37.7749, -122.4194)</span>
              </label>
              <p className="text-[11px] text-neutral-500">
                Embeds 16 bytes of binary lat/lon coordinates inside the 512B memo payload.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={isSaving || !emergencyAddress.trim()}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving Configuration..." : "Save Duress Settings"}
          </Button>
        </div>
      </form>
    </div>
  )
}
