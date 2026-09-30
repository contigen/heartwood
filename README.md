# 🌲 Heartwood: Duress-Aware Shielded Zcash Wallet

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue.svg)]()
[![Hackathon](https://img.shields.io/badge/Zecathon-Wildcard%20Track-emerald.svg)](https://thezecathon.com)

> *Named for the hidden, structural inner layer of a tree, in keeping with Zcash's plant-lineage pool names (Sapling → Orchard → Ironwood).*

Heartwood is a Zcash shielded wallet featuring a **cryptographically undetectable hidden-volume dual identity**. Entering one PIN unlocks the user's real shielded balance; entering a duress PIN unlocks a genuinely spendable decoy balance. When a payment is sent under coercion, the transaction silently embeds an in-band emergency distress signal to a pre-configured trusted contact. 

**The money is cover for the signal.**

---

## 🌟 Key Features

1. **Hidden-Volume Dual Keystore**: Modelled on VeraCrypt/TrueCrypt hidden volumes. A single fixed 64 KiB container initialized with CSPRNG noise. No headers, signatures, or metadata indicating a second volume exists.
2. **Zero Error Oracles**: Wrong PIN attempts decrypt plausible synthetic empty wallet sessions rather than throwing distinguishing MAC failures.
3. **Identical Code-Path & Timing**: Every unlock computes both Argon2id KDF passes, guaranteeing statistically indistinguishable timing profiles ($\approx 3.5\text{s}$) across all PINs.
4. **In-Band Distress Beacon**: Injects a covert second shielded output into the coerced transfer carrying a 512-byte emergency memo (ZIP 302) with coordinates, timestamp, and alert payload.
5. **Immediate and Deferred Broadcast Modes**: Immediate in-band dispatch or encrypted local queuing to prevent network detection while supervised.
6. **Trusted Contact Scanner**: Enables the emergency contact to decrypt compact block outputs using their Incoming Viewing Key (IVK) and monitor duress alerts in real time.
7. **Full-Featured Web Application & Terminal CLI**: Embedded dark-mode Glassmorphism dashboard with real-time multi-perspective views for hackathon judging.

---

## 🚀 Quickstart

### Prerequisites
- [Rust](https://rustup.rs/) (1.80+)
- Cargo

### 1. Launch the Interactive Web Application
```bash
cargo run -p heartwood-app -- serve --port 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

**Preset Test Credentials:**
- **Primary PIN (`PIN A`):** `2468` (Real savings: 142.50 ZEC)
- **Decoy PIN (`PIN B`):** `1357` (Decoy wallet: 1.25 ZEC with Silent SOS)
- **Invalid PIN:** `0000` (Synthetic ephemeral wallet, zero balance)

---

### 2. Run the Automated 5-Stage Judging Demo in Terminal
```bash
cargo run -p heartwood-app -- demo
```

### 3. Run Cryptographic Independence & Entropy Audit
```bash
cargo run -p heartwood-app -- audit
```

### 4. Run the Full Test Suite
```bash
cargo test -p heartwood-core -- --nocapture
```
Runs:
- `tests/independence_test.rs`: Mathematical isolation between Seed A and Seed B.
- `tests/constant_time_test.rs`: Side-channel timing equivalence benchmark.
- `tests/multi_output_test.rs`: In-band multi-output shielded note and memo scanner verification.
- `tests/deferred_broadcast_test.rs`: Encrypted deferred outbox persistence and broadcast.

---

## 📐 Architecture

```
heartwood/
├── crates/
│   ├── heartwood-core/            # Cryptographic & Zcash protocol core
│   │   ├── src/
│   │   │   ├── crypto/            # Argon2id, ChaCha20-Poly1305, Shannon Entropy
│   │   │   ├── keystore/          # Hidden volume container, independence audit
│   │   │   ├── wallet/            # ZIP-32 derivation, account session, spend planner
│   │   │   └── distress/          # 512-byte memo beacon, injector, deferred queue, IVK scanner
│   │   └── tests/                 # Integration test suite
│   └── heartwood-app/             # Web App server & CLI runner
│       └── src/
│           ├── main.rs            # Application CLI & server entrypoint
│           ├── state.rs           # Shared state manager
│           ├── routes.rs          # Axum REST endpoints
│           └── static_assets.rs   # Embedded SPA (Tailwind CSS, Glassmorphism)
└── docs/
    ├── THREAT_MODEL.md            # Threat model, forensic backup analysis, residual risks
    ├── CRYPTO_INDEPENDENCE.md     # Mathematical proof of Seed B / Seed A non-derivability
    └── SUBMISSION.md              # Zecathon hackathon submission text
```

---

## 📜 License

Licensed under either of:
- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
- MIT license ([LICENSE-MIT](LICENSE-MIT))
at your option.
