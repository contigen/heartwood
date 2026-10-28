import type {
  AppStateData,
  ContainerEntropyData,
  DistressAlert,
  DistressConfig,
  DistressMode,
  HeartwoodSnapshot,
  IndependenceReport,
  OnChainAction,
  ShieldedOutput,
  ShieldedTransactionPlan,
  TimingSample,
  UnlockMetrics,
  WalletSession,
} from "@/lib/heartwood-types"
import { NextResponse } from "next/server"

const PRIMARY_ADDRESS =
  "utest1n2468shieldedorchardrealprimaryaccount00112233445566778899aabbccddeeff"
const PRIMARY_IVK =
  "uviewtest12c17da6769eda839eec1451b88e7ac6d8130223a5df6d17ac44c48a93ec9d860"
const DECOY_ADDRESS =
  "utest1m1357decoyeverydayaccount554433221100ffeeddccbbaa99887766554433221100"
const DECOY_IVK =
  "uviewtest19a84bc5e10dc9a473210fe8ca152dbb091834710ca8b234190ea472109ba4721"
const GUARDIAN_ADDRESS =
  "utest18fd3jnzlv3mvvfpzgcz5uwfcl3g8sc434xpkfa484hv8vdk0k6w80n7fdlnla2p4dmat0404kaej6vjg6wkrgu7fvq4p3x36694mxl00mgt3wmy9ktpqzkcp3a9e5s7g5qsszr4h7q0tjnaf7qahdw6x54rz0hzkywnzkvwsxyurdk0p"
const GUARDIAN_IVK =
  "uviewtest12c17da6769eda839eec1451b88e7ac6d8130223a5df6d17ac44c48a93ec9d860"

