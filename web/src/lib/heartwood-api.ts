import { getFallbackSnapshot } from "@/lib/fallback-state"
import type {
  ApiResponse,
  AppStateData,
  ContainerEntropyData,
  DistressAlert,
  DistressConfig,
  DistressMode,
  HeartwoodSnapshot,
  IndependenceReport,
  ShieldedTransactionPlan,
  TimingSample,
  UnlockMetrics,
} from "@/lib/heartwood-types"

const SERVER_BACKEND_URL =
  process.env.HEARTWOOD_BACKEND_URL ?? "http://127.0.0.1:3080"

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const payload = (await response.json()) as ApiResponse<T>
  if (!payload.success || payload.data === null) {
    throw new Error(payload.error ?? "Request failed")
  }
  return payload.data
}

export async function fetchServerSnapshot(): Promise<HeartwoodSnapshot> {
  try {
    const [stateRes, alertsRes, txsRes, entropyRes, timingRes, indRes] =
      await Promise.all([
        fetch(`${SERVER_BACKEND_URL}/api/state`, { cache: "no-store" }),
        fetch(`${SERVER_BACKEND_URL}/api/alerts`, { cache: "no-store" }),
        fetch(`${SERVER_BACKEND_URL}/api/transactions`, { cache: "no-store" }),
        fetch(`${SERVER_BACKEND_URL}/api/entropy`, { cache: "no-store" }),
        fetch(`${SERVER_BACKEND_URL}/api/timing`, { cache: "no-store" }),
        fetch(`${SERVER_BACKEND_URL}/api/independence`, { cache: "no-store" }),
      ])

    const [state, alerts, transactions, entropy, timing, independence] =
      await Promise.all([
        parseApiResponse<AppStateData>(stateRes),
        parseApiResponse<DistressAlert[]>(alertsRes),
        parseApiResponse<ShieldedTransactionPlan[]>(txsRes),
        parseApiResponse<ContainerEntropyData>(entropyRes),
        parseApiResponse<TimingSample[]>(timingRes),
        parseApiResponse<IndependenceReport>(indRes),
      ])

    return {
      state,
      alerts,
      transactions,
      entropy,
      timing,
      independence,
    }
  } catch {
    return getFallbackSnapshot()
  }
}

export async function fetchClientSnapshot(): Promise<HeartwoodSnapshot> {
  const [stateRes, alertsRes, txsRes, entropyRes, timingRes, indRes] =
    await Promise.all([
      fetch("/api/state", { cache: "no-store" }),
      fetch("/api/alerts", { cache: "no-store" }),
      fetch("/api/transactions", { cache: "no-store" }),
      fetch("/api/entropy", { cache: "no-store" }),
      fetch("/api/timing", { cache: "no-store" }),
      fetch("/api/independence", { cache: "no-store" }),
    ])

  const [state, alerts, transactions, entropy, timing, independence] =
    await Promise.all([
      parseApiResponse<AppStateData>(stateRes),
      parseApiResponse<DistressAlert[]>(alertsRes),
      parseApiResponse<ShieldedTransactionPlan[]>(txsRes),
      parseApiResponse<ContainerEntropyData>(entropyRes),
      parseApiResponse<TimingSample[]>(timingRes),
      parseApiResponse<IndependenceReport>(indRes),
    ])

  return {
    state,
    alerts,
    transactions,
    entropy,
    timing,
    independence,
  }
}

export async function apiUnlockWallet(pin: string): Promise<UnlockMetrics> {
  const res = await fetch("/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  })
  return parseApiResponse<UnlockMetrics>(res)
}

export async function apiLockWallet(): Promise<string> {
  const res = await fetch("/api/lock", { method: "POST" })
  return parseApiResponse<string>(res)
}

export async function apiSendPayment(params: {
  recipient: string
  amount_zatoshis: number
  latitude?: number
  longitude?: number
}): Promise<ShieldedTransactionPlan> {
  const res = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  return parseApiResponse<ShieldedTransactionPlan>(res)
}

export async function apiToggleDistressMode(): Promise<DistressMode> {
  const res = await fetch("/api/toggle-mode", { method: "POST" })
  return parseApiResponse<DistressMode>(res)
}

export async function apiSetDistressMode(
  mode: DistressMode
): Promise<DistressMode> {
  const res = await fetch("/api/set-mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  })
  return parseApiResponse<DistressMode>(res)
}

export async function apiReceivePayment(params: {
  amount_zatoshis: number
  sender_label?: string
  memo_text?: string
}): Promise<ShieldedTransactionPlan> {
  const res = await fetch("/api/receive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  return parseApiResponse<ShieldedTransactionPlan>(res)
}

export async function apiConfigureDistress(params: {
  trusted_contact_address: string
  default_message: string
  mode: DistressMode
  distress_amount_zatoshis?: number
}): Promise<DistressConfig> {
  const res = await fetch("/api/configure-distress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  return parseApiResponse<DistressConfig>(res)
}

export async function apiTriggerDeferred(): Promise<ShieldedTransactionPlan[]> {
  const res = await fetch("/api/trigger-deferred", { method: "POST" })
  return parseApiResponse<ShieldedTransactionPlan[]>(res)
}

export async function apiResetState(): Promise<string> {
  const res = await fetch("/api/reset", { method: "POST" })
  return parseApiResponse<string>(res)
}
