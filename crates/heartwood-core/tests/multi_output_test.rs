use heartwood_core::distress::beacon::DistressType;
use heartwood_core::distress::scanner::TrustedContactScanner;
use heartwood_core::wallet::client::HeartwoodWallet;

#[test]
fn test_in_band_multi_output_distress_and_scanner() {
    let pin_a = "4321";
    let pin_b = "8765";
    let contact_addr = "utest1hwoodtrustedcontactaddress998877665544332211";
    let contact_ivk = "zviewtestsaplingtrustedivk99887766554433221100";

    let (wallet, _, _) = HeartwoodWallet::initialize_dual_wallet(
        pin_a,
        pin_b,
        14_250_000_000, // 142.50 ZEC
        125_000_000,    // 1.25 ZEC
        contact_addr,
        contact_ivk,
    )
    .expect("Wallet initialization must succeed");

    // 1. Unlock with PIN B (Decoy under duress)
    let (session_b_res, _) = wallet.unlock(pin_b);
    let mut session_b = session_b_res.expect("PIN B unlock");
    assert!(session_b.has_distress_config());

    // 2. Perform coerced send: 1.0 ZEC to coercer address
    let coercer_addr = "utest1coercerdestinationaddress112233445566778899";
    let coerced_amount = 100_000_000; // 1.0 ZEC
    let tx_plan = session_b
        .send(coercer_addr, coerced_amount, Some(37.7749), Some(-122.4194))
        .expect("Coerced send must succeed");

    assert!(tx_plan.silent_distress_injected);
    assert_eq!(tx_plan.outputs.len(), 2, "Expected coercer output + covert distress output");

    // Output 0: Coercer payment
    assert_eq!(tx_plan.outputs[0].recipient_address, coercer_addr);
    assert_eq!(tx_plan.outputs[0].amount_zatoshis, coerced_amount);
    assert!(!tx_plan.outputs[0].is_distress_beacon);

    // Output 1: Covert distress signal
    assert_eq!(tx_plan.outputs[1].recipient_address, contact_addr);
    assert_eq!(tx_plan.outputs[1].amount_zatoshis, 10_000);
    assert!(tx_plan.outputs[1].is_distress_beacon);

    // 3. Trusted Contact Scanner verification
    let scanner = TrustedContactScanner::new(contact_addr, contact_ivk);
    let alerts = scanner.scan_transaction(&tx_plan);
    assert_eq!(alerts.len(), 1, "Trusted contact scanner must detect the distress beacon");

    let alert = &alerts[0];
    assert_eq!(alert.received_zatoshis, 10_000);
    assert_eq!(alert.beacon.distress_type, DistressType::CoercedPayment);
    assert_eq!(alert.beacon.coerced_recipient.as_deref(), Some(coercer_addr));
    assert_eq!(alert.beacon.coerced_amount_zatoshis, Some(coerced_amount));
    assert_eq!(alert.beacon.latitude, Some(37.7749));
    assert_eq!(alert.beacon.longitude, Some(-122.4194));

    // 4. Verification from Primary Account (Seed A)
    let (session_a_res, _) = wallet.unlock(pin_a);
    let mut session_a = session_a_res.expect("PIN A unlock");
    let ordinary_tx = session_a
        .send(coercer_addr, 50_000_000, None, None)
        .expect("Primary send");
    assert!(!ordinary_tx.silent_distress_injected);
    assert_eq!(ordinary_tx.outputs.len(), 1);

    let ordinary_alerts = scanner.scan_transaction(&ordinary_tx);
    assert!(ordinary_alerts.is_empty(), "Primary transfer must not trigger trusted contact alerts");
}
