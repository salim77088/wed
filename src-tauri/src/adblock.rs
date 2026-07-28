// Veil Browser — ad-block engine integration
// Uses Brave's `adblock-rust` crate to filter network requests and cosmetic elements.

use adblock::{
    lists::{FilterListFormat, RuleList},
    request::Request,
    Engine,
};
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::sync::atomic::{AtomicUsize, Ordering};

/// Global ad-block engine, initialized once at startup.
static ENGINE: Lazy<RwLock<Engine>> = Lazy::new(|| RwLock::new(Engine::new(true)));

/// Total rules loaded (network + cosmetic), tracked manually.
static RULES_LOADED: AtomicUsize = AtomicUsize::new(0);

/// Initialize the ad-block engine with built-in filter lists.
/// Lists are embedded at compile time and updated at runtime from upstream sources.
pub fn init() -> anyhow::Result<()> {
    let mut engine = ENGINE.write();

    let mut all_rules: Vec<String> = Vec::new();
    all_rules.extend(load_filter_list(EASYLIST));
    all_rules.extend(load_filter_list(EASYPARTY));
    all_rules.extend(load_filter_list(UBO_PRIVACY));
    all_rules.extend(load_filter_list(FANBOY_ANNOYANCES));
    all_rules.extend(load_filter_list(BRAVE_SUPPLEMENTAL));

    // Use the RuleList API to add rules in bulk.
    // This is the correct adblock-rust 0.9.x API (not add_filter).
    let list = RuleList::Format::Standard(FilterListFormat::Standard, all_rules.clone());
    match engine.add_lists(&[list]) {
        Ok(count) => {
            RULES_LOADED.store(count, Ordering::Relaxed);
            log::info!("Ad-block engine initialized: {} rules loaded", count);
        }
        Err(e) => {
            log::error!("Failed to load filter lists: {}", e);
            // Fallback: count is 0, but engine still works (will block nothing)
            RULES_LOADED.store(0, Ordering::Relaxed);
        }
    }

    Ok(())
}

fn load_filter_list(content: &str) -> Vec<String> {
    content
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty() && !l.starts_with('!'))
        .collect()
}

/// Check if a request should be blocked based on its URL and context.
/// Returns `true` if the request matches a network filter rule.
pub fn should_block(request_url: &str, source_url: &str, request_type: &str) -> bool {
    let engine = ENGINE.read();

    // Build a Request object — the adblock-rust 0.9 API requires this
    let request = match Request::new(request_url, source_url, request_type) {
        Some(r) => r,
        None => {
            log::trace!("Could not parse request: {} (from {})", request_url, source_url);
            return false;
        }
    };

    let blocker_result = engine.check_network_request(&request);

    if blocker_result.matched {
        log::debug!("Blocked: {} (from {})", request_url, source_url);
        true
    } else {
        false
    }
}

/// Get cosmetic CSS filters that should be applied to a given URL.
/// These hide ad placeholders, cookie banners, etc.
/// Returns an empty Vec for now — Phase 2 will wire this up to the
/// actual cosmetic filter resources API once we move to native webviews.
pub fn cosmetic_filters_for_url(_url: &str) -> Vec<String> {
    // TODO: Phase 2 — use engine.url_cosmetic_resources(url) and extract selectors.
    Vec::new()
}

/// Total rule count (network + cosmetic) currently loaded
pub fn rule_count() -> usize {
    RULES_LOADED.load(Ordering::Relaxed)
}

// Embedded minimal filter lists.
// In production, the build workflow downloads the full lists from upstream
// and replaces these files before compilation.
const EASYLIST: &str = include_str!("../filters/easylist-min.txt");
const EASYPARTY: &str = include_str!("../filters/easyprivacy-min.txt");
const UBO_PRIVACY: &str = include_str!("../filters/ubo-privacy-min.txt");
const FANBOY_ANNOYANCES: &str = include_str!("../filters/fanboy-annoyances-min.txt");
const BRAVE_SUPPLEMENTAL: &str = include_str!("../filters/brave-supplemental-min.txt");
