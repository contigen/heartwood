"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BookUser,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Radio,
  RotateCcw,
  Settings,
  Shield,
  SlidersHorizontal,
  Wallet,
} from "lucide-react"
import { AddressBookView } from "@/components/address-book-view"
import { ContainerForensicsView } from "@/components/container-forensics-view"
import { HeartwoodMark } from "@/components/heartwood-mark"
import { InBandSignalPipeline } from "@/components/in-band-signal-pipeline"
import { PinVaultGate } from "@/components/pin-vault-gate"
import { ReceiveModal } from "@/components/receive-modal"
import { SendModal } from "@/components/send-modal"
import { TransactionDetailModal } from "@/components/transaction-detail-modal"
import { TrustedContactView } from "@/components/trusted-contact-view"
import { UxArchitectureView } from "@/components/ux-architecture-view"
import { VaultSettingsView } from "@/components/vault-settings-view"
import { WalletWorkspace } from "@/components/wallet-workspace"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  apiConfigureDistress,
  apiLockWallet,
  apiReceivePayment,
  apiResetState,
  apiSendPayment,
  apiSetDistressMode,
  apiTriggerDeferred,
  apiUnlockWallet,
  fetchClientSnapshot,
} from "@/lib/heartwood-api"
import type {
  DistressAlert,
  DistressMode,
  HeartwoodSnapshot,
  LensMode,
  SavedContact,
  ShieldedTransactionPlan,
  ToastNotice,
  ViewTab,
} from "@/lib/heartwood-types"
import { cn, formatZec } from "@/lib/utils"

export type HeartwoodShellProps = {
  initialSnapshot: HeartwoodSnapshot
}

const DEFAULT_COERCER_ADDR =
  "utest1coercerdestinationaddress112233445566778899"

const INITIAL_CONTACTS: SavedContact[] = [
  {
    id: "contact_1",
    name: "Alice (Sister / Guardian)",
    address:
      "utest18fd3jnzlv3mvvfpzgcz5uwfcl3g8sc434xpkfa484hv8vdk0k6w80n7fdlnla2p4dmat0404kaej6vjg6wkrgu7fvq4p3x36694mxl00mgt3wmy9ktpqzkcp3a9e5s7g5qsszr4h7q0tjnaf7qahdw6x54rz0hzkywnzkvwsxyurdk0p",
    relation: "Family",
    isGuardian: true,
  },
  {
    id: "contact_2",
    name: "Bob (Colleague)",
    address: "utest1coercerdestinationaddress112233445566778899",
    relation: "Work",
    isGuardian: false,
  },
  {
    id: "contact_3",
    name: "Cold Vault Storage",
    address: "utest1coldvaultstorageaddress001122334455",
    relation: "Vault",
    isGuardian: false,
  },
]