const INITIAL_PRIMARY_TXS: ShieldedTransactionPlan[] = [
  {
    txid: "59fdfbb5c4d18d5bfba9819e5c4a0c394d14d39a727db104541a069de985991e",
    inputs_spent_zatoshis: 15000020000,
    outputs: [
      {
        recipient_address:
          "utest1zcashgrantsettlementaddress99887766554433221100aabbccddeeff0011",
        amount_zatoshis: 500000000,
        memo: "Q3 Grant Settlement",
        ephemeral_key:
          "0x8a9bf3c88029de09c376cda40a931a78e7150c9b0e1596706e257ca623e164ca",
        cmx: "0x3b0f79968a4f0d63a2fafcfe1fb79387f2d490e9f24a5100aa131a3264b15d25",
        encrypted_note_hex:
          "c54a7c04a768f354c57c2b6199d2b7df687ba1e05d21e85f573ad6c1e95055bb4417",
        is_distress_beacon: false,
        label: "Shielded Transfer",
      },
    ],
    on_chain_actions: [
      {
        action_index: 0,
        nullifier:
          "0xca65383c0589dab87042280596f9419d0653fa033389829306cb295504ae3626",
        cmx: "0x3b0f79968a4f0d63a2fafcfe1fb79387f2d490e9f24a5100aa131a3264b15d25",
        ephemeral_key:
          "0x2e31e0b555b7887d25aeae9ad1638709912beff575ad8f7f4d7b12e6e83c221f",
        enc_ciphertext_preview: "c54a7c04a768f354c57c2b6199d2b7df...",
        enc_ciphertext_len: 580,
      },
      {
        action_index: 1,
        nullifier:
          "0xc9995f49612c14912f8b4cd58320c4b1fe31885e4bb4b04a26aa5b4e6eafe566",
        cmx: "0x60df8a7a4dd16b9dcbd67ba0f536f5a791a70a26a7c82577f125078ba0fc22c3",
        ephemeral_key:
          "0xa6a81cffc4539923e5f1e25cc943b40bd323b482ad52a3a2b26d6ea7bec08943",
        enc_ciphertext_preview: "f764cfae3b916f96d6e0e9357dbb59f4...",
        enc_ciphertext_len: 580,
      },
      {
        action_index: 2,
        nullifier:
          "0xdddc9c38e528ce0a1e2f1c62fa9f8490f984e8094b0450bf5c7d882011ea6b4d",
        cmx: "0x4cc2fc36230ae71f810ff588baa4f282ab92f176c17cbc60e73b3e561e3b6da6",
        ephemeral_key:
          "0xb5a024ca989599123da3fbd0f368fdee6d74ad0e5dbc028e9d72772f8533bf6a",
        enc_ciphertext_preview: "0c9d1ad4607becbe9e60eb6d87d5d45b...",
        enc_ciphertext_len: 580,
      },
    ],
    fee_zatoshis: 10000,
    change_zatoshis: 14499990000,
    silent_distress_injected: false,
    deferred_distress_queued: false,
    created_at: 1793121109,
  },
  {
    txid: "11919d1af6520bed6e22fa042d2da354520379dbea8123d54fb98e2cddcee815",
    inputs_spent_zatoshis: 14500010000,
    outputs: [
      {
        recipient_address:
          "utest1coldvaultstorageaddress00112233445566778899aabbccddeeff00112233",
        amount_zatoshis: 250000000,
        memo: "Cold Vault Allocation",
        ephemeral_key:
          "0x5ca3be6e235c77a7e360b1074897c8bba9279b8503ffefd94d5a93dcccdeff2e",
        cmx: "0xf77dd14e87b70c048c3a09b20705f32651f782226cfbb81ac828fd98dcd2e94f",
        encrypted_note_hex:
          "e8b6baaf5ac7cf832a9c8da29c7026b919ca03e07dbefc077b9190cbb919a71092a1",
        is_distress_beacon: false,
        label: "Shielded Transfer",
      },
    ],
    on_chain_actions: [
      {
        action_index: 0,
        nullifier:
          "0xc0569279eb1121913ff3e4a9187714d3951aae07bb58cbfdef7896c1abe5f2c0",
        cmx: "0xf77dd14e87b70c048c3a09b20705f32651f782226cfbb81ac828fd98dcd2e94f",
        ephemeral_key:
          "0x5ca3be6e235c77a7e360b1074897c8bba9279b8503ffefd94d5a93dcccdeff2e",
        enc_ciphertext_preview: "e8b6baaf5ac7cf832a9c8da29c7026b9...",
        enc_ciphertext_len: 580,
      },
      {
        action_index: 1,
        nullifier:
          "0x3d32ccb9fda4eb0a6298eeba4e5972412cda2625d33637d59e46e2dd160a12ac",
        cmx: "0xdd5727475542dec5e63038d26841c399d000912edd2740fc37a548200a93fcfd",
        ephemeral_key:
          "0x3f28f2cccda44789da32750aba3f61b951d281b1b6be3e75fb6f277bd382e110",
        enc_ciphertext_preview: "e19956b9ad490697770ce94c14ce274f...",
        enc_ciphertext_len: 580,
      },
      {
        action_index: 2,
        nullifier:
          "0xe3924cdd23763d577e756dd7a928191b898ee0b15ee98de81a78d7e7d7dd7928",
        cmx: "0xc78b7e0ed9762a3967f3eb93b3d7b766e85da6b98f88707989c88c2a430f5c75",
        ephemeral_key:
          "0xe3be282d4f31501e45bb9a531849110776654b8d35ef9cb95417779f7df962fc",
        enc_ciphertext_preview: "6cf823c4eaa3860c6c77d39b5b605cd6...",
        enc_ciphertext_len: 580,
      },
    ],
    fee_zatoshis: 10000,
    change_zatoshis: 14249990000,
    silent_distress_injected: false,
    deferred_distress_queued: false,
    created_at: 1793171509,
  },
]

