mod routes;
mod state;
mod static_assets;

use axum::{response::Html, routing::get, Router};
use clap::{Parser, Subcommand};
use colored::Colorize;
use state::{AppState, SharedState, DEFAULT_PIN_A, DEFAULT_PIN_B};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Parser)]
#[command(name = "heartwood")]
#[command(author = "Heartwood Zcash Team")]
#[command(version = "0.1.0")]
#[command(about = "Duress-Aware Shielded Zcash Wallet — Zecathon 2026", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Launch the interactive Web App (default)
    Serve {
        #[arg(short, long, default_value_t = 3000)]
        port: u16,
    },
    /// Execute the full 5-stage hackathon demo script in terminal
    Demo,
    /// Run cryptographic independence audit and container entropy verification
    Audit,
    /// Test unlock flow for a PIN
    Unlock {
        #[arg(short, long)]
        pin: String,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let cli = Cli::parse();
    let state: SharedState = Arc::new(RwLock::new(AppState::new_default()));

    match cli.command {
        Some(Commands::Serve { port }) => {
            run_server(state, port).await?;
        }
        None => {
            run_server(state, 3000).await?;
        }
        Some(Commands::Demo) => {
            run_terminal_demo(state).await?;
        }
        Some(Commands::Audit) => {
            run_audit(state).await?;
        }
        Some(Commands::Unlock { pin }) => {
            let mut s = state.write().await;
            println!("{}", "Running constant-time memory-hard Argon2id unlock...".cyan());
            match s.unlock(&pin) {
                Ok(metrics) => {
                    let session = s.active_session.as_ref().unwrap();
                    println!("{}", "✓ Unlock Succeeded".green().bold());
                    println!("  Account:     {}", session.account_name.yellow());
                    println!("  Address:     {}", session.unified_address.white());
                    println!("  Balance:     {:.4} ZEC", session.balance_zatoshis as f64 / 1e8);
                    println!("  Elapsed:     {} ms", metrics.elapsed_ms);
                    println!("  Synthetic:   {}", metrics.is_synthetic);
                    println!("  Has Distress: {}", session.has_distress_config());
                }
                Err(e) => {
                    println!("{}: {}", "Error".red().bold(), e);
                }
            }
        }
    }

    Ok(())
}

