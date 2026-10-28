export type DistressMode = "Immediate" | "Deferred"

export type DistressType =
  | "CoercedPayment"
  | "SilentPanic"
  | "DeviceSeizure"

export type DistressConfig = {
  trusted_contact_address: string
  trusted_contact_ivk: string
  distress_amount_zatoshis: number
  mode: DistressMode
  default_message: string
}

export type DistressBeacon = {
  version: number
  distress_type: DistressType
  timestamp: number
  latitude: number | null
  longitude: number | null
  alert_message: string
  coerced_recipient: string | null
  coerced_amount_zatoshis: number | null
}

export type QueuedDistressItem = {
  id: string
  beacon: DistressBeacon
  queued_at: number
}

export type OnChainAction = {
  action_index: number
  nullifier: string
  cmx: string
  ephemeral_key: string
  enc_ciphertext_preview: string
  enc_ciphertext_len: number
}

export type ShieldedOutput = {
  recipient_address: string
  amount_zatoshis: number
  memo: string
  ephemeral_key: string
  cmx: string
  encrypted_note_hex: string
  is_distress_beacon: boolean
  label: string
}

export type ShieldedTransactionPlan = {
  txid: string
  inputs_spent_zatoshis: number
  outputs: ShieldedOutput[]
  on_chain_actions: OnChainAction[]
  fee_zatoshis: number
  change_zatoshis: number
  silent_distress_injected: boolean
  deferred_distress_queued: boolean
  created_at: number
}

export type WalletSession = {
  account_name: string
  unified_address: string
  incoming_viewing_key: string
  balance_zatoshis: number
  spendable_zatoshis: number
  transactions: ShieldedTransactionPlan[]
  distress_config: DistressConfig | null
  is_synthetic: boolean
  mnemonic: string
}

export type UnlockMetrics = {
  elapsed_ms: number
  slot_0_evaluated: boolean
  slot_1_evaluated: boolean
  is_synthetic: boolean
}

export type AppStateData = {
  is_locked: boolean
  session: WalletSession | null
  last_metrics: UnlockMetrics | null
  alerts_count: number
  queued_count: number
  queued_items: QueuedDistressItem[]
  transactions_count: number
  contact_address: string
  contact_ivk: string
}

export type DistressAlert = {
  alert_id: string
  txid: string
  detected_at: number
  received_zatoshis: number
  beacon: DistressBeacon
}

export type ContainerEntropyData = {
  total_bytes: number
  overall_shannon_entropy: number
  overall_chi_squared: number
  slot_0_entropy: number
  slot_1_entropy: number
  padding_entropy: number
  preview_hex_chunks: string[]
}

export type TimingSample = {
  label: string
  pin: string
  elapsed_ms: number
  is_synthetic: boolean
}

export type IndependenceReport = {
  seed_a_seed_b_equal: boolean
  seed_bitwise_hamming_distance: number
  slot_1_entropy_bits_per_byte: number
  slot_1_chi_squared: number
  padding_entropy_bits_per_byte: number
  contains_cross_references: boolean
  zero_knowledge_deniable: boolean
}

export type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: string | null
}

export type HeartwoodSnapshot = {
  state: AppStateData
  alerts: DistressAlert[]
  transactions: ShieldedTransactionPlan[]
  entropy: ContainerEntropyData
  timing: TimingSample[]
  independence: IndependenceReport
}

export type ViewTab =
  | "wallet"
  | "contacts"
  | "emergency"
  | "settings"
  | "explorer"
  | "signal"
  | "forensics"
  | "ux-map"

export type SavedContact = {
  id: string
  name: string
  address: string
  relation: string
  isGuardian: boolean
}

export type LensMode = "inspector" | "stealth"

export type ToastNotice = {
  id: string
  title: string
  detail?: string
  tone: "neutral" | "emerald" | "amber" | "rose"
}
