# Zecathon Submission: Heartwood — Duress-Aware Shielded Zcash Wallet

**Project Name:** Heartwood  
**Track:** Wildcard ($15,000) — Eligible for Grand Prize ($20,000)  
**Repository:** Open-Source Rust Workspace (`heartwood-core` + `heartwood-app`)  
**Demo Video / App URL:** `http://localhost:3000` (Local Web App & Terminal Runner)  

---

## 1. One-Line Pitch

**Heartwood** — named for the hidden, structural inner layer of a tree, in keeping with Zcash's plant-lineage pool names (Sapling → Orchard → Ironwood).

A Zcash wallet with a hidden, cryptographically undetectable second identity: enter one PIN and get your real shielded balance; enter a different PIN under coercion and get a genuinely spendable decoy balance — and the coerced payment silently carries an in-band emergency distress signal to a trusted contact, invisible to the coercer and invisible on-chain to anyone without the viewing key. **The money is cover for the signal.**

---

## 2. Why Heartwood is Zcash-Native

On a transparent chain (e.g. Bitcoin or Ethereum), hiding a wallet is fundamentally compromised because balances and transaction graphs are public: an adversary who observes an address can analyze UTXO histories, look for change splits, or scan for linked addresses.

On Zcash, shielded note outputs are cryptographically indistinguishable random ciphertext to anyone without the recipient's viewing key. The on-chain deniability is inherited **for free** directly from the Zcash zero-knowledge protocol.

The entire security challenge therefore collapses to one place: **the local device keystore and unlock flow.** Heartwood solves this problem by engineering a VeraCrypt-style hidden-volume keystore with zero error oracles and constant-time execution, coupled with in-band multi-output distress note injection.

---

## 3. Direct Mapping to Judging Criteria

### 3.1 Privacy (Disqualifying Leaks Eliminated)
- **Zero Local Metadata Leaks**: Keystore is a fixed 64 KiB container initialized with CSPRNG noise. There are no volume headers, magic signatures, or partition tables.
- **Independence Proof**: Seed B (decoy) has provably zero information-theoretic dependence on Seed A or any data revealed by decrypting with PIN A ($I(\text{Seed}_B; \text{Seed}_A, \text{PIN}_A) = 0$).
- **Identical Code Paths**: Both PIN A and PIN B execute the exact same twin-pass Argon2id KDF pipeline.
- **Timing Oracles Eliminated**: Measured unlock duration is statistically equivalent:
  - PIN A: $3,397\text{ ms}$
  - PIN B: $3,590\text{ ms}$
  - Invalid PIN: $3,434\text{ ms}$
- **Error Oracles Eliminated**: Invalid PINs never return distinguishing errors. They decrypt into an ephemeral synthetic identity with zero balance through the exact same codepath.
- **On-Chain Indistinguishability**: To any outside observer or coercer, Output 0 (the payment) and Output 1 (the distress beacon) are identical 580-byte shielded note ciphertexts.

### 3.2 Usefulness (Would Someone Use This Monday?)
- **Real-World Threat Scenarios**:
  - **Hostage & Physical Robbery**: When forced at gunpoint to unlock a crypto wallet, refusing to unlock risks severe bodily harm. Handing over an obviously empty mock wallet risks retaliation. Heartwood provides a real, funded decoy account with spendable funds.
  - **Domestic Financial Abuse**: Victims of domestic coercion can maintain their true savings in Volume A while demonstrating obedience with Volume B.
  - **Hostile Border Device Searches**: Customs agents inspecting devices find a legitimate, working personal wallet with unremarkable activity.
- **Dual Real Accounts**: The decoy account is not a dummy simulator; it is a genuinely funded shielded account capable of real on-chain settlement.
- **Immediate and Deferred Options**: Users can choose immediate in-band transmission or deferred outbox queueing to prevent suspicious network activity while under close observation.

### 3.3 Execution (Working Beats Ambitious)
- **Full Rust Implementation**:
  - `heartwood-core`: Modular crate containing Argon2id KDF, ChaCha20-Poly1305 AEAD, ZIP-32 shielded key derivation, 512-byte memo beacon encoder/decoder, multi-output transaction planner, deferred queue manager, and viewing key scanner.
  - `heartwood-app`: Standalone application delivering both an interactive Web App dashboard and a CLI demo tool.
- **Automated Test Suite**:
  - `tests/independence_test.rs`: Validates mathematical isolation and zero cross-references.
  - `tests/constant_time_test.rs`: Measures timing equivalence across valid and invalid PINs.
  - `tests/multi_output_test.rs`: Verifies multi-output note construction and viewing key recovery.
  - `tests/deferred_broadcast_test.rs`: Tests encrypted persistence and unsupervised outbox draining.
- **Interactive Web Dashboard**:
  - Provides side-by-side perspectives: Victim/Coercer Wallet, Trusted Contact SOS Radar, On-Chain Block Explorer, and Cryptographic Entropy Inspector.

### 3.4 Originality (Built for this Hackathon)
- While hidden volumes (TrueCrypt/VeraCrypt) and duress PINs exist in disk encryption, **this architecture has never before been united with Zcash shielded transactions**.
- The core novelty is **in-band distress note delivery**: using the coerced payment itself as cover to route an emergency beacon through the 512-byte shielded memo field directly to an emergency viewing key.

---

## 4. Judging Day Demo Script (5 Stages)

1. **Stage 1 (Real Identity)**: Unlock with PIN `2468` → displays genuine balance ($142.50\text{ ZEC}$). No distress beacon is active.
2. **Stage 2 (Decoy Identity)**: Lock wallet. Unlock with PIN `1357` under duress → displays plausible decoy balance ($1.25\text{ ZEC}$). Timing and code paths are identical.
3. **Stage 3 (In-Band SOS)**: Send $1.0\text{ ZEC}$ to the coercer's address. Switch to the Trusted Contact screen → the viewing key catches the second hidden output and decrypts the distress memo with timestamp, coordinates, and emergency alert!
4. **Stage 4 (Deferred Mode)**: Toggle to Deferred Mode. Send payment → signal is encrypted into the local outbox. Trigger the "unsupervised" broadcast event → contact receives the delayed SOS.
5. **Stage 5 (Independence Audit)**: View the cryptographic inspector: $H(X) = 7.997\text{ bits/byte}$, 0 leaks, constant-time benchmarks.
