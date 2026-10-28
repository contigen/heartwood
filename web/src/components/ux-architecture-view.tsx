"use client"

import * as React from "react"
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { HeartwoodSnapshot, ViewTab } from "@/lib/heartwood-types"
import { cn, formatZec } from "@/lib/utils"

export type UxArchitectureViewProps = {
  snapshot: HeartwoodSnapshot
  activeStage: number | null
  isRunningStage: boolean
  demoLogs: string[]
  onRunStage: (stage: number) => Promise<void>
  onRunAllStages: () => Promise<void>
  onResetDemo: () => Promise<void>
  onNavigateTab: (tab: ViewTab) => void
}

const DEMO_STAGES = [
  {
    stage: 1,
    tag: "Stage 01",
    title: "Primary Identity (PIN 2468)",
    description:
      "Unlock Slot 0 (142.50 ZEC) and inspect genuine shielded history with zero references to Slot 1.",
    targetTab: "wallet" as const,
  },
  {
    stage: 2,
    tag: "Stage 02",
    title: "Duress Decoy (PIN 1357)",
    description:
      "Lock and unlock Slot 1 (1.25 ZEC) in identical time (~165ms) with covert SOS armed.",
    targetTab: "wallet" as const,
  },
  {
    stage: 3,
    tag: "Stage 03",
    title: "In-Band SOS Payment",
    description:
      "Send 1.00 ZEC to coercer. Output #1 silently carries 512B HWOODSOS to Trusted Contact IVK.",
    targetTab: "emergency" as const,
  },
  {
    stage: 4,
    tag: "Stage 04",
    title: "Deferred Outbox Queue",
    description:
      "Queue SOS in encrypted local storage during monitored spend, then broadcast unsupervised.",
    targetTab: "signal" as const,
  },
  {
    stage: 5,
    tag: "Stage 05",
    title: "Independence & Entropy Proof",
    description:
      "Verify 7.997 bits/byte container entropy, ~128/256 seed Hamming distance, and timing parity.",
    targetTab: "forensics" as const,
  },
]

const MIND_MAP_BRANCHES = [
  {
    id: "lens",
    pillar: "01 · Perspective Lens",
    principle: "Everyday calm under coercion; total clarity under inspection.",
    nodes: [
      {
        label: "Coercer Stealth View",
        detail: "Pixel-identical UI across PIN 2468, PIN 1357, and wrong PIN 0000.",
        tab: "wallet" as const,
      },
      {
        label: "Inspector X-Ray View",
        detail: "Surfaces live 3-Action Orchard split, SOS mode switcher, and IVK trial status.",
        tab: "signal" as const,
      },
    ],
  },
  {
    id: "gate",
    pillar: "02 · Constant-Time Vault Gate",
    principle: "Zero timing or error oracle regardless of input PIN.",
    nodes: [
      {
        label: "Twin 32 MiB Argon2id KDF",
        detail: "Evaluates both Slot 0 and Slot 1 on every single unlock request.",
        tab: "forensics" as const,
      },
      {
        label: "Synthetic Fallback Session",
        detail: "Invalid PINs deterministically derive an empty utest1... wallet.",
        tab: "wallet" as const,
      },
    ],
  },
  {
    id: "signal",
    pillar: "03 · Visible Action Pipeline",
    principle: "The money is cover for the signal.",
    nodes: [
      {
        label: "Uniform 3 × 580 B Orchard Bundle",
        detail: "Action #0 Cover + Action #1 512B HWOODSOS + Action #2 Change.",
        tab: "signal" as const,
      },
      {
        label: "Trusted Contact IVK Trial Decrypt",
        detail: "Poly1305 tag authenticates Action #1 and decodes GPS + coerced amount.",
        tab: "emergency" as const,
      },
    ],
  },
  {
    id: "forensics",
    pillar: "04 · Mathematical Deniability",
    principle: "I(Seed B ; Seed A, PIN A) = 0 across 65,536 CSPRNG bytes.",
    nodes: [
      {
        label: "Offset Isolation (0 KiB vs 32 KiB)",
        detail: "Slot 1 is statistically indistinguishable from 48–64 KiB random padding.",
        tab: "forensics" as const,
      },
      {
        label: "Deferred Encrypted Outbox",
        detail: "Queues HWOODSOS locally when network traffic is closely watched.",
        tab: "wallet" as const,
      },
    ],
  },
]