const INITIAL_DECOY_TXS: ShieldedTransactionPlan[] = [
  {
    txid: "388cc153a0afdc17315e0f26d55f765329976493a0959669213b143812f2d5ec",
    inputs_spent_zatoshis: 140010000,
    outputs: [
      {
        recipient_address:
          "utest1merchantdailycoffeeaddress554433221100ffeeddccbbaa998877665544",
        amount_zatoshis: 15000000,
        memo: "Artisan Roasters",
        ephemeral_key:
          "0x1f74a89d0b6ca43015f8910b2496a01bce4710db47e2501ab149021bdf507119",
        cmx: "0x9815fe9a4c810b71ca0029db5180f2b3ca740b10fa250c61ba889c10427bfa60",
        encrypted_note_hex:
          "98a0b510c4fa7701da52601ef47901cb541094ba7610fa09160538a0815049a1",
        is_distress_beacon: false,
        label: "Shielded Transfer",
      },
    ],
    on_chain_actions: [
      {
        action_index: 0,
        nullifier:
          "0x41ba90ca76510a9f2401827409c61fa9801db671049c61fa9b207198fa01b816",
        cmx: "0x9815fe9a4c810b71ca0029db5180f2b3ca740b10fa250c61ba889c10427bfa60",
        ephemeral_key:
          "0x1f74a89d0b6ca43015f8910b2496a01bce4710db47e2501ab149021bdf507119",
        enc_ciphertext_preview: "98a0b510c4fa7701da52601ef47901cb...",
        enc_ciphertext_len: 580,
      },
      {
        action_index: 1,
        nullifier:
          "0x750ca16b8021c9fa0184b2075a0194bc0281640a9c614081da26b015f4019ba2",
        cmx: "0x518049a0b1740916da71049bca02174091650b284701ca9f2017409ba51068ba",
        ephemeral_key:
          "0x8510a94bca028174091640ba910684710928bca01947bca01740916ba50192ca",
        enc_ciphertext_preview: "518049a0b1740916da71049bca021740...",
        enc_ciphertext_len: 580,
      },
      {
        action_index: 2,
        nullifier:
          "0x980164bca01749106bca0281740916ba50192ca01947bca01740916ba50192ca",
        cmx: "0x281740916ba50192ca01947bca01740916ba50192ca01947bca01740916ba501",
        ephemeral_key:
          "0x6ba50192ca01947bca01740916ba50192ca01947bca01740916ba50192ca0194",
        enc_ciphertext_preview: "281740916ba50192ca01947bca017409...",
        enc_ciphertext_len: 580,
      },
    ],
    fee_zatoshis: 10000,
    change_zatoshis: 125000000,
    silent_distress_injected: false,
    deferred_distress_queued: false,
    created_at: 1793121509,
  },
]

type ServerMemoryStore = {
  activeSession: WalletSession | null
  lastMetrics: UnlockMetrics | null
  sessions: Record<string, WalletSession>
  alerts: DistressAlert[]
  allTransactions: ShieldedTransactionPlan[]
  timingSamples: TimingSample[]
  distressMode: DistressMode
  guardianAddress: string
  guardianIvk: string
}

function initializeStore(): ServerMemoryStore {
  const primarySession: WalletSession = {
    account_name: "Primary Savings",
    unified_address: PRIMARY_ADDRESS,
    incoming_viewing_key: PRIMARY_IVK,
    balance_zatoshis: 14250000000,
    spendable_zatoshis: 14250000000,
    transactions: [...INITIAL_PRIMARY_TXS],
    distress_config: null,
    is_synthetic: false,
    mnemonic:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  }

  const decoySession: WalletSession = {
    account_name: "Personal Daily",
    unified_address: DECOY_ADDRESS,
    incoming_viewing_key: DECOY_IVK,
    balance_zatoshis: 125000000,
    spendable_zatoshis: 125000000,
    transactions: [...INITIAL_DECOY_TXS],
    distress_config: {
      trusted_contact_address: GUARDIAN_ADDRESS,
      trusted_contact_ivk: GUARDIAN_IVK,
      distress_amount_zatoshis: 10000,
      mode: "Immediate",
      default_message:
        "EMERGENCY DISTRESS BEACON: Coerced payout forced under duress. Coordinate lock, notify safety circle.",
    },
    is_synthetic: false,
    mnemonic:
      "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong",
  }

  return {
    activeSession: null,
    lastMetrics: null,
    sessions: {
      [PRIMARY_ADDRESS]: primarySession,
      [DECOY_ADDRESS]: decoySession,
    },
    alerts: [],
    allTransactions: [...INITIAL_PRIMARY_TXS, ...INITIAL_DECOY_TXS],
    timingSamples: [],
    distressMode: "Immediate",
    guardianAddress: GUARDIAN_ADDRESS,
    guardianIvk: GUARDIAN_IVK,
  }
}

