// Applique le motif de tauri.conf.json (plugins.shell.open) comme tauri-plugin-shell 2.3.6 : Regex::new(format!("^{v}$")).
// Lit les liens a verifier sur l'entree standard, un JSON {"accepte": [...], "refuse": [...]}.
use regex::Regex;
use std::io::Read;
fn main() {
    let conf: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
    let v = conf["plugins"]["shell"]["open"].as_str().unwrap();
    let re = Regex::new(&format!("^{v}$")).unwrap();
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input).unwrap();
    let cases: serde_json::Value = serde_json::from_str(&input).unwrap();
    // Garde d'origine du plugin (src/lib.rs, open_scope) : hors WhatsApp, le verdict doit etre le meme.
    let default = Regex::new(r"^((mailto:\w+)|(tel:\w+)|(https?://\w+)).+").unwrap();
    let mut bad = 0;
    for (kind, want) in [("accepte", true), ("refuse", false)] {
        for link in cases[kind].as_array().unwrap() {
            let link = link.as_str().unwrap();
            let want = if link.starts_with("whatsapp://") { want } else { default.is_match(link) };
            let got = re.is_match(link);
            if got != want { bad += 1; println!("ECART {kind}: {link:?}"); } else { println!("ok {}: {link:?}", if got { "accepte" } else { "refuse" }); }
        }
    }
    println!("{} cas, {} ecart(s)", cases["accepte"].as_array().unwrap().len() + cases["refuse"].as_array().unwrap().len(), bad);
}
