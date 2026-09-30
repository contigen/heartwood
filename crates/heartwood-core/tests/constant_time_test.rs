use heartwood_core::wallet::client::HeartwoodWallet;
use std::time::Instant;

#[test]
fn test_constant_time_unlock_profile() {
    let pin_a = "5678";
    let pin_b = "1234";
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
    .expect("Wallet initialization");

    // Warm-up iteration
    let _ = wallet.unlock(pin_a);

    // Measure PIN A
    let start_a = Instant::now();
    let (_, metrics_a) = wallet.unlock(pin_a);
    let duration_a = start_a.elapsed().as_millis();

    // Measure PIN B
    let start_b = Instant::now();
    let (_, metrics_b) = wallet.unlock(pin_b);
    let duration_b = start_b.elapsed().as_millis();

    // Measure Invalid PIN
    let start_invalid = Instant::now();
    let (_, metrics_invalid) = wallet.unlock("9999");
    let duration_invalid = start_invalid.elapsed().as_millis();

    // Assert all executions attempted both slots
    assert!(metrics_a.slot_attempted_0 && metrics_a.slot_attempted_1);
    assert!(metrics_b.slot_attempted_0 && metrics_b.slot_attempted_1);
    assert!(metrics_invalid.slot_attempted_0 && metrics_invalid.slot_attempted_1);

    println!(
        "Constant-time unlock benchmark: PIN A = {}ms, PIN B = {}ms, Invalid PIN = {}ms",
        duration_a, duration_b, duration_invalid
    );

    // Both executions compute 2 Argon2id hashes, so the maximum difference between any
    // two runs should be modest (typically < 40% variance on a modern CPU).
    let max_dur = duration_a.max(duration_b).max(duration_invalid) as f64;
    let min_dur = duration_a.min(duration_b).min(duration_invalid) as f64;

    assert!(
        min_dur > 0.0,
        "Timing should reflect non-zero memory-hard KDF execution"
    );
    let ratio = max_dur / min_dur;
    assert!(
        ratio < 2.5,
        "Unlock times must remain statistically equivalent (ratio was {:.2})",
        ratio
    );
}