const memoryStore: ServerMemoryStore = initializeStore()

export function getFallbackSnapshot(): HeartwoodSnapshot {
  return {
    state: {
      is_locked: memoryStore.activeSession === null,
      session: memoryStore.activeSession,
      last_metrics: memoryStore.lastMetrics,
      alerts_count: memoryStore.alerts.length,
      queued_count: 0,
      queued_items: [],
      transactions_count: memoryStore.allTransactions.length,
      contact_address: memoryStore.guardianAddress,
      contact_ivk: memoryStore.guardianIvk,
    },
    alerts: memoryStore.alerts,
    transactions: memoryStore.allTransactions,
    entropy: {
      total_bytes: 65536,
      overall_shannon_entropy: 7.996884,
      overall_chi_squared: 281.36,
      slot_0_entropy: 7.988454,
      slot_1_entropy: 7.988132,
      padding_entropy: 7.989704,
      preview_hex_chunks: [
        "f33ee178f8a00f1d17580dc0d81a32a166620b4585a3e974cb86772fa775f743",
        "b0e8fc5e81e8ee2175d96e8adff76db46ff17affdfe5af26e463be7e4aaa7c47",
        "d4846ca4a9956dc75ca270d620b74961ed0e86ec2a0c91aa9b109b69ef22dc5f",
        "7854232788fc6edfb123d483177da65361e771cf366643420c92e023a1a8c8eb",
        "f4231d54079bfcee079619f4ddd2a0efdf6586d6e83e5a230bc80858b4df34df",
        "ad47fe64cb6b88f8eb64b9d1cc085f7f3d2ec8c73c17c14d8c9c9a18d203d790",
        "ba43c317d91dee3c64c95e6710c5dab4dc5ae9219d3309277c58cbefaed23eae",
        "9795c16c405afc10ee6d8fa726dacf9b2cda1b4d9aa396f7e431474b9bf3b910",
        "c7cbbcd44e3e9ec4f4b554ad15270be61143950c00e65690eb3effcbe44f99fa",
        "10555bd8f8a2183473d86ad7a4370bccab00b2788d37602f16a7759da26ddad6",
        "681c72294b5d492a5a7fc6145dbad9a2504f96015c3a37a918c8ec7396face5a",
        "57d17616c0c2694d62a3d22bfa4793cde1ebc27427a4fd4550a455bb522d80e1",
        "8377cd86d8c2df00f7a7303fb5cbe844aa1a6a4c69a0363cba4cf4a95adb151c",
        "c543e8f84e8d9f3dba488e1ace404b0c6807d6df73ebe682265909bacbfc0cc2",
        "0d13defb9c7c5c19cb612b364eb5ea88379286e3f9575ea2e87cb79c5092640c",
        "7da99a6659aede72a5b1a07ec45cd8876a93b5065582f9b98bf9b87450543bec",
      ],
    },
    timing: memoryStore.timingSamples,
    independence: {
      seed_a_seed_b_equal: false,
      seed_bitwise_hamming_distance: 123,
      slot_1_entropy_bits_per_byte: 7.988132,
      slot_1_chi_squared: 270.1875,
      padding_entropy_bits_per_byte: 7.989704,
      contains_cross_references: false,
      zero_knowledge_deniable: true,
    },
  }
}

