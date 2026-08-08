fn main() {
  if std::env::var("RC").is_err() {
    let rc_path = r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\rc.exe";
    if std::path::Path::new(rc_path).exists() {
      std::env::set_var("RC", rc_path);
    }
  }
  tauri_build::build();
}