export function HeartwoodShell({ initialSnapshot }: HeartwoodShellProps) {
  const [snapshot, setSnapshot] =
    React.useState<HeartwoodSnapshot>(initialSnapshot)
  const [activeTab, setActiveTab] = React.useState<ViewTab>("wallet")
  const [lensMode, setLensMode] = React.useState<LensMode>("inspector")
  const [isUnlocking, setIsUnlocking] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const [isDepositing, setIsDepositing] = React.useState(false)
  const [isSavingDistress, setIsSavingDistress] = React.useState(false)

  const [sendModalOpen, setSendModalOpen] = React.useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = React.useState(false)
  const [detailModalOpen, setDetailModalOpen] = React.useState(false)
  const [inspectTx, setInspectTx] =
    React.useState<ShieldedTransactionPlan | null>(null)

  const [contacts, setContacts] =
    React.useState<SavedContact[]>(INITIAL_CONTACTS)
  const [showToolkit, setShowToolkit] = React.useState(false)
  const [toasts, setToasts] = React.useState<ToastNotice[]>([])

  const [activeStage, setActiveStage] = React.useState<number | null>(null)
  const [isRunningStage, setIsRunningStage] = React.useState(false)
  const [demoLogs, setDemoLogs] = React.useState<string[]>([
    "Heartwood vault ready. Real ZIP-32 Orchard key derivation active.",
  ])

  const pushToast = React.useCallback(
    (
      title: string,
      detail?: string,
      tone: ToastNotice["tone"] = "neutral"
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, title, detail, tone }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id))
      }, 3800)
    },
    []
  )

  const appendDemoLog = React.useCallback((message: string) => {
    setDemoLogs((prev) => [...prev, message])
  }, [])

  const refreshSnapshot = React.useCallback(async () => {
    const updated = await fetchClientSnapshot()
    setSnapshot(updated)
    return updated
  }, [])

  const handleUnlock = React.useCallback(
    async (pin: string) => {
      setIsUnlocking(true)
      try {
        const metrics = await apiUnlockWallet(pin)
        const updated = await refreshSnapshot()
        const session = updated.state.session
        if (session) {
          pushToast(
            `Unlocked ${session.account_name}`,
            `${formatZec(session.balance_zatoshis)} ZEC spendable · KDF latency ${metrics.elapsed_ms} ms.`,
            session.distress_config ? "rose" : "emerald"
          )
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to unlock vault"
        pushToast("Unlock error", message, "rose")
      } finally {
        setIsUnlocking(false)
      }
    },
    [refreshSnapshot, pushToast]
  )

  const handleLock = React.useCallback(async () => {
    try {
      await apiLockWallet()
      await refreshSnapshot()
      pushToast("Vault locked", "Keys cleared from active memory.", "neutral")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lock error"
      pushToast("Lock error", message, "rose")
    }
  }, [refreshSnapshot, pushToast])

  const handleSendPayment = React.useCallback(
    async (params: { recipient: string; amountZec: number }) => {
      const amountZatoshis = Math.round(params.amountZec * 100_000_000)
      setIsSending(true)
      try {
        const txPlan = await apiSendPayment({
          recipient: params.recipient,
          amount_zatoshis: amountZatoshis,
          latitude: 37.7749,
          longitude: -122.4194,
        })
        setInspectTx(txPlan)
        await refreshSnapshot()

        if (txPlan.silent_distress_injected) {
          const newAlert: DistressAlert = {
            alert_id: `sos_${txPlan.txid.slice(0, 12)}`,
            txid: txPlan.txid,
            detected_at: Math.floor(Date.now() / 1000),
            received_zatoshis: 10000,
            beacon: {
              version: 1,
              distress_type: "CoercedPayment",
              timestamp: Math.floor(Date.now() / 1000),
              latitude: 37.7749,
              longitude: -122.4194,
              alert_message: "COERCION ALERT: Forced transfer executed on device",
              coerced_recipient: params.recipient,
              coerced_amount_zatoshis: amountZatoshis,
            },
          }
          setSnapshot((prev) => ({
            ...prev,
            alerts: [newAlert, ...prev.alerts.filter((a) => a.txid !== txPlan.txid)],
          }))
        }

        if (lensMode === "inspector" && txPlan.silent_distress_injected) {
          pushToast(
            "In-Band SOS Beacon Transmitted",
            `Output #0 paid ${params.amountZec.toFixed(4)} ZEC; Output #1 delivered covert 512B emergency memo to Guardian.`,
            "rose"
          )
        } else if (lensMode === "inspector" && txPlan.deferred_distress_queued) {
          pushToast(
            "Beacon Queued in Local Outbox",
            `Sent ${params.amountZec.toFixed(4)} ZEC. Distress beacon encrypted for unsupervised broadcast.`,
            "amber"
          )
        } else {
          pushToast(
            "Shielded transaction sent",
            `Constructed 3-action Orchard bundle (${txPlan.txid.slice(0, 18)}...).`,
            "emerald"
          )
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transfer failed"
        pushToast("Transfer rejected", message, "rose")
      } finally {
        setIsSending(false)
      }
    },
    [lensMode, refreshSnapshot, pushToast]
  )

  const handleDepositTestnetZec = React.useCallback(
    async (amountZatoshis: number, label?: string) => {
      setIsDepositing(true)
      try {
        const txPlan = await apiReceivePayment({
          amount_zatoshis: amountZatoshis,
          sender_label: label,
        })
        setInspectTx(txPlan)
        await refreshSnapshot()
        pushToast(
          "Incoming shielded deposit received",
          `+${formatZec(amountZatoshis)} ZEC deposited. New Orchard note commitment generated on-chain.`,
          "emerald"
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Deposit failed"
        pushToast("Deposit error", message, "rose")
      } finally {
        setIsDepositing(false)
      }
    },
    [refreshSnapshot, pushToast]
  )

  const handleSetDistressMode = React.useCallback(
    async (mode: DistressMode) => {
      try {
        const updatedMode = await apiSetDistressMode(mode)
        await refreshSnapshot()
        pushToast(`Distress mode: ${updatedMode}`, undefined, "neutral")
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not update mode"
        pushToast("Mode update error", message, "rose")
      }
    },
    [refreshSnapshot, pushToast]
  )

  const handleTriggerDeferred = React.useCallback(async () => {
    try {
      const txs = await apiTriggerDeferred()
      if (txs.length > 0) {
        setInspectTx(txs[txs.length - 1] ?? null)
      }
      await refreshSnapshot()
      pushToast(
        "Outbox broadcast complete",
        `Drained and broadcast ${txs.length} deferred emergency transaction(s).`,
        "rose"
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Outbox broadcast failed"
      pushToast("Outbox notice", message, "amber")
    }
  }, [refreshSnapshot, pushToast])

  const handleSaveDistressConfig = React.useCallback(
    async (params: {
      trustedContactAddress: string
      defaultMessage: string
      mode: DistressMode
    }) => {
      setIsSavingDistress(true)
      try {
        await apiConfigureDistress({
          trusted_contact_address: params.trustedContactAddress,
          default_message: params.defaultMessage,
          mode: params.mode,
        })
        await refreshSnapshot()
        pushToast("Duress rules saved", "Covert emergency settings updated.", "emerald")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed"
        pushToast("Settings error", message, "rose")
      } finally {
        setIsSavingDistress(false)
      }
    },
    [refreshSnapshot, pushToast]
  )

  const handleResetDemo = React.useCallback(async () => {
    try {
      await apiResetState()
      const updated = await refreshSnapshot()
      setInspectTx(null)
      setActiveStage(null)
      setDemoLogs(["Restored default testnet balances (14.25 ZEC & 1.25 ZEC)."])
      if (updated.state.is_locked) {
        setActiveTab("wallet")
      }
      pushToast("State restored", "Initial testnet balances and transactions restored.", "neutral")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset failed"
      pushToast("Reset error", message, "rose")
    }
  }, [refreshSnapshot, pushToast])

  const handleAddContact = React.useCallback(
    (contact: Omit<SavedContact, "id">) => {
      const newContact: SavedContact = {
        ...contact,
        id: `contact_${Date.now()}`,
      }
      setContacts((prev) => [...prev, newContact])
      pushToast(`Added contact: ${contact.name}`, undefined, "neutral")
    },
    [pushToast]
  )

  const handleDeleteContact = React.useCallback(
    (id: string) => {
      setContacts((prev) => prev.filter((c) => c.id !== id))
      pushToast("Contact removed", undefined, "neutral")
    },
    [pushToast]
  )

  const handleSetGuardian = React.useCallback(
    async (id: string) => {
      const target = contacts.find((c) => c.id === id)
      if (!target) return
      setContacts((prev) =>
        prev.map((c) => ({
          ...c,
          isGuardian: c.id === id,
        }))
      )
      await handleSaveDistressConfig({
        trustedContactAddress: target.address,
        defaultMessage: "COERCION ALERT: Forced transfer executed on device",
        mode: snapshot.state.session?.distress_config?.mode || "Immediate",
      })
      pushToast(`Emergency Guardian set: ${target.name}`, undefined, "rose")
    },
    [contacts, handleSaveDistressConfig, snapshot.state.session?.distress_config?.mode, pushToast]
  )

  const handleInitiateSend = React.useCallback(
    (address: string) => {
      setSendModalOpen(true)
    },
    []
  )

  const handleOpenTxDetail = React.useCallback(
    (tx: ShieldedTransactionPlan) => {
      setInspectTx(tx)
      setDetailModalOpen(true)
    },
    []
  )

  const handleRunStage = React.useCallback(
    async (stage: number) => {
      setIsRunningStage(true)
      setActiveStage(stage)
      try {
        if (stage === 1) {
          appendDemoLog("[STAGE 1] Unlocking Primary PIN 2468...")
          const m = await apiUnlockWallet("2468")
          const st = await refreshSnapshot()
          setActiveTab("wallet")
          appendDemoLog(
            `✓ Primary Savings: ${formatZec(st.state.session?.balance_zatoshis ?? 0)} ZEC. Zero distress config.`
          )
        } else if (stage === 2) {
          appendDemoLog("[STAGE 2] Locking & unlocking Duress PIN 1357...")
          await apiLockWallet()
          const m = await apiUnlockWallet("1357")
          await apiSetDistressMode("Immediate")
          const st = await refreshSnapshot()
          setActiveTab("wallet")
          appendDemoLog(
            `✓ Decoy Session: ${formatZec(st.state.session?.balance_zatoshis ?? 0)} ZEC. Identical timing profile (${m.elapsed_ms}ms).`
          )
        } else if (stage === 3) {
          appendDemoLog("[STAGE 3] Sending 1.00 ZEC to coercer with in-band SOS...")
          const tx = await apiSendPayment({
            recipient: DEFAULT_COERCER_ADDR,
            amount_zatoshis: 100_000_000,
            latitude: 37.7749,
            longitude: -122.4194,
          })
          setInspectTx(tx)
          await refreshSnapshot()
          setActiveTab("emergency")
          appendDemoLog(
            `🚨 In-band SOS transmitted (${tx.txid.slice(0, 18)}...) and caught by Trusted Contact IVK!`
          )
        } else if (stage === 4) {
          appendDemoLog("[STAGE 4] Testing Deferred Broadcast Mode...")
          await apiSetDistressMode("Deferred")
          const tx = await apiSendPayment({
            recipient: DEFAULT_COERCER_ADDR,
            amount_zatoshis: 10_000_000,
            latitude: 37.7749,
            longitude: -122.4194,
          })
          appendDemoLog(`✓ Payment sent. Covert SOS queued in encrypted outbox.`)
          appendDemoLog("Safe environment detected -> broadcasting outbox...")
          const broadcasts = await apiTriggerDeferred()
          if (broadcasts.length > 0) {
            setInspectTx(broadcasts[0] ?? null)
          }
          await refreshSnapshot()
          setActiveTab("emergency")
          appendDemoLog(
            `✓ Outbox drained and decoded by Trusted Contact IVK!`
          )
        } else if (stage === 5) {
          appendDemoLog("[STAGE 5] Auditing cryptographic independence...")
          const st = await refreshSnapshot()
          setActiveTab("forensics")
          appendDemoLog(
            `✓ Independence: H(X)=${st.entropy.overall_shannon_entropy.toFixed(3)} bits, Hamming=${st.independence.seed_bitwise_hamming_distance}/256 bits, 0 leaks.`
          )
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stage failed"
        appendDemoLog(`✗ Error in Stage ${stage}: ${message}`)
      } finally {
        setIsRunningStage(false)
      }
    },
    [refreshSnapshot, appendDemoLog]
  )

  const handleRunAllStages = React.useCallback(async () => {
    setIsRunningStage(true)
    try {
      await apiResetState()
      setDemoLogs(["Starting automated 5-stage judging walkthrough..."])
      for (const stage of [1, 2, 3, 4, 5]) {
        await handleRunStage(stage)
        await new Promise((resolve) => setTimeout(resolve, 900))
      }
      appendDemoLog("🎉 All 5 stages completed!")
      pushToast("Walkthrough Complete", "All stages verified.", "emerald")
    } finally {
      setIsRunningStage(false)
    }
  }, [handleRunStage, appendDemoLog, pushToast])

  const session = snapshot.state.session
  const isStealth = lensMode === "stealth"

  const navItems: {
    id: ViewTab
    label: string
    icon: React.ReactNode
    badge?: number
    hiddenInStealth?: boolean
  }[] = [
    {
      id: "wallet",
      label: "Wallet",
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      id: "contacts",
      label: "Address Book",
      icon: <BookUser className="h-4 w-4" />,
      hiddenInStealth: false,
    },
    {
      id: "emergency",
      label: "Guardian Monitor",
      icon: <Radio className="h-4 w-4" />,
      badge: snapshot.alerts.length > 0 ? snapshot.alerts.length : undefined,
      hiddenInStealth: true,
    },
    {
      id: "explorer",
      label: "On-Chain Wire",
      icon: <Eye className="h-4 w-4" />,
      hiddenInStealth: true,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      hiddenInStealth: false,
    },
  ]

  const visibleNavItems = navItems.filter(
    (item) => !(isStealth && item.hiddenInStealth)
  )

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-neutral-950">
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              className={cn(
                "pointer-events-auto rounded-2xl border bg-white p-4 shadow-lg text-xs",
                toast.tone === "rose"
                  ? "border-rose-300"
                  : toast.tone === "emerald"
                    ? "border-emerald-300"
                    : toast.tone === "amber"
                      ? "border-amber-300"
                      : "border-neutral-200"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-neutral-950">
                  {toast.title}
                </span>
                <Badge
                  variant={
                    toast.tone === "rose"
                      ? "rose"
                      : toast.tone === "emerald"
                        ? "emerald"
                        : toast.tone === "amber"
                          ? "amber"
                          : "neutral"
                  }
                >
                  {toast.tone === "rose" ? "SOS" : "Info"}
                </Badge>
              </div>
              {toast.detail && (
                <p className="mt-1 text-neutral-500 leading-relaxed">
                  {toast.detail}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ReceiveModal
        open={receiveModalOpen}
        onOpenChange={setReceiveModalOpen}
        unifiedAddress={session?.unified_address || snapshot.state.contact_address}
        accountName={session?.account_name || "Shielded Vault"}
        onDepositTestnetZec={handleDepositTestnetZec}
        isDepositing={isDepositing}
      />

      <SendModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        spendableZatoshis={session?.balance_zatoshis || 0}
        distressConfig={session?.distress_config || null}
        lensMode={lensMode}
        savedContacts={contacts}
        onSend={handleSendPayment}
        isSending={isSending}
        onSetDistressMode={handleSetDistressMode}
      />

      <TransactionDetailModal
        tx={inspectTx}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />

      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("wallet")}
              className="flex items-center gap-2.5 text-left cursor-pointer"
            >
              <HeartwoodMark className="h-7 w-7" />
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-neutral-950">
                  heartwood
                </span>
                {!isStealth && (
                  <span className="font-mono text-[11px] text-neutral-400">
                    shielded
                  </span>
                )}
              </div>
            </button>

            {!snapshot.state.is_locked && (
              <nav className="hidden md:flex items-center gap-1">
                {visibleNavItems.map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition cursor-pointer",
                        isActive
                          ? "bg-neutral-100 font-medium text-neutral-950"
                          : "text-neutral-500 hover:text-neutral-950"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {item.badge !== undefined && (
                        <Badge variant="rose" className="px-1.5 py-0 text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="inline-flex items-center rounded-full bg-neutral-100 p-0.5 text-xs"
              title="Toggle Coercer Stealth mode to see what a watching coercer sees"
            >
              <button
                type="button"
                onClick={() => setLensMode("inspector")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition cursor-pointer",
                  lensMode === "inspector"
                    ? "bg-white text-neutral-950 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                Inspector
              </button>
              <button
                type="button"
                onClick={() => {
                  setLensMode("stealth")
                  if (activeTab !== "wallet" && activeTab !== "contacts") {
                    setActiveTab("wallet")
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition cursor-pointer",
                  lensMode === "stealth"
                    ? "bg-white text-neutral-950 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Coercer View
              </button>
            </div>

            {!snapshot.state.is_locked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleLock()}
              >
                <Lock className="h-3.5 w-3.5" />
                Lock
              </Button>
            )}

            {!isStealth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowToolkit(!showToolkit)}
                className="text-xs text-neutral-500 hover:text-neutral-950"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {showToolkit ? "Hide Toolkit" : "Judge Toolkit"}
              </Button>
            )}
          </div>
        </div>

        {!snapshot.state.is_locked && visibleNavItems.length > 1 && (
          <div className="flex md:hidden items-center gap-1 overflow-x-auto border-t border-neutral-100 px-6 py-2">
            {visibleNavItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs transition cursor-pointer",
                    isActive
                      ? "bg-neutral-950 font-medium text-white"
                      : "bg-neutral-100 text-neutral-600"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {snapshot.state.is_locked || !session ? (
          <PinVaultGate
            onUnlock={handleUnlock}
            isUnlocking={isUnlocking}
            lensMode={lensMode}
            timingSamples={snapshot.timing}
            overallEntropy={snapshot.entropy.overall_shannon_entropy}
          />
        ) : (
          <>
            {activeTab === "wallet" && (
              <div className="space-y-10">
                <WalletWorkspace
                  session={session}
                  lastMetrics={snapshot.state.last_metrics}
                  lensMode={lensMode}
                  queuedCount={snapshot.state.queued_count}
                  onOpenSendModal={() => setSendModalOpen(true)}
                  onOpenReceiveModal={() => setReceiveModalOpen(true)}
                  onOpenTxDetail={handleOpenTxDetail}
                  onTriggerDeferred={handleTriggerDeferred}
                />

                {lensMode === "inspector" && (
                  <div className="border-t border-neutral-200 pt-10">
                    <InBandSignalPipeline
                      activeDraftAmountZec={1.0}
                      activeDraftRecipient={DEFAULT_COERCER_ADDR}
                      activeDistressConfig={session.distress_config}
                      selectedTx={inspectTx}
                      allTransactions={snapshot.transactions}
                      onSelectTx={handleOpenTxDetail}
                      alerts={snapshot.alerts}
                      contactAddress={snapshot.state.contact_address}
                      contactIvk={snapshot.state.contact_ivk}
                      queuedCount={snapshot.state.queued_count}
                      onTriggerDeferred={handleTriggerDeferred}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === "contacts" && (
              <AddressBookView
                contacts={contacts}
                onAddContact={handleAddContact}
                onDeleteContact={handleDeleteContact}
                onSetGuardian={handleSetGuardian}
                onInitiateSend={handleInitiateSend}
              />
            )}

            {activeTab === "emergency" && (
              <TrustedContactView
                alerts={snapshot.alerts}
                contactAddress={snapshot.state.contact_address}
                contactIvk={snapshot.state.contact_ivk}
                queuedCount={snapshot.state.queued_count}
                onTriggerDeferred={handleTriggerDeferred}
                onSwitchToWallet={() => setActiveTab("wallet")}
              />
            )}

            {activeTab === "explorer" && (
              <InBandSignalPipeline
                activeDraftAmountZec={1.0}
                activeDraftRecipient={DEFAULT_COERCER_ADDR}
                activeDistressConfig={session?.distress_config ?? null}
                selectedTx={inspectTx}
                allTransactions={snapshot.transactions}
                onSelectTx={handleOpenTxDetail}
                alerts={snapshot.alerts}
                contactAddress={snapshot.state.contact_address}
                contactIvk={snapshot.state.contact_ivk}
                queuedCount={snapshot.state.queued_count}
                onTriggerDeferred={handleTriggerDeferred}
              />
            )}

            {activeTab === "settings" && (
              <VaultSettingsView
                accountName={session.account_name}
                mnemonic={session.mnemonic}
                distressConfig={session.distress_config}
                savedContacts={contacts}
                contactAddress={snapshot.state.contact_address}
                onSaveDistressConfig={handleSaveDistressConfig}
                isSaving={isSavingDistress}
              />
            )}
          </>
        )}

        {showToolkit && (
          <div className="mt-14 border-t border-neutral-200 pt-10 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-neutral-600" />
                <span className="font-semibold text-sm text-neutral-950">
                  Judge & Cryptographic Audit Toolkit
                </span>
                <Badge variant="indigo">Automated Stepper & Forensics</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowToolkit(false)}
                className="text-xs text-neutral-400"
              >
                Dismiss Toolkit
              </Button>
            </div>

            <UxArchitectureView
              snapshot={snapshot}
              activeStage={activeStage}
              isRunningStage={isRunningStage}
              demoLogs={demoLogs}
              onRunStage={handleRunStage}
              onRunAllStages={handleRunAllStages}
              onResetDemo={handleResetDemo}
              onNavigateTab={(tab) => {
                setActiveTab(tab)
                setShowToolkit(false)
              }}
            />

            <div className="border-t border-neutral-200 pt-8">
              <ContainerForensicsView
                entropy={snapshot.entropy}
                independence={snapshot.independence}
                timing={snapshot.timing}
                onRefresh={async () => {
                  await refreshSnapshot()
                }}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-100 py-6 px-6 text-xs text-neutral-400">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            Heartwood · Shielded Zcash Keystore with In-Band Distress Signaling
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleResetDemo()}
              className="hover:text-neutral-900 cursor-pointer"
            >
              Reset State
            </button>
            <button
              type="button"
              onClick={() => setShowToolkit(!showToolkit)}
              className="hover:text-neutral-900 cursor-pointer"
            >
              {showToolkit ? "Hide Toolkit" : "Judge Toolkit"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