function generateRandomHex(length: number): string {
  const chars = "0123456789abcdef"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function handleUnlock(pin: string): UnlockMetrics {
  const elapsedMs = 3450 + Math.floor(Math.random() * 80)
  if (pin === "2468") {
    const s = memoryStore.sessions[PRIMARY_ADDRESS]
    memoryStore.activeSession = { ...s }
    const metrics: UnlockMetrics = {
      elapsed_ms: elapsedMs,
      slot_0_evaluated: true,
      slot_1_evaluated: true,
      is_synthetic: false,
    }
    memoryStore.lastMetrics = metrics
    memoryStore.timingSamples.push({
      label: "Primary PIN A",
      pin: "2468",
      elapsed_ms: elapsedMs,
      is_synthetic: false,
    })
    return metrics
  }
  if (pin === "1357") {
    const s = memoryStore.sessions[DECOY_ADDRESS]
    memoryStore.activeSession = { ...s }
    const metrics: UnlockMetrics = {
      elapsed_ms: elapsedMs,
      slot_0_evaluated: true,
      slot_1_evaluated: true,
      is_synthetic: false,
    }
    memoryStore.lastMetrics = metrics
    memoryStore.timingSamples.push({
      label: "Decoy PIN B (Duress)",
      pin: "1357",
      elapsed_ms: elapsedMs,
      is_synthetic: false,
    })
    return metrics
  }

  const syntheticSession: WalletSession = {
    account_name: "Ephemeral Zero-Oracle",
    unified_address: `utest1synth${generateRandomHex(40)}`,
    incoming_viewing_key: `uviewtest1synth${generateRandomHex(40)}`,
    balance_zatoshis: 0,
    spendable_zatoshis: 0,
    transactions: [],
    distress_config: null,
    is_synthetic: true,
    mnemonic:
      "hollow mirror echo ghost shadow zero blank void silence phantom empty drift",
  }
  memoryStore.activeSession = syntheticSession
  const metrics: UnlockMetrics = {
    elapsed_ms: elapsedMs,
    slot_0_evaluated: true,
    slot_1_evaluated: true,
    is_synthetic: true,
  }
  memoryStore.lastMetrics = metrics
  memoryStore.timingSamples.push({
    label: "Unknown PIN (Synthetic)",
    pin: "****",
    elapsed_ms: elapsedMs,
    is_synthetic: true,
  })
  return metrics
}

function handleLock(): string {
  if (memoryStore.activeSession) {
    memoryStore.sessions[memoryStore.activeSession.unified_address] = {
      ...memoryStore.activeSession,
    }
  }
  memoryStore.activeSession = null
  return "Keystore locked. Cryptographic keys purged from volatile memory."
}

function handleSend(params: {
  recipient: string
  amount_zatoshis: number
  latitude?: number
  longitude?: number
}): ShieldedTransactionPlan {
  const active = memoryStore.activeSession
  if (!active) {
    throw new Error("Wallet is locked")
  }
  const fee = 10000
  const total = params.amount_zatoshis + fee
  if (active.spendable_zatoshis < total) {
    throw new Error("Insufficient spendable shielded funds")
  }

  const isDecoy = active.unified_address === DECOY_ADDRESS
  const isDistress = isDecoy && active.distress_config !== null

  const mainOutput: ShieldedOutput = {
    recipient_address: params.recipient,
    amount_zatoshis: params.amount_zatoshis,
    memo: "Shielded Payment",
    ephemeral_key: `0x${generateRandomHex(64)}`,
    cmx: `0x${generateRandomHex(64)}`,
    encrypted_note_hex: generateRandomHex(1160),
    is_distress_beacon: false,
    label: "Coerced Shielded Transfer",
  }

  const outputs: ShieldedOutput[] = [mainOutput]

  if (isDistress && active.distress_config) {
    const beaconOutput: ShieldedOutput = {
      recipient_address: active.distress_config.trusted_contact_address,
      amount_zatoshis: active.distress_config.distress_amount_zatoshis,
      memo: active.distress_config.default_message,
      ephemeral_key: `0x${generateRandomHex(64)}`,
      cmx: `0x${generateRandomHex(64)}`,
      encrypted_note_hex: generateRandomHex(1160),
      is_distress_beacon: true,
      label: "Covert Emergency Distress Beacon (ChaCha20-Poly1305)",
    }
    outputs.push(beaconOutput)

    const alert: DistressAlert = {
      alert_id: `alert_${generateRandomHex(16)}`,
      txid: generateRandomHex(64),
      detected_at: Math.floor(Date.now() / 1000),
      received_zatoshis: active.distress_config.distress_amount_zatoshis,
      beacon: {
        version: 1,
        distress_type: "CoercedPayment",
        timestamp: Math.floor(Date.now() / 1000),
        latitude: params.latitude ?? 37.7749,
        longitude: params.longitude ?? -122.4194,
        alert_message: active.distress_config.default_message,
        coerced_recipient: params.recipient,
        coerced_amount_zatoshis: params.amount_zatoshis,
      },
    }
    memoryStore.alerts.unshift(alert)
  }

  const actions: OnChainAction[] = [0, 1, 2].map((idx) => ({
    action_index: idx,
    nullifier: `0x${generateRandomHex(64)}`,
    cmx: `0x${generateRandomHex(64)}`,
    ephemeral_key: `0x${generateRandomHex(64)}`,
    enc_ciphertext_preview: `${generateRandomHex(32)}...`,
    enc_ciphertext_len: 580,
  }))

  const change = active.spendable_zatoshis - total
  active.balance_zatoshis = change
  active.spendable_zatoshis = change

  const plan: ShieldedTransactionPlan = {
    txid: generateRandomHex(64),
    inputs_spent_zatoshis: active.spendable_zatoshis + total,
    outputs,
    on_chain_actions: actions,
    fee_zatoshis: fee,
    change_zatoshis: change,
    silent_distress_injected: isDistress,
    deferred_distress_queued: false,
    created_at: Math.floor(Date.now() / 1000),
  }

  active.transactions.unshift(plan)
  memoryStore.allTransactions.unshift(plan)
  memoryStore.sessions[active.unified_address] = { ...active }

  return plan
}

function handleReceive(params: {
  amount_zatoshis: number
  sender_label?: string
  memo_text?: string
}): ShieldedTransactionPlan {
  const active = memoryStore.activeSession
  if (!active) {
    throw new Error("Wallet is locked")
  }

  active.balance_zatoshis += params.amount_zatoshis
  active.spendable_zatoshis += params.amount_zatoshis

  const actions: OnChainAction[] = [0, 1, 2].map((idx) => ({
    action_index: idx,
    nullifier: `0x${generateRandomHex(64)}`,
    cmx: `0x${generateRandomHex(64)}`,
    ephemeral_key: `0x${generateRandomHex(64)}`,
    enc_ciphertext_preview: `${generateRandomHex(32)}...`,
    enc_ciphertext_len: 580,
  }))

  const output: ShieldedOutput = {
    recipient_address: active.unified_address,
    amount_zatoshis: params.amount_zatoshis,
    memo: params.memo_text ?? "Shielded Deposit",
    ephemeral_key: `0x${generateRandomHex(64)}`,
    cmx: `0x${generateRandomHex(64)}`,
    encrypted_note_hex: generateRandomHex(1160),
    is_distress_beacon: false,
    label: params.sender_label ?? "Shielded Deposit Faucet",
  }

  const plan: ShieldedTransactionPlan = {
    txid: generateRandomHex(64),
    inputs_spent_zatoshis: params.amount_zatoshis,
    outputs: [output],
    on_chain_actions: actions,
    fee_zatoshis: 10000,
    change_zatoshis: 0,
    silent_distress_injected: false,
    deferred_distress_queued: false,
    created_at: Math.floor(Date.now() / 1000),
  }

  active.transactions.unshift(plan)
  memoryStore.allTransactions.unshift(plan)
  memoryStore.sessions[active.unified_address] = { ...active }

  return plan
}

type GenericRecord = Record<string, unknown>

export function handleApiRequest(
  method: string,
  path: string,
  body: unknown
): NextResponse {
  try {
    if (method === "GET") {
      if (path === "/state") {
        const state: AppStateData = {
          is_locked: memoryStore.activeSession === null,
          session: memoryStore.activeSession,
          last_metrics: memoryStore.lastMetrics,
          alerts_count: memoryStore.alerts.length,
          queued_count: 0,
          queued_items: [],
          transactions_count: memoryStore.allTransactions.length,
          contact_address: memoryStore.guardianAddress,
          contact_ivk: memoryStore.guardianIvk,
        }
        return NextResponse.json({ success: true, data: state, error: null })
      }
      if (path === "/alerts") {
        return NextResponse.json({
          success: true,
          data: memoryStore.alerts,
          error: null,
        })
      }
      if (path === "/transactions") {
        return NextResponse.json({
          success: true,
          data: memoryStore.allTransactions,
          error: null,
        })
      }
      if (path === "/entropy") {
        const snapshot = getFallbackSnapshot()
        return NextResponse.json({
          success: true,
          data: snapshot.entropy,
          error: null,
        })
      }
      if (path === "/timing") {
        return NextResponse.json({
          success: true,
          data: memoryStore.timingSamples,
          error: null,
        })
      }
      if (path === "/independence") {
        const snapshot = getFallbackSnapshot()
        return NextResponse.json({
          success: true,
          data: snapshot.independence,
          error: null,
        })
      }
    }

    if (method === "POST") {
      const rec = (body ?? {}) as GenericRecord
      if (path === "/unlock") {
        const pin = typeof rec.pin === "string" ? rec.pin : ""
        const metrics = handleUnlock(pin)
        return NextResponse.json({ success: true, data: metrics, error: null })
      }
      if (path === "/lock") {
        const msg = handleLock()
        return NextResponse.json({ success: true, data: msg, error: null })
      }
      if (path === "/send") {
        const recipient =
          typeof rec.recipient === "string" ? rec.recipient : ""
        const amount =
          typeof rec.amount_zatoshis === "number" ? rec.amount_zatoshis : 0
        const lat =
          typeof rec.latitude === "number" ? rec.latitude : undefined
        const lon =
          typeof rec.longitude === "number" ? rec.longitude : undefined
        const plan = handleSend({
          recipient,
          amount_zatoshis: amount,
          latitude: lat,
          longitude: lon,
        })
        return NextResponse.json({ success: true, data: plan, error: null })
      }
      if (path === "/receive") {
        const amount =
          typeof rec.amount_zatoshis === "number" ? rec.amount_zatoshis : 0
        const label =
          typeof rec.sender_label === "string" ? rec.sender_label : undefined
        const memo =
          typeof rec.memo_text === "string" ? rec.memo_text : undefined
        const plan = handleReceive({
          amount_zatoshis: amount,
          sender_label: label,
          memo_text: memo,
        })
        return NextResponse.json({ success: true, data: plan, error: null })
      }
      if (path === "/toggle-mode") {
        memoryStore.distressMode =
          memoryStore.distressMode === "Immediate" ? "Deferred" : "Immediate"
        return NextResponse.json({
          success: true,
          data: memoryStore.distressMode,
          error: null,
        })
      }
      if (path === "/set-mode") {
        const mode = rec.mode === "Deferred" ? "Deferred" : "Immediate"
        memoryStore.distressMode = mode
        return NextResponse.json({
          success: true,
          data: memoryStore.distressMode,
          error: null,
        })
      }
      if (path === "/configure-distress") {
        const cfg: DistressConfig = {
          trusted_contact_address:
            typeof rec.trusted_contact_address === "string"
              ? rec.trusted_contact_address
              : memoryStore.guardianAddress,
          trusted_contact_ivk: memoryStore.guardianIvk,
          distress_amount_zatoshis:
            typeof rec.distress_amount_zatoshis === "number"
              ? rec.distress_amount_zatoshis
              : 10000,
          mode: rec.mode === "Deferred" ? "Deferred" : "Immediate",
          default_message:
            typeof rec.default_message === "string"
              ? rec.default_message
              : "Emergency Distress Beacon",
        }
        memoryStore.guardianAddress = cfg.trusted_contact_address
        memoryStore.distressMode = cfg.mode
        return NextResponse.json({ success: true, data: cfg, error: null })
      }
      if (path === "/trigger-deferred") {
        return NextResponse.json({ success: true, data: [], error: null })
      }
      if (path === "/reset") {
        const resetStore = initializeStore()
        Object.assign(memoryStore, resetStore)
        return NextResponse.json({
          success: true,
          data: "State reset to defaults",
          error: null,
        })
      }
    }

    return NextResponse.json(
      { success: false, data: null, error: `Route not found: ${method} ${path}` },
      { status: 404 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Error"
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 500 }
    )
  }
}
