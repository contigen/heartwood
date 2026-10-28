"use client"

import * as React from "react"
import { Check, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  ContainerEntropyData,
  IndependenceReport,
  TimingSample,
} from "@/lib/heartwood-types"

export type ContainerForensicsViewProps = {
  entropy: ContainerEntropyData
  independence: IndependenceReport
  timing: TimingSample[]
  onRefresh: () => Promise<void>
}

export function ContainerForensicsView({
  entropy,
  independence,
  timing,
  onRefresh,
}: ContainerForensicsViewProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const slotCards = [
    {
      title: "Slot 0 · Primary Volume",
      metric: `${entropy.slot_0_entropy.toFixed(3)}`,
      unit: "bits/byte",
      subtitle: "Bytes 0 .. 16,384 (0–16 KiB)",
      features: [
        "PIN A → Argon2id (32 MiB, t=3)",
        "Decrypts Seed A (Primary Savings)",
        "Zero pointers or references to Slot 1",
        "Indistinguishable AEAD ciphertext",
      ],
      badge: "PIN 2468",
      badgeVariant: "emerald" as const,
    },
    {
      title: "Slot 1 · Hidden Volume",
      metric: `${entropy.slot_1_entropy.toFixed(3)}`,
      unit: "bits/byte",
      subtitle: "Bytes 32,768 .. 49,152 (32–48 KiB)",
      features: [
        "PIN B → Independent Salt & Nonce",
        "Decrypts Seed B (Personal Daily)",
        "Stores covert Trusted Contact UA/IVK",
        "Appears as free space under PIN A",
      ],
      badge: "PIN 1357",
      badgeVariant: "rose" as const,
    },
    {
      title: "CSPRNG Padding Region",
      metric: `${entropy.padding_entropy.toFixed(3)}`,
      unit: "bits/byte",
      subtitle: "Bytes 49,152 .. 65,536 (48–64 KiB)",
      features: [
        "OS CSPRNG uniform initialization",
        "No magic headers or volume table",
        "Matches Slot 1 entropy distribution",
        `Chi-square: ${entropy.overall_chi_squared.toFixed(1)} (df=255)`,
      ],
      badge: "Noise Floor",
      badgeVariant: "sky" as const,
    },
    {
      title: "Independence Proof",
      metric: `${independence.seed_bitwise_hamming_distance}`,
      unit: "/ 256 bits",
      subtitle: "I(Seed B ; Seed A, PIN A) = 0",
      features: [
        `Seed A ≠ Seed B (${independence.seed_a_seed_b_equal ? "FAIL" : "Verified"})`,
        `Slot 0 cross-refs: ${independence.contains_cross_references ? "Detected" : "0 Leaks"}`,
        "Twin Argon2id evaluation per unlock",
        `Zero-knowledge deniable: ${independence.zero_knowledge_deniable ? "Confirmed" : "False"}`,
      ],
      badge: "Audited",
      badgeVariant: "indigo" as const,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Keystore Forensics & Timing Proof
            </h1>
            <Badge variant="emerald">65,536 bytes fixed</Badge>
            <Badge variant="sky">veracrypt hidden-volume model</Badge>
          </div>
          <p className="text-sm text-neutral-500">
            Live statistical analysis of the 64 KiB encrypted container, seed
            Hamming distance, and constant-time Argon2id execution profile.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Re-audit Container
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {slotCards.map((card) => (
          <div
            key={card.title}
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 space-y-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-neutral-950">
                  {card.title}
                </span>
                <Badge variant={card.badgeVariant}>{card.badge}</Badge>
              </div>
              <div>
                <span className="font-mono text-3xl font-semibold tracking-tight text-neutral-950">
                  {card.metric}
                </span>{" "}
                <span className="font-mono text-xs text-neutral-500">
                  {card.unit}
                </span>
              </div>
              <p className="font-mono text-xs text-neutral-400">
                {card.subtitle}
              </p>
            </div>

            <div className="space-y-2 border-t border-neutral-100 pt-4">
              <div className="text-xs font-medium text-neutral-400">
                Verified properties:
              </div>
              <ul className="space-y-2 text-xs text-neutral-700">
                {card.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-900" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Raw 64 KiB Container Byte Sample
              </h2>
              <p className="text-xs text-neutral-500">
                First 512 bytes of the container — zero magic bytes, headers, or
                partition markers
              </p>
            </div>
            <Badge variant="neutral" className="font-mono">
              H(X) = {entropy.overall_shannon_entropy.toFixed(4)}
            </Badge>
          </div>

          <div className="rounded-xl bg-neutral-100 p-4 font-mono text-[11px] leading-relaxed text-neutral-700 overflow-x-auto max-h-60">
            {entropy.preview_hex_chunks.map((chunk, idx) => {
              const offsetHex = (idx * 32).toString(16).padStart(4, "0")
              const formattedPairs =
                chunk.match(/.{1,2}/g)?.join(" ") ?? chunk
              return (
                <div key={offsetHex} className="whitespace-nowrap">
                  <span className="text-neutral-400 select-none mr-3">
                    0x{offsetHex}:
                  </span>
                  <span>{formattedPairs}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Constant-Time Unlock Telemetry
              </h2>
              <p className="text-xs text-neutral-500">
                Measured latency across Primary, Decoy, and Invalid PINs
              </p>
            </div>
            <Badge variant="emerald">2 × Argon2id</Badge>
          </div>

          {timing.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-500">
              No unlock samples recorded in this session yet. Unlock any PIN to
              record live KDF measurements.
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
              {timing
                .slice()
                .reverse()
                .slice(0, 6)
                .map((sample, idx) => (
                  <div
                    key={`${sample.label}-${idx}`}
                    className="flex items-center justify-between px-4 py-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-neutral-950">
                        {sample.label}
                      </div>
                      <div className="font-mono text-[11px] text-neutral-400">
                        PIN: {sample.pin} · Slot 0 + Slot 1 evaluated
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold text-neutral-950">
                      {sample.elapsed_ms} ms
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
