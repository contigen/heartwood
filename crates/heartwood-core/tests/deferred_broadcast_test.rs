use heartwood_core::distress::beacon::{DistressBeacon, DistressType};
use heartwood_core::distress::deferred::DeferredQueue;
use heartwood_core::distress::scanner::TrustedContactScanner;
use heartwood_core::keystore::container::DistressMode;
use heartwood_core::wallet::client::HeartwoodWallet;
use tempfile::NamedTempFile;

#[test]
fn test_deferred_distress_queue_and_unsupervised_broadcast() {
    let pin_a = "1111";
    let pin_b = "9999";
    let contact_addr = "utest1hwoodtrustedcontactaddress998877665544332211";
    let contact_ivk = "zviewtestsaplingtrustedivk99887766554433221100";

    let (wallet, _, _) = HeartwoodWallet::initialize_dual_wallet(
        pin_a,
        pin_b,
        14_250_000_000,
        125_000_000,
        contact_addr,
        contact_ivk,
    )
    .expect("Dual wallet initialization");

    let (session_b_res, _) = wallet.unlock(pin_b);
    let mut session_b = session_b_res.expect("Unlock B");

    // 1. Toggle to Deferred mode
    let mode = session_b.toggle_distress_mode();
    assert_eq!(mode, Some(DistressMode::Deferred));

    // 2. Coerced spend in deferred mode
    let coercer_addr = "utest1coercerdestinationaddress112233445566778899";
    let tx_plan = session_b
        .send(coercer_addr, 50_000_000, None, None)
        .expect("Send");

    // Under deferred mode: coercer only sees 1 payment output leaving! No distress output in this tx!
    assert!(!tx_plan.silent_distress_injected);
    assert!(tx_plan.deferred_distress_queued);
    assert_eq!(tx_plan.outputs.len(), 1);

    // 3. Queue distress signal locally in encrypted outbox
    let mut outbox = DeferredQueue::new();
    let beacon = DistressBeacon::new(
        DistressType::CoercedPayment,
        Some(40.7128),
        Some(-74.0060),
        "DEFERRED COERCION REPORT",
        Some(coercer_addr.into()),
        Some(50_000_000),
    );
    outbox.enqueue(beacon);
    assert_eq!(outbox.len(), 1);

    // 4. Test encrypted persistence of the outbox
    let temp_file = NamedTempFile::new().expect("Temp file");
    let key = [42u8; 32];
    outbox.save_encrypted(temp_file.path(), &key).expect("Save encrypted");

    let mut loaded_outbox = DeferredQueue::load_encrypted(temp_file.path(), &key).expect("Load encrypted");
    assert_eq!(loaded_outbox.len(), 1);

    // 5. Trigger "unsupervised" broadcast event
    let cfg = session_b.distress_config.as_ref().unwrap();
    let broadcasts = loaded_outbox
        .drain_and_create_broadcasts(session_b.spendable_zatoshis, cfg)
        .expect("Drain and broadcast");

    assert_eq!(broadcasts.len(), 1);
    assert!(loaded_outbox.is_empty());

    // 6. Trusted contact scanner receives the deferred distress broadcast
    let scanner = TrustedContactScanner::new(contact_addr, contact_ivk);
    let alerts = scanner.scan_transaction(&broadcasts[0]);
    assert_eq!(alerts.len(), 1);
    assert_eq!(alerts[0].beacon.alert_message, "DEFERRED COERCION REPORT");
}
