use tauri::{
  menu::{MenuBuilder, MenuItemBuilder},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Emitter, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      let toggle_item = MenuItemBuilder::with_id("toggle", "Mostra / Nascondi Soundflow").build(app)?;
      let play_item = MenuItemBuilder::with_id("play_pause", "Play / Pausa").build(app)?;
      let next_item = MenuItemBuilder::with_id("next", "Brano Successivo").build(app)?;
      let prev_item = MenuItemBuilder::with_id("prev", "Brano Precedente").build(app)?;
      let quit_item = MenuItemBuilder::with_id("quit", "Esci").build(app)?;

      let menu = MenuBuilder::new(app)
        .item(&toggle_item)
        .separator()
        .item(&play_item)
        .item(&next_item)
        .item(&prev_item)
        .separator()
        .item(&quit_item)
        .build()?;

      let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("Soundflow")
        .show_menu_on_left_click(false)
        .on_menu_event(|app_handle, event| match event.id.as_ref() {
          "toggle" => {
            if let Some(window) = app_handle.get_webview_window("main") {
              if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
              } else {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          }
          "play_pause" => {
            let _ = app_handle.emit("tray-play-pause", ());
          }
          "next" => {
            let _ = app_handle.emit("tray-next", ());
          }
          "prev" => {
            let _ = app_handle.emit("tray-prev", ());
          }
          "quit" => {
            app_handle.exit(0);
          }
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
              } else {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          }
        })
        .build(app)?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let _ = window.hide();
        api.prevent_close();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
