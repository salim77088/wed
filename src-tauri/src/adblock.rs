// Veil Browser — ad-block engine integration
// Uses Brave's `adblock-rust` crate to filter network requests and cosmetic elements.

use adblock::{request::Request, Engine, FilterSet};
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::sync::atomic::{AtomicUsize, Ordering};

/// Global ad-block engine, initialized lazily on first use.
/// Built from a FilterSet that contains all our embedded filter lists.
static ENGINE: Lazy<RwLock<Engine>> = Lazy::new(|| {
    // Collect all rules from embedded filter lists
    let mut all_rules: Vec<String> = Vec::new();
    all_rules.extend(load_filter_list(EASYLIST));
    all_rules.extend(load_filter_list(EASYPARTY));
    all_rules.extend(load_filter_list(UBO_PRIVACY));
    all_rules.extend(load_filter_list(FANBOY_ANNOYANCES));
    all_rules.extend(load_filter_list(BRAVE_SUPPLEMENTAL));

    // Build the FilterSet (this is the correct adblock-rust 0.9.x API)
    let mut filter_set = FilterSet::new(true);
    let rules_refs: Vec<&str> = all_rules.iter().map(|s| s.as_str()).collect();
    let count = filter_set
        .add_filters(&rules_refs, Default::default())
        .unwrap_or(0);

    RULES_LOADED.store(count, Ordering::Relaxed);
    log::info!(
        "Ad-block engine initialized: {}/{} rules loaded",
        count,
        all_rules.len()
    );

    // Construct the engine from the filter set
    let engine = Engine::new_with_filter_set(filter_set, true);
    RwLock::new(engine)
});

/// Total rules loaded (network + cosmetic), tracked manually.
static RULES_LOADED: AtomicUsize = AtomicUsize::new(0);

/// Force initialization of the ad-block engine.
/// Called from `lib.rs::run()` at startup.
pub fn init() -> anyhow::Result<()> {
    // Touching ENGINE triggers the Lazy closure
    let _engine = ENGINE.read();
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

    // Request::new returns Result<Request, RequestError> in adblock-rust 0.9
    let request = match Request::new(request_url, source_url, request_type) {
        Ok(r) => r,
        Err(e) => {
            log::trace!(
                "Could not parse request: {} (from {}): {}",
                request_url,
                source_url,
                e
            );
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