export function UxArchitectureView({
  snapshot,
  activeStage,
  isRunningStage,
  demoLogs,
  onRunStage,
  onRunAllStages,
  onResetDemo,
  onNavigateTab,
}: UxArchitectureViewProps) {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              5-Stage Judging Script & UX Mind Map
            </h1>
            <Badge variant="emerald">1:1 interactive trace</Badge>
            <Badge variant="sky">section 7 spec</Badge>
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Execute each stage of the Zecathon demo script or trace how every
            cryptographic requirement maps 1:1 to a visible interface action.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => void onRunAllStages()}
            disabled={isRunningStage}
          >
            {isRunningStage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Walkthrough...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Full 5-Stage Walkthrough
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => void onResetDemo()}
            disabled={isRunningStage}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {DEMO_STAGES.map((item) => {
          const isCurrent = activeStage === item.stage
          return (
            <div
              key={item.stage}
              className={cn(
                "flex flex-col justify-between rounded-2xl border p-5 transition",
                isCurrent
                  ? "border-neutral-950 bg-neutral-50/70"
                  : "border-neutral-200 bg-white hover:border-neutral-400"
              )}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-neutral-500">
                    {item.tag}
                  </span>
                  {isCurrent && (
                    <Badge variant="ink" className="text-[10px]">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-semibold text-neutral-950">
                  {item.title}
                </div>
                <p className="text-xs leading-relaxed text-neutral-500">
                  {item.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <Button
                  variant={isCurrent ? "default" : "secondary"}
                  size="sm"
                  disabled={isRunningStage}
                  onClick={() => void onRunStage(item.stage)}
                  className="w-full"
                >
                  Run Stage {item.stage}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/60 px-5 py-3">
          <div className="flex items-center gap-2 font-mono text-xs font-medium text-neutral-800">
            <Terminal className="h-3.5 w-3.5 text-neutral-500" />
            Live Execution Trace
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500">
            <span>
              Active:{" "}
              {snapshot.state.is_locked
                ? "Vault Locked"
                : `${snapshot.state.session?.account_name} (${formatZec(snapshot.state.session?.balance_zatoshis ?? 0)} ZEC)`}
            </span>
            <span>·</span>
            <span>Alerts: {snapshot.alerts.length}</span>
          </div>
        </div>
        <div className="bg-neutral-100/70 p-5 font-mono text-xs leading-relaxed text-neutral-800 max-h-56 overflow-y-auto space-y-1.5">
          {demoLogs.map((line, index) => (
            <div key={`${index}-${line.slice(0, 16)}`} className="flex gap-2">
              <span className="text-neutral-400 select-none">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
            UX Mind Map · 1:1 Product & Cryptographic Trace
          </h2>
          <p className="text-xs text-neutral-500">
            Click any architectural node below to jump directly to its live
            interactive surface in the application.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MIND_MAP_BRANCHES.map((branch) => (
            <div
              key={branch.id}
              className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4"
            >
              <div className="space-y-1 border-b border-neutral-100 pb-3">
                <div className="font-mono text-xs font-semibold text-neutral-950">
                  {branch.pillar}
                </div>
                <p className="text-xs text-neutral-500">{branch.principle}</p>
              </div>

              <div className="space-y-2.5">
                {branch.nodes.map((node) => (
                  <button
                    key={node.label}
                    type="button"
                    onClick={() => onNavigateTab(node.tab)}
                    className="group flex w-full items-start justify-between gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 text-left transition hover:border-neutral-900 hover:bg-white cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-950">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {node.label}
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {node.detail}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-950" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
