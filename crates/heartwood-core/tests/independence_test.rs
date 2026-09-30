use heartwood_core::keystore::independence::verify_independence;
use heartwood_core::wallet::client::HeartwoodWallet;

#[test]
fn test_dual_seed_cryptographic_independence() {
    let pin_a = "2468";
    let pin_b = "1357";
    let contact_addr = "utest1hwoodtrustedcontactaddress998877665544332211";
    let contact_ivk = "zviewtestsaplingtrustedivk99887766554433221100";

    let (wallet, desc_a, desc_b) = HeartwoodWallet::initialize_dual_wallet(
        pin_a,
        pin_b,
        14_250_000_000, // 142.50 ZEC
        125_000_000,    // 1.25 ZEC
        contact_addr,
        contact_ivk,
    )
    .expect("Dual wallet initialization must succeed");

    // 1. Assert seeds are completely distinct
    assert_ne!(desc_a.seed, desc_b.seed);
    assert_ne!(desc_a.mnemonic, desc_b.mnemonic);

    // 2. Primary Volume has NO distress config
    assert!(desc_a.distress_config.is_none());

    // 3. Decoy Volume HAS distress config
    assert!(desc_b.distress_config.is_some());
    let cfg = desc_b.distress_config.as_ref().unwrap();
    assert_eq!(cfg.trusted_contact_address, contact_addr);

    // 4. Verify independence report
    let report = verify_independence(wallet.container(), &desc_a, &desc_b);
    assert!(!report.seed_a_seed_b_equal);
    assert!(
        report.seed_bitwise_hamming_distance > 100,
        "Hamming distance between seeds should be close to 128 bits"
    );
    assert!(
        report.slot_1_entropy_bits_per_byte > 7.95,
        "Hidden slot entropy should exceed 7.95 bits/byte"
    );
    assert!(
        report.padding_entropy_bits_per_byte > 7.95,
        "Padding entropy should exceed 7.95 bits/byte"
    );
    assert!(!report.contains_cross_references);
    assert!(report.zero_knowledge_deniable);

    // 5. Test unlock paths
    let (session_a, metrics_a) = wallet.unlock(pin_a);
    let session_a = session_a.expect("PIN A unlock must succeed");
    assert_eq!(session_a.account_name, "Primary Savings");
    assert_eq!(session_a.balance_zatoshis, 14_250_000_000);
    assert!(!session_a.has_distress_config());
    assert!(!metrics_a.is_synthetic);

    let (session_b, metrics_b) = wallet.unlock(pin_b);
    let session_b = session_b.expect("PIN B unlock must succeed");
    assert_eq!(session_b.account_name, "Personal Daily");
    assert_eq!(session_b.balance_zatoshis, 125_000_000);
    assert!(session_b.has_distress_config());
    assert!(!metrics_b.is_synthetic);

    // 6. Test wrong PIN -> should produce synthetic ephemeral session rather than error oracle
    let (session_wrong, metrics_wrong) = wallet.unlock("0000");
    let session_wrong = session_wrong.expect("Wrong PIN should unlock into synthetic session");
    assert_eq!(session_wrong.balance_zatoshis, 0);
    assert!(metrics_wrong.is_synthetic);
}
