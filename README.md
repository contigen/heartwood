# Heartwood: Duress-Aware Shielded Zcash Wallet

Live web deployment: [https://heartwood-aware.vercel.app](https://heartwood-aware.vercel.app)

Heartwood is a shielded Zcash wallet designed for physical coercion, device inspection, and extortion scenarios. It hides a second wallet identity inside local storage using deniable encryption. 

When unlocked with a primary PIN, it loads the real shielded savings account. When unlocked with a duress PIN, it loads an independently funded decoy account. Payments sent from the decoy account automatically insert an in-band emergency alert into the same shielded transaction, addressed to a trusted contact's viewing key. The outgoing transfer provides cover for the alert.

## How it works

### 1. Hidden-volume dual keystore
The keystore is a fixed 64 KiB binary blob (`65,536 bytes`) filled with CSPRNG random data on initialization. It has no headers, volume markers, or partition tables.
- **PIN A (`2468`)**: Derives an Argon2id key that decrypts Slot 0, loading the primary spending key and transaction history.
- **PIN B (`1357`)**: Derives an independent Argon2id key that decrypts Slot 1, loading the decoy spending key. Slot 1 resides in space that appears as random padding when inspecting Slot 0.
- **Unknown PINs (e.g. `0000`)**: Execute the same Argon2id pipeline and derive a synthetic zero-balance wallet instead of returning a MAC error. This prevents trial-and-error oracle attacks.

### 2. Constant-time execution
Both Slot 0 and Slot 1 keys are computed on every unlock attempt. The unlock routine always runs both Argon2id derivations so that execution time remains uniform regardless of which PIN is entered.

### 3. Dual real accounts
Both identities use ZIP-32 derivation to generate genuine Orchard and Sapling keys:
- **Primary account**: 14.25 ZEC balance with historical shielded transfers.
- **Decoy account**: 1.25 ZEC balance with everyday merchant transaction history.

### 4. In-band emergency distress signal
When a payment leaves the decoy account, Heartwood adds a second shielded output inside the exact same Orchard transaction:
- Output 0: The transfer demanded by the coercer.
- Output 1: A 10,000 zatoshi shielded output addressed to the guardian's incoming viewing key (`uviewtest1...`). The 512-byte encrypted memo contains GPS coordinates, a timestamp, and an incident code.
- Padding: The transaction bundle is padded to 3 actions (`1,740 bytes`), matching the standard on-chain footprint of normal multi-output Orchard transactions.
- On-chain appearance: Outside observers and the coercer see only encrypted ciphertexts and nullifiers. Only someone with the guardian viewing key can decrypt Output 1.

### 5. Immediate and deferred broadcast
If active network traffic during the incident creates personal risk, the distress payload can be queued in an encrypted local outbox and dispatched automatically once the device reconnects unattended.

## Testing credentials

- **Primary PIN**: `2468` (Primary Savings, 14.25 ZEC)
- **Duress PIN**: `1357` (Personal Daily Decoy, 1.25 ZEC, injects emergency alert)
- **Synthetic PIN**: `0000` (Synthetic ephemeral wallet, zero balance)

## Quickstart

### Option 1: Live deployment
Open [https://heartwood-aware.vercel.app](https://heartwood-aware.vercel.app) in any browser.

### Option 2: Local development

#### 1. Start the Rust core daemon
```bash
cargo run -p heartwood-app -- serve --port 3080
```
This runs the Axum API server on `http://127.0.0.1:3080`.

#### 2. Start the Next.js interface
```bash
cd web
bun install
bun run dev
```
Open [http://localhost:3000](http://localhost:3000).

## Command line tools

Run automated terminal tests and audits from the workspace root:

```bash
# Run integration test suite
cargo test

# Run mathematical independence and container entropy audit
cargo run -p heartwood-app -- audit

# Run terminal demonstration script
cargo run -p heartwood-app -- demo
```

The test suite covers:
- `tests/independence_test.rs`: Verifies that Seed B cannot be derived from Seed A and confirms container Shannon entropy meets 7.98+ bits per byte.
- `tests/constant_time_test.rs`: Benchmarks unlock latency across primary, decoy, and invalid PINs.
- `tests/multi_output_test.rs`: Validates in-band multi-output shielded bundle construction and viewing key trial-decryption.
- `tests/deferred_broadcast_test.rs`: Verifies deferred outbox queuing and broadcast behavior.

## Project structure

```
heartwood/
├── crates/
│   ├── heartwood-core/          # Protocol core
│   │   ├── src/crypto/          # Argon2id, ChaCha20-Poly1305, Shannon entropy calculation
│   │   ├── src/keystore/        # Hidden-volume storage, zero-oracle decryption
│   │   ├── src/wallet/          # ZIP-32 Orchard/Sapling derivation, unified addresses
│   │   └── src/distress/        # Multi-output transaction planner, memo encoder, IVK scanner
│   │   └── tests/               # Integration tests
│   └── heartwood-app/           # Axum API server & CLI runner
│       └── src/
│           ├── main.rs          # CLI entry point
│           ├── routes.rs        # REST API endpoints
│           └── state.rs         # In-memory wallet state
├── web/                         # Next.js 16 web application
│   ├── src/app/                 # App router and API fallback routes
│   ├── src/components/          # UI views (Wallet, Address Book, Guardian Monitor, Forensics)
│   └── src/lib/                 # API client, TypeScript definitions, state engine
└── docs/
    ├── THREAT_MODEL.md          # Threat model, forensic backup analysis, residual risks
    ├── CRYPTO_INDEPENDENCE.md   # Non-derivability mathematical proof
    └── SUBMISSION.md            # Hackathon submission text
```

## Threat model and limits

- **Backups**: Unencrypted local disk clones or OS-level cloud backups (e.g. iCloud, Google Drive) could allow an attacker with forensic tools to observe container file modifications over time. Keystore blobs should be excluded from cloud backups.
- **Repeated coercion**: If an attacker forces multiple unlock attempts across several days and compares spend history with external data, cryptographic deniability cannot prevent social exposure.
- **Hardware timing**: On constrained mobile processors, memory bus contention during Argon2id passes may produce slight timing jitter. The test suite measures this variance across 100 iterations to verify indistinguishability within statistical noise margins.

## License

Dual-licensed under Apache 2.0 and MIT.
