// Veil Browser — Tauri command handlers
// Exposes Rust functions to the Svelte frontend via `invoke()`.

use crate::adblock;
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Serialize)]
pub struct BlockResult {
    pub blocked: bool,
}

#[derive(Debug, Deserialize)]
pub struct CheckRequest {
    pub url: String,
    pub source: String,
    pub request_type: String,
}

#[derive(Debug, Serialize)]
pub struct StatsResult {
    pub rules_loaded: usize,
    pub requests_checked: u64,
    pub requests_blocked: u64,
}

static CHECKED: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
static BLOCKED: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// Check whether a network request should be blocked by the ad-blocker.
#[tauri::command]
pub fn check_request(req: CheckRequest) -> BlockResult {
    CHECKED.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let blocked = adblock::should_block(&req.url, &req.source, &req.request_type);
    if blocked {
        BLOCKED.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }
    BlockResult { blocked }
}

/// Get cosmetic CSS selectors to hide ad elements on a page.
#[tauri::command]
pub fn get_cosmetic_filters(url: String) -> Vec<String> {
    adblock::cosmetic_filters_for_url(&url)
}

/// Get ad-blocker statistics for display in the UI.
#[tauri::command]
pub fn get_stats() -> StatsResult {
    StatsResult {
        rules_loaded: adblock::rule_count(),
        requests_checked: CHECKED.load(std::sync::atomic::Ordering::Relaxed),
        requests_blocked: BLOCKED.load(std::sync::atomic::Ordering::Relaxed),
    }
}

/// Convert a user-typed query into a URL for navigation.
/// - If it looks like a URL (has a scheme or a TLD), normalize it.
/// - Otherwise, treat it as a SearXNG search query.
#[tauri::command]
pub fn parse_query(input: String) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    // Already a URL with scheme
    if trimmed.starts_with("http://")
        || trimmed.starts_with("https://")
        || trimmed.starts_with("about:")
        || trimmed.starts_with("file://")
        || trimmed.starts_with("veil://")
    {
        return trimmed.to_string();
    }
    // localhost
    if trimmed.starts_with("localhost")
        || trimmed.starts_with("127.0.0.1")
        || trimmed.starts_with("0.0.0.0")
    {
        return format!("http://{}", trimmed);
    }
    // Looks like a domain: contains a dot and no spaces
    if trimmed.contains('.') && !trimmed.contains(' ') {
        if let Some(idx) = trimmed.rfind('.') {
            let tld = &trimmed[idx + 1..];
            let tld_clean: String = tld.chars().take_while(|c| c.is_alphanumeric()).collect();
            if tld_clean.len() >= 2 {
                return format!("https://{}", trimmed);
            }
        }
    }
    // Otherwise: SearXNG search
    let encoded = urlencoding::encode(trimmed);
    format!("https://search.bus-hit.me/search?q={}", encoded)
}

/// Performance marker — used to measure startup time.
#[tauri::command]
pub fn ping() -> String {
    let now = Instant::now();
    format!("veil::ok::{:?}", now.elapsed())
}