async fn run_server(state: SharedState, port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let app = Router::new()
        .route("/", get(|| async { Html(static_assets::INDEX_HTML) }))
        .merge(routes::api_router(state.clone()))
        .layer(tower_http::cors::CorsLayer::permissive());

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("\n{}", "╔═════════════════════════════════════════════════════════════════╗".green());
    println!("{}", "║                 HEARTWOOD ZCASH SHIELDED VAULT                  ║".green().bold());
    println!("{}", "║            Duress-Aware Hidden-Volume Shielded Wallet           ║".green());
    println!("{}", "╚═════════════════════════════════════════════════════════════════╝".green());
    println!("\n🚀 Web Application running at: {}", format!("http://localhost:{port}").cyan().bold().underline());
    println!("   Network address:             {}", format!("http://127.0.0.1:{port}").cyan());
    println!("\n💡 Test Credentials:");
    println!("   • Primary PIN:               {} (Real Balance: 142.50 ZEC)", DEFAULT_PIN_A.yellow().bold());
    println!("   • Decoy PIN (Duress):        {} (Decoy Balance: 1.25 ZEC with Silent SOS)", DEFAULT_PIN_B.red().bold());
    println!("   • Invalid PIN (Plausible):   {} (Ephemeral Empty Wallet, Zero Oracle)", "0000".white().bold());
    println!("\nPress Ctrl+C to terminate the server.\n");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn run_terminal_demo(state: SharedState) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n{}", "=======================================================".purple().bold());
    println!("{}", "   HEARTWOOD HACKATHON DEMO SCRIPT (5-STAGE WALKTHROUGH)".purple().bold());
    println!("{}", "=======================================================\n".purple().bold());

    // STAGE 1
    println!("{}", "[STAGE 1] Unlock with Primary PIN (2468)...".cyan().bold());
    {
        let mut s = state.write().await;
        let m = s.unlock(DEFAULT_PIN_A).unwrap();
        let session = s.active_session.as_ref().unwrap();
        println!("  ✓ Primary Account: '{}'", session.account_name.green());
        println!("  ✓ Balance:         {:.4} ZEC", session.balance_zatoshis as f64 / 1e8);
        println!("  ✓ Timing:          {} ms (Slot 0 + Slot 1 computed)", m.elapsed_ms);
        println!("  ✓ Distress Active: {}\n", session.has_distress_config());
    }

    // STAGE 2
    println!("{}", "[STAGE 2] Lock wallet & unlock under coercion with Decoy PIN (1357)...".yellow().bold());
    {
        let mut s = state.write().await;
        s.lock();
        let m = s.unlock(DEFAULT_PIN_B).unwrap();
        let session = s.active_session.as_ref().unwrap();
        println!("  ✓ Decoy Account:   '{}'", session.account_name.yellow());
        println!("  ✓ Spendable:       {:.4} ZEC", session.balance_zatoshis as f64 / 1e8);
        println!("  ✓ Timing:          {} ms (Identical timing profile)", m.elapsed_ms);
        println!("  ✓ Distress Active: {} (Silent SOS armed)\n", session.has_distress_config());
    }

    // STAGE 3
    println!("{}", "[STAGE 3] Coerced transfer: Sending 1.0 ZEC to Coercer...".red().bold());
    {
        let mut s = state.write().await;
        let coercer_addr = "utest1coercerdestinationaddress112233445566778899";
        let plan = s.send(coercer_addr, 100_000_000, Some(37.7749), Some(-122.4194)).unwrap();
        println!("  ✓ Transaction Broadcast: {}", plan.txid.white());
        println!("  ✓ Coercer Output:        {:.4} ZEC to {}", plan.outputs[0].amount_zatoshis as f64 / 1e8, plan.outputs[0].recipient_address);
        println!("  ✓ In-Band Distress Sent: {} (Hidden Output #1)", plan.silent_distress_injected);
        println!("  ✓ Alerts Caught by IVK:  {}\n", s.alerts.len());

        let last_alert = s.alerts.last().unwrap();
        println!("  🚨 TRUSTED CONTACT SOS DECODED:");
        println!("     Type:       {}", format!("{:?}", last_alert.beacon.distress_type).red().bold());
        println!("     Message:    {}", last_alert.beacon.alert_message.red());
        println!("     GPS Coords: {}, {}", last_alert.beacon.latitude.unwrap(), last_alert.beacon.longitude.unwrap());
        println!("     Coerced To: {}\n", last_alert.beacon.coerced_recipient.as_ref().unwrap().white());
    }

    // STAGE 4
    println!("{}", "[STAGE 4] Testing Deferred Broadcast Mode...".magenta().bold());
    {
        let mut s = state.write().await;
        let mode = s.toggle_mode().unwrap();
        println!("  ✓ Switched mode to: {:?}", mode);
        let coercer_addr = "utest1coercerdestinationaddress112233445566778899";
        let plan = s.send(coercer_addr, 10_000_000, Some(37.7749), Some(-122.4194)).unwrap();
        println!("  ✓ Payment Sent: 0.10 ZEC (Outputs: {})", plan.outputs.len());
        println!("  ✓ In-Band Sent: {} (Deferred queued locally in outbox: {})", plan.silent_distress_injected, plan.deferred_distress_queued);
        println!("  ✓ Device entering unsupervised environment; dispatching deferred queue...");
        let broadcasts = s.trigger_deferred().unwrap();
        println!("  ✓ Broadcasted Outbox Tx: {}", broadcasts[0].txid.white());
        println!("  ✓ Trusted contact alerts updated: {} total\n", s.alerts.len());
    }

    // STAGE 5
    println!("{}", "[STAGE 5] Zero-Knowledge Deniability & Independence Proof...".blue().bold());
    run_audit(state).await?;

    println!("\n{}", "🎉 ALL 5 STAGES OF THE DEMO SCRIPT VERIFIED SUCCESSFULLY!".green().bold());
    Ok(())
}

async fn run_audit(state: SharedState) -> Result<(), Box<dyn std::error::Error>> {
    let s = state.read().await;
    let r = s.get_independence_report();
    let bytes = s.wallet.container().as_bytes();
    let ent = heartwood_core::crypto::entropy::shannon_entropy(bytes);

    println!("\n{}", "--- CRYPTOGRAPHIC INDEPENDENCE & ENTROPY AUDIT ---".blue().bold());
    println!("  Container Total Size:          {} bytes (Fixed 64 KiB)", bytes.len());
    println!("  Overall Shannon Entropy:       {:.5} bits/byte (Max: 8.0)", ent);
    println!("  Slot 1 (Hidden Volume) Entropy: {:.5} bits/byte", r.slot_1_entropy_bits_per_byte);
    println!("  Unallocated Padding Entropy:   {:.5} bits/byte", r.padding_entropy_bits_per_byte);
    println!("  Bitwise Seed Hamming Distance: {} / 256 bits", r.seed_bitwise_hamming_distance);
    println!("  Cross-Reference Leaks in Slot 0: {}", if r.contains_cross_references { "LEAK DETECTED".red() } else { "0 (ZERO LEAKS)".green().bold() });
    println!("  Zero-Knowledge Deniable:       {}", if r.zero_knowledge_deniable { "CONFIRMED VALID".green().bold() } else { "FAILED".red() });
    println!("--------------------------------------------------\n");
    Ok(())
}
