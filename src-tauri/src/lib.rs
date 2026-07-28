// Veil Browser — Rust library entry point
// Initializes ad-block engine and registers Tauri commands.

pub mod adblock;
pub mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_secs()
        .init();

    log::info!("Veil Browser starting up...");

    // Initialize ad-block engine (loads embedded filter lists)
    if let Err(e) = adblock::init() {
        log::error!("Failed to initialize ad-block engine: {}", e);
    } else {
        log::info!("Ad-block engine ready");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            commands::check_request,
            commands::get_cosmetic_filters,
            commands::get_stats,
            commands::parse_query,
            commands::ping,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            log::info!("Veil Browser ready");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Veil Browser");
}
