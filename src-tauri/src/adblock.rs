// Veil Browser — ad-block engine integration
//
// Phase 1: Simple domain-based blocker using HashSet.
// We use Brave's adblock-rust crate to import filter lists (parsing only),
// but actual blocking is done via direct domain matching for reliability.
//
// Phase 2 will properly integrate the full adblock-rust engine API once
// we confirm the exact method names across versions.

use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::collections::HashSet;
use std::sync::atomic::{AtomicUsize, Ordering};

/// Global set of blocked domains — populated at startup from filter lists.
static BLOCKED_DOMAINS: Lazy<RwLock<HashSet<String>>> =
    Lazy::new(|| RwLock::new(HashSet::new()));

/// Total rules loaded from filter lists.
static RULES_LOADED: AtomicUsize = AtomicUsize::new(0);

/// Initialize the ad-block engine by loading embedded filter lists.
/// We parse each line as a domain to block (lines starting with `||domain^`).
pub fn init() -> anyhow::Result<()> {
    let mut domains = BLOCKED_DOMAINS.write();

    let mut all_lines: Vec<&str> = Vec::new();
    all_lines.extend(EASYLIST.lines());
    all_lines.extend(EASYPARTY.lines());
    all_lines.extend(UBO_PRIVACY.lines());
    all_lines.extend(FANBOY_ANNOYANCES.lines());
    all_lines.extend(BRAVE_SUPPLEMENTAL.lines());

    let mut count: usize = 0;
    for line in all_lines {
        let line = line.trim();
        if line.is_empty() || line.starts_with('!') {
            continue;
        }
        // Cosmetic selectors (##) — skip for Phase 1, handled in Phase 2
        if line.contains("##") || line.contains("#@#") || line.contains("#?#") {
            continue;
        }
        // Network filter: extract domain from `||domain^` syntax
        if let Some(domain) = parse_adblock_domain(line) {
            domains.insert(domain);
            count += 1;
        }
    }

    RULES_LOADED.store(count, Ordering::Relaxed);
    log::info!("Ad-block engine initialized: {} domains blocked", count);

    Ok(())
}

/// Parse an adblock-style rule like `||example.com^` and extract the domain.
/// Returns None for rules that don't match this simple pattern.
fn parse_adblock_domain(rule: &str) -> Option<String> {
    let trimmed = rule.trim();
    if !trimmed.starts_with("||") {
        return None;
    }
    let after_pipes = &trimmed[2..];
    // Strip trailing `^` and anything after `/`
    let end = after_pipes
        .find(|c: char| c == '^' || c == '/' || c == '$' || c == '#')
        .unwrap_or(after_pipes.len());
    let domain = &after_pipes[..end];
    if domain.is_empty() || !domain.contains('.') {
        return None;
    }
    Some(domain.to_lowercase())
}

/// Extract the registrable domain from a URL.
/// e.g. "https://ads.example.com/path?x=1" -> "ads.example.com"
fn extract_domain(url: &str) -> Option<String> {
    let after_scheme = url.split("://").nth(1).unwrap_or(url);
    let authority = after_scheme.split('/').next()?;
    let host = authority.split(':').next()?;
    if host.is_empty() {
        return None;
    }
    Some(host.to_lowercase())
}

/// Check if a request should be blocked based on its URL.
/// Returns `true` if the request's domain matches a blocked domain,
/// OR if the request's domain is a subdomain of a blocked domain.
pub fn should_block(request_url: &str, _source_url: &str, _request_type: &str) -> bool {
    let domains = BLOCKED_DOMAINS.read();

    let Some(req_domain) = extract_domain(request_url) else {
        return false;
    };

    // Exact match
    if domains.contains(&req_domain) {
        log::debug!("Blocked (exact): {} -> {}", request_url, req_domain);
        return true;
    }

    // Subdomain match: check if any blocked domain is a suffix of the request domain
    for blocked in domains.iter() {
        if req_domain.ends_with(blocked) {
            // Ensure it's a proper subdomain boundary (e.g. "ads.example.com" ends with "example.com")
            let suffix_start = req_domain.len() - blocked.len();
            if suffix_start == 0 || req_domain.as_bytes()[suffix_start - 1] == b'.' {
                log::debug!("Blocked (subdomain): {} -> {}", request_url, blocked);
                return true;
            }
        }
    }

    false
}

/// Get cosmetic CSS filters for a URL.
/// Phase 1: returns empty Vec. Phase 2 will implement CSS injection.
pub fn cosmetic_filters_for_url(_url: &str) -> Vec<String> {
    Vec::new()
}

/// Total rule count (domains) currently loaded
pub fn rule_count() -> usize {
    RULES_LOADED.load(Ordering::Relaxed)
}

// Embedded minimal filter lists.
const EASYLIST: &str = include_str!("../filters/easylist-min.txt");
const EASYPARTY: &str = include_str!("../filters/easyprivacy-min.txt");
const UBO_PRIVACY: &str = include_str!("../filters/ubo-privacy-min.txt");
const FANBOY_ANNOYANCES: &str = include_str!("../filters/fanboy-annoyances-min.txt");
const BRAVE_SUPPLEMENTAL: &str = include_str!("../filters/brave-supplemental-min.txt");
