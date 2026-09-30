use crate::state::SharedState;
use axum::{
    extract::State,
    response::Json,
    routing::{get, post},
    Router,
};
use heartwood_core::crypto::entropy::{chi_squared, shannon_entropy};
use heartwood_core::distress::injector::ShieldedTransactionPlan;
use heartwood_core::distress::scanner::DistressAlert;
use heartwood_core::keystore::container::{DistressMode, UnlockMetrics, CONTAINER_SIZE, SLOT_1_OFFSET};
use heartwood_core::keystore::independence::IndependenceReport;
use heartwood_core::wallet::account::WalletSession;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn ok(data: T) -> Json<Self> {
        Json(Self {
            success: true,
            data: Some(data),
            error: None,
        })
    }

    pub fn err(msg: impl Into<String>) -> Json<Self> {
        Json(Self {
            success: false,
            data: None,
            error: Some(msg.into()),
        })
    }
}

#[derive(Serialize)]
pub struct AppStateResponse {
    pub is_locked: bool,
    pub session: Option<WalletSession>,
    pub last_metrics: Option<UnlockMetrics>,
    pub alerts_count: usize,
    pub queued_count: usize,
    pub transactions_count: usize,
}

#[derive(Deserialize)]
pub struct UnlockRequest {
    pub pin: String,
}

#[derive(Deserialize)]
pub struct SendRequest {
    pub recipient: String,
    pub amount_zatoshis: u64,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

#[derive(Serialize)]
pub struct ContainerEntropyResponse {
    pub total_bytes: usize,
    pub overall_shannon_entropy: f64,
    pub overall_chi_squared: f64,
    pub slot_0_entropy: f64,
    pub slot_1_entropy: f64,
    pub padding_entropy: f64,
    pub preview_hex_chunks: Vec<String>,
}

pub fn api_router(state: SharedState) -> Router {
    Router::new()
        .route("/api/state", get(get_state))
        .route("/api/unlock", post(post_unlock))
        .route("/api/lock", post(post_lock))
        .route("/api/send", post(post_send))
        .route("/api/toggle-mode", post(post_toggle_mode))
        .route("/api/trigger-deferred", post(post_trigger_deferred))
        .route("/api/alerts", get(get_alerts))
        .route("/api/transactions", get(get_transactions))
        .route("/api/entropy", get(get_entropy))
        .route("/api/timing", get(get_timing))
        .route("/api/independence", get(get_independence))
        .route("/api/reset", post(post_reset))
        .with_state(state)
}

async fn get_state(State(state): State<SharedState>) -> Json<ApiResponse<AppStateResponse>> {
    let s = state.read().await;
    ApiResponse::ok(AppStateResponse {
        is_locked: s.active_session.is_none(),
        session: s.active_session.clone(),
        last_metrics: s.last_metrics.clone(),
        alerts_count: s.alerts.len(),
        queued_count: s.outbox.len(),
        transactions_count: s.all_transactions.len(),
    })
}

async fn post_unlock(
    State(state): State<SharedState>,
    Json(payload): Json<UnlockRequest>,
) -> Json<ApiResponse<UnlockMetrics>> {
    let mut s = state.write().await;
    if payload.pin.trim().is_empty() {
        return ApiResponse::err("PIN must not be empty");
    }
    match s.unlock(&payload.pin) {
        Ok(metrics) => ApiResponse::ok(metrics),
        Err(e) => ApiResponse::err(e),
    }
}

async fn post_lock(State(state): State<SharedState>) -> Json<ApiResponse<&'static str>> {
    let mut s = state.write().await;
    s.lock();
    ApiResponse::ok("Wallet locked")
}

async fn post_send(
    State(state): State<SharedState>,
    Json(payload): Json<SendRequest>,
) -> Json<ApiResponse<ShieldedTransactionPlan>> {
    if payload.recipient.trim().is_empty() {
        return ApiResponse::err("Recipient address must not be empty");
    }
    if payload.amount_zatoshis == 0 {
        return ApiResponse::err("Transfer amount must be greater than zero");
    }

    let mut s = state.write().await;
    match s.send(
        &payload.recipient,
        payload.amount_zatoshis,
        payload.latitude,
        payload.longitude,
    ) {
        Ok(plan) => ApiResponse::ok(plan),
        Err(e) => ApiResponse::err(e),
    }
}

async fn post_toggle_mode(State(state): State<SharedState>) -> Json<ApiResponse<DistressMode>> {
    let mut s = state.write().await;
    match s.toggle_mode() {
        Ok(mode) => ApiResponse::ok(mode),
        Err(e) => ApiResponse::err(e),
    }
}

async fn post_trigger_deferred(
    State(state): State<SharedState>,
) -> Json<ApiResponse<Vec<ShieldedTransactionPlan>>> {
    let mut s = state.write().await;
    match s.trigger_deferred() {
        Ok(txs) => ApiResponse::ok(txs),
        Err(e) => ApiResponse::err(e),
    }
}

async fn get_alerts(State(state): State<SharedState>) -> Json<ApiResponse<Vec<DistressAlert>>> {
    let s = state.read().await;
    ApiResponse::ok(s.alerts.clone())
}

async fn get_transactions(
    State(state): State<SharedState>,
) -> Json<ApiResponse<Vec<ShieldedTransactionPlan>>> {
    let s = state.read().await;
    ApiResponse::ok(s.all_transactions.clone())
}

async fn get_entropy(
    State(state): State<SharedState>,
) -> Json<ApiResponse<ContainerEntropyResponse>> {
    let s = state.read().await;
    let bytes = s.wallet.container().as_bytes();

    let total = bytes.len();
    let overall_ent = shannon_entropy(bytes);
    let overall_chi = chi_squared(bytes);

    let slot_0 = &bytes[0..4096];
    let slot_1 = &bytes[SLOT_1_OFFSET..SLOT_1_OFFSET + 4096];
    let padding = &bytes[48 * 1024..CONTAINER_SIZE];

    let mut preview_hex_chunks = Vec::new();
    for i in (0..512).step_by(32) {
        preview_hex_chunks.push(hex::encode(&bytes[i..i + 32]));
    }

    ApiResponse::ok(ContainerEntropyResponse {
        total_bytes: total,
        overall_shannon_entropy: overall_ent,
        overall_chi_squared: overall_chi,
        slot_0_entropy: shannon_entropy(slot_0),
        slot_1_entropy: shannon_entropy(slot_1),
        padding_entropy: shannon_entropy(padding),
        preview_hex_chunks,
    })
}

async fn get_timing(
    State(state): State<SharedState>,
) -> Json<ApiResponse<Vec<crate::state::TimingSample>>> {
    let s = state.read().await;
    ApiResponse::ok(s.timing_samples.clone())
}

async fn get_independence(
    State(state): State<SharedState>,
) -> Json<ApiResponse<IndependenceReport>> {
    let s = state.read().await;
    ApiResponse::ok(s.get_independence_report())
}

async fn post_reset(State(state): State<SharedState>) -> Json<ApiResponse<&'static str>> {
    let mut s = state.write().await;
    *s = crate::state::AppState::new_default();
    ApiResponse::ok("Reset to default demo state")
}
