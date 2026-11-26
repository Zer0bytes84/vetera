// Borne basse d'une recherche native : 20 780 vecteurs 768 f32 déjà en mémoire côté Rust
// (lus une fois depuis SQLite), produit scalaire + 5 meilleurs. std seule : rustc -O vecteurs-natifs.rs
use std::time::Instant;
fn main() {
    let path = std::env::args().nth(1).expect("fichier de vecteurs");
    let t = Instant::now();
    let bytes = std::fs::read(&path).expect("lecture");
    let data: Vec<f32> = bytes.chunks_exact(4).map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]])).collect();
    let n = data.len() / 768;
    let load = t.elapsed();
    let q: Vec<f32> = (0..768).map(|i| (i as f32).sin()).collect();
    let norm = q.iter().map(|x| x * x).sum::<f32>().sqrt();
    let q: Vec<f32> = q.iter().map(|x| x / norm).collect();
    let mut best = Vec::new();
    let runs = 20;
    let t = Instant::now();
    for _ in 0..runs {
        let mut scores: Vec<(f32, usize)> = data
            .chunks_exact(768)
            .enumerate()
            .map(|(i, v)| (v.iter().zip(&q).map(|(a, b)| a * b).sum::<f32>(), i))
            .collect();
        scores.select_nth_unstable_by(4, |a, b| b.0.total_cmp(&a.0));
        scores.truncate(5);
        best = scores;
    }
    let per = t.elapsed().as_secs_f64() * 1000.0 / runs as f64;
    println!("{{\"vecteurs\":{n},\"chargementMs\":{:.1},\"rechercheMs\":{per:.2},\"meilleur\":{}}}", load.as_secs_f64() * 1000.0, best[0].1);
}
