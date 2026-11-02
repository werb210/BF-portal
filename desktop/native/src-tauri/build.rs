// BF_PORTAL_v876_NATIVE_DESKTOP - the portal page may call only these app commands (see capabilities/).
fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "incoming_call",
            "set_badge",
            "notify",
            "open_external",
            "find_company",
            "choose_company",
        ]),
    ))
    .expect("failed to run tauri-build");
}
