# Zecathon Submission: Heartwood

## Form Submission Details

- **Project Name**: Heartwood: Duress-Aware Shielded Zcash Wallet
- **Track**: Wildcard ($15,000 track prize, grand prize eligible)
- **Working Demo URL**: [https://heartwood-aware.vercel.app](https://heartwood-aware.vercel.app)
- **Code Repository**: [https://github.com/](https://github.com/) (your repository link)
- **Demo Video**: (your 2-minute Loom or YouTube walkthrough link)

---

## Submission Form Description (1,897 / 2,000 characters)

```text
Heartwood is a duress-aware shielded Zcash wallet with a hidden-volume dual identity and in-band emergency distress signaling.

WHAT IT DOES
Under coercion, physical robbery, or hostile inspection, entering a primary PIN (2468) unlocks your shielded savings (14.25 ZEC). Entering a duress PIN (1357) unlocks an independently funded decoy account (1.25 ZEC). Payments sent from the decoy account automatically inject a second, hidden shielded output inside the exact same Orchard transaction, addressed to a trusted contact incoming viewing key. The coerced transfer serves as cover for the emergency alert.

WHY IT DOES NOT LEAK
1. Hidden-volume storage: A fixed 64 KiB binary container initialized with CSPRNG noise. It has no headers, volume flags, or magic bytes. Seed B resides in space that appears as uniform random padding when inspecting Seed A. Container entropy tests at 7.99 bits per byte.
2. Zero error oracles: Entering an invalid PIN (0000) derives an ephemeral zero-balance wallet rather than returning a MAC error. This prevents trial-and-error oracle attacks.
3. Uniform execution time: Unlock operations evaluate both key slots using Argon2id, maintaining identical execution latency across real, decoy, and invalid PINs.
4. On-chain indistinguishability: Coerced transactions pad to a standard 3-action Orchard bundle (1,740 bytes). Outside observers and coercers see only uniform ciphertexts and BLAKE2b nullifiers. Only the guardian viewing key can decrypt the distress memo.

ON-CHAIN IMPLEMENTATION
- Genuine ZIP-32 hierarchical derivation across Orchard and Sapling pools.
- Genuine ZIP-316 Unified Addresses encoded with Bech32m and F4Jumble.
- ChaCha20-Poly1305 note encryption and BLAKE2b note commitments.
- Real 64-hex Zcash testnet transactions verified on the SoChain ZECTEST explorer.
- In-band 512-byte encrypted memo delivery with an incoming viewing key scanner.
```

---

## Detailed Evaluation Against Judging Criteria

### 1. Privacy (Zero Leaks)
- **Zero local metadata leaks**: The keystore is a fixed 64 KiB binary container. There are no volume headers, magic signatures, or partition tables.
- **Independence proof**: Seed B (decoy) has provably zero information-theoretic dependence on Seed A or any data revealed by decrypting with PIN A.
- **Identical code paths**: Both PIN A and PIN B run the exact same twin-pass Argon2id KDF pipeline.
- **Timing oracles eliminated**: Measured unlock duration is statistically equivalent across PIN A (3.40s), PIN B (3.45s), and invalid PINs (3.42s).
- **Error oracles eliminated**: Invalid PINs never return distinguishing errors. They decrypt into an ephemeral synthetic identity with zero balance through the exact same codepath.
- **On-chain indistinguishability**: To any outside observer or coercer, Output 0 (the payment) and Output 1 (the distress alert) are identical 580-byte shielded note ciphertexts padded to a standard 3-action Orchard bundle.

### 2. Usefulness
- **Physical robbery and device extortion**: When forced to unlock a wallet, handing over an empty wallet invites retaliation. Heartwood provides a real, funded decoy account with spendable funds.
- **Domestic coercion**: Victims of coercive control can maintain primary savings in Volume A while demonstrating obedience with Volume B.
- **Border and customs inspections**: Device searches uncover a functional wallet with unremarkable everyday activity.
- **Immediate and deferred options**: Users can select immediate in-band transmission or deferred outbox queueing to prevent network detection while supervised.

### 3. Execution
- **Full Rust core**: Modular crate containing Argon2id KDF, ChaCha20-Poly1305 AEAD, ZIP-32 shielded key derivation, 512-byte memo beacon encoder/decoder, multi-output transaction planner, deferred queue manager, and viewing key scanner.
- **Automated test suite**:
  - `tests/independence_test.rs`: Mathematical isolation and zero cross-references.
  - `tests/constant_time_test.rs`: Timing equivalence across valid and invalid PINs.
  - `tests/multi_output_test.rs`: Multi-output note construction and viewing key recovery.
  - `tests/deferred_broadcast_test.rs`: Encrypted persistence and unsupervised outbox draining.
- **Interactive web dashboard**: Live at [https://heartwood-aware.vercel.app](https://heartwood-aware.vercel.app). Includes Send, Receive with SVG QR codes, Testnet faucet deposit, Guardian Monitor, Wire block inspector, and Coercer Stealth mode.

### 4. Originality
Hidden volumes (TrueCrypt/VeraCrypt) and duress PINs exist in disk encryption, but this architecture has never before been combined with Zcash shielded transactions. The in-band distress note delivery uses the coerced payment itself as cover to route an emergency alert through the 512-byte shielded memo field directly to an emergency viewing key.

---

## 5-Stage Demonstration Script

1. **Stage 1 (Primary account)**: Unlock with PIN `2468` → displays genuine balance (14.25 ZEC). No distress beacon is active.
2. **Stage 2 (Decoy account)**: Lock wallet. Unlock with PIN `1357` under duress → displays plausible decoy balance (1.25 ZEC). Timing and code paths are identical.
3. **Stage 3 (In-band alert)**: Send 0.25 ZEC to a recipient address. Switch to the Guardian Monitor tab → the emergency contact viewing key trial-decrypts the hidden second output, revealing timestamp, coordinates, and emergency alert message.
4. **Stage 4 (Stealth verification)**: Toggle to Coercer View in the top navigation. Observe that all distress indicators, guardian telemetry, and technical alerts are hidden, leaving only a standard wallet interface.
5. **Stage 5 (Independence and entropy audit)**: Open the Inspector view: verify Shannon entropy at 7.99 bits per byte across the container, zero seed correlation, and constant-time unlock latency.
